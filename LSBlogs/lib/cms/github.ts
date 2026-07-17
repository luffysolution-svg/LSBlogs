import {
  fromRepositoryPath,
  getGithubConfig,
  isManagedPath,
  toRepositoryPath,
  type CmsGithubConfig,
} from "./env";
import type { PendingChange } from "./types";

type GithubTreeItem = {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
};

type GithubRef = { object: { sha: string } };
type GithubCommit = { sha: string; tree: { sha: string } };

function encodePath(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest<T>(
  endpoint: string,
  init: RequestInit = {},
  config: CmsGithubConfig = getGithubConfig(),
): Promise<T> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "User-Agent": "LSBlogs-Online-CMS",
      "X-GitHub-Api-Version": "2026-03-10",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`GitHub API ${response.status}: ${detail}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function repoEndpoint(config: CmsGithubConfig): string {
  return `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
}

export async function getRepositoryInfo() {
  const config = getGithubConfig();
  const data = await githubRequest<{
    html_url: string;
    full_name: string;
    default_branch: string;
  }>(repoEndpoint(config), {}, config);
  return {
    remoteUrl: data.html_url,
    fullName: data.full_name,
    defaultBranch: data.default_branch,
    sourceBranch: config.branch,
    root: config.root,
  };
}

export async function readRepositoryText(
  relativePath: string,
  ref?: string,
): Promise<string | null> {
  const config = getGithubConfig();
  const repositoryPath = toRepositoryPath(relativePath, config.root);
  const query = new URLSearchParams({ ref: ref || config.branch });
  const response = await fetch(
    `https://api.github.com${repoEndpoint(config)}/contents/${encodePath(repositoryPath)}?${query}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "User-Agent": "LSBlogs-Online-CMS",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      cache: "no-store",
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub 内容读取失败：HTTP ${response.status}`);
  }
  const data = (await response.json()) as { type: string; content?: string; encoding?: string };
  if (data.type !== "file" || !data.content) return null;
  if (data.encoding !== "base64") throw new Error("GitHub 返回了不支持的文件编码");
  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
}

async function getHead(config: CmsGithubConfig) {
  const ref = await githubRequest<GithubRef>(
    `${repoEndpoint(config)}/git/ref/heads/${encodePath(config.branch)}`,
    {},
    config,
  );
  const commit = await githubRequest<GithubCommit>(
    `${repoEndpoint(config)}/git/commits/${ref.object.sha}`,
    {},
    config,
  );
  return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
}

export async function listRepositoryFiles(): Promise<string[]> {
  const config = getGithubConfig();
  const head = await getHead(config);
  const data = await githubRequest<{ tree: GithubTreeItem[]; truncated: boolean }>(
    `${repoEndpoint(config)}/git/trees/${head.treeSha}?recursive=1`,
    {},
    config,
  );
  if (data.truncated) throw new Error("仓库文件树过大，GitHub 返回了截断结果");
  return data.tree
    .filter((item) => item.type === "blob")
    .map((item) => fromRepositoryPath(item.path, config.root))
    .filter((item): item is string => Boolean(item))
    .filter(isManagedPath);
}

export async function createReleasePullRequest(
  changes: PendingChange[],
  message: string,
) {
  const config = getGithubConfig();
  if (!changes.length) throw new Error("没有待发布文件");
  for (const change of changes) {
    if (!isManagedPath(change.path)) throw new Error(`拒绝发布未受管理的路径：${change.path}`);
  }

  const head = await getHead(config);
  const tree = changes.map((change) => ({
    path: toRepositoryPath(change.path, config.root),
    mode: "100644",
    type: "blob",
    ...(change.content === null ? { sha: null } : { content: change.content }),
  }));
  const createdTree = await githubRequest<{ sha: string }>(
    `${repoEndpoint(config)}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({ base_tree: head.treeSha, tree }),
    },
    config,
  );
  const commit = await githubRequest<{ sha: string }>(
    `${repoEndpoint(config)}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: createdTree.sha,
        parents: [head.commitSha],
      }),
    },
    config,
  );

  const branch = `cms/publish-${Date.now()}`;
  await githubRequest(
    `${repoEndpoint(config)}/git/refs`,
    {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
    },
    config,
  );

  try {
    const pull = await githubRequest<{ number: number; html_url: string }>(
      `${repoEndpoint(config)}/pulls`,
      {
        method: "POST",
        body: JSON.stringify({
          title: message,
          head: branch,
          base: config.branch,
          body: [
            "由 LSBlogs 在线管理端创建。",
            "",
            `受管理文件：${changes.length} 个。构建检查通过后将自动合并。`,
          ].join("\n"),
        }),
      },
      config,
    );
    return {
      branch,
      commitSha: commit.sha,
      pullNumber: pull.number,
      pullUrl: pull.html_url,
    };
  } catch (error) {
    await githubRequest(
      `${repoEndpoint(config)}/git/refs/heads/${encodePath(branch)}`,
      { method: "DELETE" },
      config,
    ).catch(() => undefined);
    throw error;
  }
}

export async function getPullRequestStatus(pullNumber: number) {
  const config = getGithubConfig();
  return githubRequest<{
    number: number;
    state: "open" | "closed";
    merged: boolean;
    mergeable: boolean | null;
    html_url: string;
    head: { ref: string; sha: string };
  }>(`${repoEndpoint(config)}/pulls/${pullNumber}`, {}, config);
}

export async function uploadGithubImage(
  values: { token: string; owner: string; repo: string; branch: string; domain: string },
  key: string,
  content: Buffer,
): Promise<string> {
  const config: CmsGithubConfig = {
    token: values.token,
    owner: values.owner,
    repo: values.repo,
    branch: values.branch || "main",
    root: "",
  };
  await githubRequest(
    `${repoEndpoint(config)}/contents/${encodePath(key)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: `Upload image ${key}`,
        content: content.toString("base64"),
        branch: config.branch,
      }),
    },
    config,
  );
  const encoded = encodePath(key);
  if (values.domain) return `${values.domain.replace(/\/$/, "")}/${encoded}`;
  return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${encoded}`;
}
