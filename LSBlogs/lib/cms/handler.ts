import matter from "gray-matter";
import {
  clearSessionCookie,
  createSessionToken,
  isRequestAuthenticated,
  sessionCookie,
  verifyAdminPassword,
} from "./auth";
import {
  documentPath,
  markdownItem,
  markdownToDraft,
  momentToMarkdown,
  normalizeDocumentId,
  operationsToChanges,
  parseSiteConfig,
  parseTypescriptArray,
  serializeAlbums,
  serializeFriends,
  serializeProjects,
  serializeSiteConfig,
} from "./content";
import { getGithubConfig, isManagedPath } from "./env";
import {
  createReleasePullRequest,
  getPullRequestStatus,
  getRepositoryInfo,
  listRepositoryFiles,
  readRepositoryText,
} from "./github";
import {
  mergePicbedConfig,
  publicPicbedConfig,
  testPicbed,
  uploadImage,
} from "./picbed";
import { loadRemoteImage } from "./remote-image";
import { loadCmsState, updateCmsState } from "./state";
import type {
  CmsDraft,
  CmsOperation,
  CmsState,
  ContentType,
  PendingChange,
} from "./types";

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}

async function bodyJson(request: Request): Promise<Record<string, unknown>> {
  const value = await request.json();
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function pendingValue(state: CmsState, path: string): string | null | undefined {
  return state.pendingChanges[path]?.content;
}

async function readText(state: CmsState, path: string): Promise<string | null> {
  const pending = pendingValue(state, path);
  if (pending !== undefined) return pending;
  return readRepositoryText(path);
}

async function managedFiles(state: CmsState): Promise<string[]> {
  const files = new Set(await listRepositoryFiles());
  for (const change of Object.values(state.pendingChanges)) {
    if (change.content === null) files.delete(change.path);
    else files.add(change.path);
  }
  return [...files].filter(isManagedPath).sort();
}

function setPending(state: CmsState, change: PendingChange) {
  if (!isManagedPath(change.path)) throw new Error(`未受管理的内容路径：${change.path}`);
  state.pendingChanges[change.path] = change;
}

async function getContentList(state: CmsState) {
  const files = (await managedFiles(state)).filter((path) =>
    /^(posts|chatters|moments)\/[^/]+\.md$/i.test(path),
  );
  const items = (
    await Promise.all(
      files.map(async (path) => {
        const raw = await readText(state, path);
        if (!raw) return null;
        const folder = path.split("/")[0];
        const type = folder === "posts" ? "post" : folder === "chatters" ? "chatter" : "moment";
        return markdownItem(path, type, raw);
      }),
    )
  ).filter((item): item is Record<string, unknown> => Boolean(item));
  items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return {
    items,
    counts: {
      post: items.filter((item) => item.type === "post").length,
      chatter: items.filter((item) => item.type === "chatter").length,
      moment: items.filter((item) => item.type === "moment").length,
    },
  };
}

async function currentConfig(state: CmsState): Promise<Record<string, unknown>> {
  const raw = await readText(state, "siteConfig.ts");
  if (!raw) throw new Error("仓库中缺少 siteConfig.ts");
  return parseSiteConfig(raw);
}

async function queryMusic(id: string) {
  const requestOptions = {
      headers: {
        "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/121 Safari/537.36",
        Referer: "https://music.163.com/",
      },
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    } as const;
  const [response, playerResponse] = await Promise.all([
    fetch(
      `https://music.163.com/api/song/detail/?id=${encodeURIComponent(id)}&ids=[${encodeURIComponent(id)}]`,
      requestOptions,
    ),
    fetch(
      `https://music.163.com/api/song/enhance/player/url?id=${encodeURIComponent(id)}&ids=[${encodeURIComponent(id)}]&br=320000`,
      requestOptions,
    ).catch(() => null),
  ]);
  const data = await response.json();
  const song = data.songs?.[0];
  if (!song) return { success: false, message: "未找到该歌曲，可能是 VIP 歌曲或 ID 错误" };
  const playerData = playerResponse?.ok ? await playerResponse.json().catch(() => null) : null;
  const playable = Boolean(playerData?.data?.[0]?.url);
  return {
    success: true,
    data: {
      id,
      name: song.name,
      artist: song.artists?.[0]?.name || "未知歌手",
      album: song.album?.name || "",
      cover: song.album?.picUrl || "",
      playable,
    },
  };
}

async function handleAuthenticated(
  request: Request,
  route: string,
  method: string,
): Promise<Response> {
  if (route === "state/operations") {
    if (method === "GET") {
      const state = await loadCmsState();
      return json({ success: true, operations: state.operations });
    }
    const payload = await bodyJson(request);
    const operations = Array.isArray(payload.operations) ? (payload.operations as CmsOperation[]) : [];
    await updateCmsState((state) => {
      state.operations = operations;
    });
    return json({ success: true });
  }

  if (route === "drafts/save" && method === "POST") {
    const payload = (await bodyJson(request)) as CmsDraft;
    const type = (payload.type || "post") as ContentType;
    const id = type === "about" ? "about" : normalizeDocumentId(payload.id, type);
    await updateCmsState((state) => {
      state.drafts[id] = { ...payload, id, type, updatedAt: new Date().toISOString() };
    });
    return json({ success: true, id, message: "草稿已同步到云端" });
  }

  if (route === "drafts/list") {
    const state = await loadCmsState();
    const drafts = Object.values(state.drafts).sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
    );
    return json({ success: true, drafts });
  }

  if (route === "drafts/get" && method === "POST") {
    const payload = await bodyJson(request);
    const type = String(payload.type || "post") as ContentType;
    const id = type === "about" ? "about" : normalizeDocumentId(payload.id, type);
    const state = await loadCmsState();
    if (state.drafts[id]) return json({ success: true, draft: state.drafts[id] });
    const raw = await readText(state, documentPath(type, id));
    if (!raw) return json({ success: false, message: "未找到草稿或已发布内容" }, 404);
    return json({ success: true, draft: await markdownToDraft(type, id, raw) });
  }

  if (route === "drafts/delete" && method === "POST") {
    const payload = await bodyJson(request);
    const id = normalizeDocumentId(payload.id, String(payload.type || "draft"));
    await updateCmsState((state) => {
      delete state.drafts[id];
    });
    return json({ success: true, message: "草稿已删除" });
  }

  if (route === "drafts/sync_local" && method === "POST") {
    const payload = await bodyJson(request);
    const operations = Array.isArray(payload.operations) ? (payload.operations as CmsOperation[]) : [];
    const changes = operationsToChanges(operations);
    await updateCmsState((state) => {
      for (const change of changes) setPending(state, change);
      for (const operation of operations) {
        const draft = operation.payload as CmsDraft;
        if (draft?.id) delete state.drafts[String(draft.id)];
      }
    });
    return json({
      success: true,
      message: `已将 ${changes.length} 个文件变更保存到云端发布区`,
      files: changes.map((change) => change.path),
    });
  }

  if (route === "drafts/all_tags") {
    const state = await loadCmsState();
    const files = await managedFiles(state);
    const result = { post: new Set<string>(), chatter: new Set<string>() };
    await Promise.all(
      files
        .filter((path) => /^(posts|chatters)\/[^/]+\.md$/i.test(path))
        .map(async (path) => {
          const raw = await readText(state, path);
          if (!raw) return;
          const parsed = matter(raw);
          const target = path.startsWith("posts/") ? result.post : result.chatter;
          if (Array.isArray(parsed.data.tags)) parsed.data.tags.forEach((tag) => target.add(String(tag)));
        }),
    );
    return json({
      success: true,
      postTags: [...result.post].sort(),
      chatterTags: [...result.chatter].sort(),
    });
  }

  if (route === "content/list") {
    const state = await loadCmsState();
    const content = await getContentList(state);
    return json({ success: true, blogPath: getGithubConfig().owner + "/" + getGithubConfig().repo, ...content });
  }

  if (route === "content/delete" && method === "POST") {
    const payload = await bodyJson(request);
    const type = String(payload.type || "") as ContentType;
    const id = normalizeDocumentId(payload.id, type || "content");
    const path = documentPath(type, id);
    await updateCmsState((state) => setPending(state, { path, content: null }));
    return json({ success: true, message: `已将 ${path} 加入发布删除清单`, deletedFile: path });
  }

  if (route === "gallery/get") {
    const state = await loadCmsState();
    const raw = await readText(state, "data/albums.ts");
    return json({ success: true, albums: raw ? parseTypescriptArray(raw, "albums") : [] });
  }
  if (route === "gallery/sync" && method === "POST") {
    const payload = await bodyJson(request);
    const content = serializeAlbums(payload.albums);
    await updateCmsState((state) => setPending(state, { path: "data/albums.ts", content }));
    return json({ success: true, message: "相册变更已保存到云端发布区" });
  }

  if (route === "friends/get") {
    const state = await loadCmsState();
    const raw = await readText(state, "data/friends.ts");
    return json({ success: true, friends: raw ? parseTypescriptArray(raw, "friendsData") : [] });
  }
  if (route === "friends/sync" && method === "POST") {
    const payload = await bodyJson(request);
    const content = serializeFriends(payload.friends);
    await updateCmsState((state) => setPending(state, { path: "data/friends.ts", content }));
    return json({ success: true, message: "友链变更已保存到云端发布区" });
  }

  if (route === "projects/get") {
    const state = await loadCmsState();
    const raw = await readText(state, "data/projects.ts");
    return json({ success: true, projects: raw ? parseTypescriptArray(raw, "projectsData") : [] });
  }
  if (route === "projects/sync" && method === "POST") {
    const payload = await bodyJson(request);
    const content = serializeProjects(payload.projects);
    await updateCmsState((state) => setPending(state, { path: "data/projects.ts", content }));
    return json({ success: true, message: "项目变更已保存到云端发布区" });
  }

  if (route === "moments/save" && method === "POST") {
    const payload = await bodyJson(request);
    const moment = momentToMarkdown(payload);
    await updateCmsState((state) => setPending(state, { path: moment.path, content: moment.content }));
    return json({ success: true, id: moment.id, message: "瞬间已保存到云端发布区" });
  }
  if (route === "moments/delete" && method === "POST") {
    const payload = await bodyJson(request);
    const path = documentPath("moment", payload.id);
    await updateCmsState((state) => setPending(state, { path, content: null }));
    return json({ success: true, message: "瞬间已加入发布删除清单" });
  }

  if (route === "config/get") {
    const state = await loadCmsState();
    return json({ success: true, data: await currentConfig(state) });
  }
  if (route === "config/update" && method === "POST") {
    const payload = await bodyJson(request);
    const state = await loadCmsState();
    const current = await currentConfig(state);
    const updates = (payload.updates && typeof payload.updates === "object"
      ? payload.updates
      : payload) as Record<string, unknown>;
    const merged = { ...current, ...updates };
    await updateCmsState((next) =>
      setPending(next, { path: "siteConfig.ts", content: serializeSiteConfig(merged) }),
    );
    return json({ success: true, message: "站点配置已保存到云端发布区", data: merged });
  }

  if (route === "picbed/config") {
    if (method === "GET") {
      const state = await loadCmsState();
      return json({ success: true, data: publicPicbedConfig(state.picbed) });
    }
    const payload = await bodyJson(request);
    const data = await updateCmsState((state) => {
      state.picbed = mergePicbedConfig(state.picbed, payload);
      return publicPicbedConfig(state.picbed);
    });
    return json({ success: true, message: "图床配置已加密同步到云端", data });
  }
  if (route === "picbed/test" && method === "POST") {
    const payload = await bodyJson(request);
    const state = await loadCmsState();
    const config = mergePicbedConfig(state.picbed, payload);
    return json({ success: true, message: await testPicbed(config) });
  }
  if (route === "picbed/source" && method === "POST") {
    const payload = await bodyJson(request);
    try {
      const image = await loadRemoteImage(String(payload.url || ""));
      return new Response(Uint8Array.from(image.content), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Length": String(image.content.length),
          "Content-Type": image.contentType,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      return json({ success: false, message: error instanceof Error ? error.message : "读取远程图片失败" }, 400);
    }
  }
  if (route === "picbed/upload" && method === "POST") {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ success: false, message: "缺少图片文件" }, 400);
    const state = await loadCmsState();
    const uploaded = await uploadImage(state, file);
    return json({ success: true, message: "上传成功", ...uploaded });
  }

  if (route === "deploy/config") {
    const info = await getRepositoryInfo();
    return json({
      success: true,
      blogPath: info.fullName,
      sourceBranch: info.sourceBranch,
      remoteUrl: info.remoteUrl,
      repositoryRoot: info.root,
      lastRelease: (await loadCmsState()).lastRelease,
    });
  }
  if (route === "deploy/check" && method === "POST") {
    const info = await getRepositoryInfo();
    return json({ success: true, message: "GitHub 仓库授权和目标分支已就绪", ...info });
  }
  if (route === "deploy/preview" && method === "POST") {
    const state = await loadCmsState();
    const info = await getRepositoryInfo();
    const files = Object.keys(state.pendingChanges).sort();
    return json({
      success: true,
      canPublish: files.length > 0,
      message: files.length ? `检查完成，本次将处理 ${files.length} 个博客文件。` : "当前没有待发布变更。",
      blogPath: info.fullName,
      remoteUrl: info.remoteUrl,
      sourceBranch: info.sourceBranch,
      files,
      unrelatedChangesCount: 0,
    });
  }
  if (route === "deploy/release" && method === "POST") {
    const payload = await bodyJson(request);
    const state = await loadCmsState();
    const changes = Object.values(state.pendingChanges);
    if (!changes.length) return json({ success: false, message: "没有待发布变更" }, 400);
    const message = String(payload.commitMessage || "").trim().slice(0, 120) ||
      `发布博客内容 ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
    const release = await createReleasePullRequest(changes, message);
    if (release.skipped) {
      await updateCmsState((next) => {
        next.pendingChanges = {};
      });
      return json({
        success: true,
        status: "published",
        message: "待发布变更已在远端生效，重复记录已清理",
        changedFiles: [],
      });
    }
    const record = {
      createdAt: new Date().toISOString(),
      branch: release.branch,
      pullNumber: release.pullNumber,
      pullUrl: release.pullUrl,
      files: release.changedFiles,
    };
    await updateCmsState((next) => {
      next.pendingChanges = {};
      next.lastRelease = record;
    });
    return json({
      success: true,
      status: "building",
      message: "发布分支和 PR 已创建，远程构建通过后会自动合并并部署。",
      changedFiles: record.files,
      ...record,
    });
  }
  if (route === "deploy/status") {
    const value = Number(new URL(request.url).searchParams.get("pull"));
    if (!Number.isInteger(value) || value < 1) return json({ success: false, message: "PR 编号无效" }, 400);
    const pull = await getPullRequestStatus(value);
    return json({ success: true, status: pull.merged ? "published" : pull.state, pull });
  }

  if (route.startsWith("music/query/")) {
    return json(await queryMusic(route.slice("music/query/".length)));
  }

  if (route === "sync/legacy_preview") {
    return json({ success: true, files: [], message: "旧管理器已完成归档，不需要迁移遗留副本。" });
  }
  if (route === "sync/legacy_import") {
    return json({ success: true, files: [], message: "旧管理器内容已在迁移前备份。" });
  }

  return json({ success: false, message: `未知 CMS 路由：${route}` }, 404);
}

export async function handleCmsRequest(request: Request, segments: string[]): Promise<Response> {
  const route = segments.join("/");
  const method = request.method.toUpperCase();
  try {
    if (route === "auth/session") {
      return json({ success: true, authenticated: isRequestAuthenticated(request) });
    }
    if (route === "auth/login" && method === "POST") {
      const payload = await bodyJson(request);
      const password = String(payload.password || "");
      if (!verifyAdminPassword(password)) {
        return json({ success: false, message: "管理密码错误" }, 401);
      }
      return json(
        { success: true, message: "登录成功" },
        200,
        { "Set-Cookie": sessionCookie(createSessionToken()) },
      );
    }
    if (route === "auth/logout" && method === "POST") {
      return json(
        { success: true, message: "已退出管理端" },
        200,
        { "Set-Cookie": clearSessionCookie() },
      );
    }
    if (!isRequestAuthenticated(request)) {
      return json({ success: false, message: "管理会话已失效，请重新登录" }, 401);
    }
    return await handleAuthenticated(request, route, method);
  } catch (error) {
    console.error(`[cms:${method} ${route}]`, error);
    return json(
      { success: false, message: error instanceof Error ? error.message : "CMS 请求失败" },
      500,
    );
  }
}
