#!/usr/bin/env node

import { randomBytes, randomInt } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const DEFAULT_ENV_FILE = resolve(projectRoot, ".env.local");

function usage() {
  console.log(`用法:
  npm run cms:password
  npm run cms:password -- --vercel
  npm run cms:password -- --vercel --deploy
  npm run cms:password -- --vercel --initialize --deploy
  npm run cms:password -- --show

选项:
  --vercel          同步管理员密码到已关联的 Vercel 项目
  --deploy          同步后立即执行一次生产部署（必须和 --vercel 一起使用）
  --initialize      首次配置新 Vercel 项目时同时写入会话密钥
  --show            只显示 .env.local 中现有的管理员密码
  --yes             跳过覆盖确认，适合自动化脚本
  --env-file <路径> 使用自定义环境变量文件
  --help            显示帮助

说明:
  - 支持 Windows、macOS 和 Linux，需要 Node.js 20 或更高版本。
  - 日常换密码不会轮换 CMS_SESSION_SECRET，避免云端数据无法解密。
  - 密码仅写入被 Git 忽略的环境变量文件，并通过标准输入发送给 Vercel CLI。
`);
}

function parseArguments(argv) {
  const options = {
    deploy: false,
    envFile: DEFAULT_ENV_FILE,
    help: false,
    initialize: false,
    show: false,
    vercel: false,
    yes: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--deploy") options.deploy = true;
    else if (argument === "--initialize") options.initialize = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--show") options.show = true;
    else if (argument === "--vercel") options.vercel = true;
    else if (argument === "--yes" || argument === "-y") options.yes = true;
    else if (argument === "--env-file") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--env-file 后必须提供文件路径");
      }
      options.envFile = isAbsolute(value) ? value : resolve(process.cwd(), value);
      index += 1;
    } else {
      throw new Error(`未知选项: ${argument}`);
    }
  }

  if (options.deploy && !options.vercel) {
    throw new Error("--deploy 必须和 --vercel 一起使用");
  }
  if (options.initialize && !options.vercel) {
    throw new Error("--initialize 必须和 --vercel 一起使用");
  }
  if (options.show && (options.deploy || options.initialize || options.vercel)) {
    throw new Error("--show 不能和 --vercel、--initialize 或 --deploy 一起使用");
  }
  return options;
}

function decodeEnvValue(rawValue) {
  const value = rawValue.trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

function readEnvValue(source, key) {
  const match = source.match(new RegExp(`^${key}=([^\\r\\n]*)`, "m"));
  return match ? decodeEnvValue(match[1]) : "";
}

function setEnvValue(source, key, value) {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=[^\\r\\n]*`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);

  const trimmed = source.replace(/[\r\n]*$/, "");
  return trimmed ? `${trimmed}${newline}${line}${newline}` : `${line}${newline}`;
}

function randomCharacter(alphabet) {
  return alphabet[randomInt(0, alphabet.length)];
}

function generatePassword(length = 24) {
  const groups = [
    "abcdefghijkmnopqrstuvwxyz",
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "23456789",
    "!@%*-_=+?",
  ];
  const all = groups.join("");
  const characters = groups.map(randomCharacter);
  while (characters.length < length) characters.push(randomCharacter(all));

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}

async function confirmOverwrite(options, hasExistingPassword) {
  if (options.yes || (!hasExistingPassword && !options.vercel)) return;
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("检测到现有配置或 Vercel 同步；非交互环境请明确添加 --yes");
  }

  const action = options.vercel
    ? "生成新密码并覆盖本地及 Vercel 中的 CMS 登录密码"
    : "生成新密码并覆盖本地 CMS 登录密码";
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await readline.question(`${action}？输入 y 确认: `);
    if (!/^(y|yes)$/i.test(answer.trim())) {
      console.log("已取消，未修改任何配置。");
      process.exit(0);
    }
  } finally {
    readline.close();
  }
}

function runVercel(args, secretInput) {
  const npxCandidates = [
    process.env.npm_execpath
      ? resolve(dirname(process.env.npm_execpath), "npx-cli.js")
      : "",
    resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"),
  ].filter(Boolean);
  const npxCli = npxCandidates.find((candidate) => existsSync(candidate));
  const executable = npxCli ? process.execPath : "npx";
  const commandArguments = npxCli
    ? [npxCli, "--yes", "vercel@latest", ...args]
    : ["--yes", "vercel@latest", ...args];
  const result = spawnSync(
    executable,
    commandArguments,
    {
      cwd: projectRoot,
      encoding: "utf8",
      input: secretInput,
      stdio: ["pipe", "inherit", "inherit"],
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Vercel CLI 执行失败，退出码: ${result.status ?? "unknown"}`);
  }
}

