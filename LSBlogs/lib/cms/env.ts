export class CmsConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsConfigurationError";
  }
}

export type CmsGithubConfig = {
  owner: string;
  repo: string;
  branch: string;
  root: string;
  token: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new CmsConfigurationError(`缺少服务器环境变量 ${name}`);
  return value;
}

export function getSessionSecret(): string {
  const value = required("CMS_SESSION_SECRET");
  if (value.length < 32) {
    throw new CmsConfigurationError("CMS_SESSION_SECRET 至少需要 32 个字符");
  }
  return value;
}

export function getAdminPassword(): string {
  return required("CMS_ADMIN_PASSWORD");
}

export function getGithubConfig(): CmsGithubConfig {
  const target = required("CMS_GITHUB_REPO");
  const [owner, repo, ...rest] = target.split("/");
  if (!owner || !repo || rest.length) {
    throw new CmsConfigurationError("CMS_GITHUB_REPO 必须使用 owner/repo 格式");
  }

  return {
    owner,
    repo,
    branch: process.env.CMS_GITHUB_BRANCH?.trim() || "main",
    root: (process.env.CMS_GITHUB_ROOT || "").trim().replace(/^\/+|\/+$/g, ""),
    token: required("CMS_GITHUB_TOKEN"),
  };
}

export function toRepositoryPath(relativePath: string, root?: string): string {
  const clean = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || clean.includes("..")) {
    throw new Error("非法的仓库相对路径");
  }
  const prefix = root ?? getGithubConfig().root;
  return prefix ? `${prefix}/${clean}` : clean;
}

export function fromRepositoryPath(repositoryPath: string, root?: string): string | null {
  const prefix = root ?? getGithubConfig().root;
  if (!prefix) return repositoryPath;
  const expected = `${prefix}/`;
  return repositoryPath.startsWith(expected) ? repositoryPath.slice(expected.length) : null;
}

export const MANAGED_PATHS = [
  "posts",
  "chatters",
  "moments",
  "app/about/about.md",
  "data/albums.ts",
  "data/friends.ts",
  "data/projects.ts",
  "siteConfig.ts",
] as const;

export function isManagedPath(path: string): boolean {
  const clean = path.replace(/\\/g, "/").replace(/^\/+/, "");
  return MANAGED_PATHS.some((managed) =>
    managed.includes(".") ? clean === managed : clean.startsWith(`${managed}/`),
  );
}