function syncVercelSecret(name, value) {
  console.log(`正在同步 ${name} 到 Production 和 Preview...`);
  runVercel(
    ["env", "add", name, "production,preview", "--force", "--sensitive", "--yes"],
    `${value}\n`,
  );
  console.log(`正在同步 ${name} 到 Development...`);
  runVercel(
    ["env", "add", name, "development", "--force", "--yes"],
    `${value}\n`,
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const source = existsSync(options.envFile)
    ? readFileSync(options.envFile, "utf8")
    : "";
  const existingPassword = readEnvValue(source, "CMS_ADMIN_PASSWORD");
  const existingSessionSecret = readEnvValue(source, "CMS_SESSION_SECRET");

  if (options.show) {
    if (!existingPassword) {
      throw new Error(`未在 ${options.envFile} 中找到 CMS_ADMIN_PASSWORD`);
    }
    console.log(existingPassword);
    return;
  }

  if (existingSessionSecret && existingSessionSecret.length < 32) {
    throw new Error("现有 CMS_SESSION_SECRET 少于 32 个字符，请先备份云端 CMS 数据后再人工处理");
  }
  if (options.vercel && !existsSync(resolve(projectRoot, ".vercel", "project.json"))) {
    throw new Error("项目尚未关联 Vercel，请先运行 npx vercel link");
  }
  if (options.vercel) {
    console.log("正在检查 Vercel CLI...");
    runVercel(["--version"]);
  }

  await confirmOverwrite(options, Boolean(existingPassword));

  const password = generatePassword();
  const sessionSecret = existingSessionSecret || randomBytes(48).toString("base64url");
  let nextSource = setEnvValue(source, "CMS_ADMIN_PASSWORD", password);
  nextSource = setEnvValue(nextSource, "CMS_SESSION_SECRET", sessionSecret);

  mkdirSync(dirname(options.envFile), { recursive: true });
  writeFileSync(options.envFile, nextSource, { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") {
    try {
      chmodSync(options.envFile, 0o600);
    } catch {
      // Some mounted filesystems do not support POSIX permissions.
    }
  }

  if (options.vercel) {
    syncVercelSecret("CMS_ADMIN_PASSWORD", password);
    if (options.initialize) {
      syncVercelSecret("CMS_SESSION_SECRET", sessionSecret);
    }
  }

  if (options.deploy) {
    console.log("正在部署到 Vercel Production...");
    runVercel(["deploy", "--prod", "--yes"]);
  }

  console.log("\nCMS 管理密码配置完成。");
  console.log(`管理员密码: ${password}`);
  console.log(`本地保存位置: ${options.envFile}`);
  console.log(
    existingSessionSecret
      ? "CMS_SESSION_SECRET 已保留，现有云端数据可继续解密。"
      : options.initialize
        ? "已首次生成并同步 CMS_SESSION_SECRET，请妥善备份环境变量。"
        : "已在本地生成 CMS_SESSION_SECRET；只有新项目才应使用 --initialize 同步它。",
  );
  if (options.vercel && !options.deploy) {
    console.log("Vercel 环境变量已更新；请重新部署后使新密码生效。");
  }
  if (options.vercel && !options.initialize) {
    console.log("出于数据安全考虑，Vercel 中现有的 CMS_SESSION_SECRET 未被改写。");
  }
  console.log("请把管理员密码保存到可信的跨端密码管理器，不要发送到群聊或提交进 Git。");
}

main().catch((error) => {
  console.error(`配置失败: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
