# LSBlogs 首次使用清单

这份清单面向通过 GitHub Template 创建博客的新用户。所有路径都以仓库根目录为基准，不需要填写模板作者的本机绝对路径。

## 1. 安装与预览

```powershell
cd LSBlogs
npm ci
npm run dev
```

Windows 用户也可以双击根目录的 `Start-Blog.bat`。浏览器打开 <http://localhost:3000>。正式管理入口是部署域名的 `/login`。

## 2. 修改站点身份

编辑 `LSBlogs/siteConfig.ts`，至少替换：

- `title`、`authorName`、`bio`
- `navTitle`、`navAfter`
- `avatarUrl`、`faviconUrl`
- `social` 中的公开账号
- `githubComments.repo`
- `friendLinkApplyFormat`

不要提交真实 API Key、Token 或密码。

## 3. 替换示例内容

- 关于页：`LSBlogs/app/about/about.md`
- 文章：`LSBlogs/posts/*.md`
- 杂谈：`LSBlogs/chatters/*.md`
- 瞬间：`LSBlogs/moments/*.md`
- 相册：`LSBlogs/data/albums.ts`
- 友链：`LSBlogs/data/friends.ts`
- 项目：`LSBlogs/data/projects.ts`

模板示例可以删除，但请保留目录本身。

## 4. 替换图片

网站图片位于 `LSBlogs/public/images`。请使用自己创作、已获授权或允许再分发的图片，并同步修改 `siteConfig.ts` 中的图片路径。

根目录的 `asset/` 被默认忽略，适合存放不准备公开提交的原始素材。

## 5. 配置评论

1. 准备一个启用 Issues 的公开 GitHub 仓库。
2. 为该仓库安装 [Utterances](https://github.com/apps/utterances)。
3. 将 Vercel 环境变量 `NEXT_PUBLIC_GITHUB_COMMENTS_REPO` 设置为 `你的用户名/仓库名`。
4. 确认评论没有写入模板作者的 Issues。

## 6. 使用云端管理台

打开部署域名的 `/login`。管理台可作为 PWA 安装到电脑、平板和手机；所有设备共用加密草稿、待处理队列和发布状态。

首次正式发布前，先使用“检查并发布”核对目标仓库、分支和文件清单。管理端会创建独立 PR，GitHub Actions 生产构建通过后才合并并触发 Vercel 部署。

图床可选择默认的 Vercel Blob，或 Lsky Pro、腾讯云 COS、阿里云 OSS、GitHub。第三方密钥在服务端加密保存，不会进入 Git 或浏览器前端包。

## 7. 部署到 Vercel

- Git Repository：你通过模板创建的新仓库
- Framework Preset：Next.js
- Root Directory：`LSBlogs`
- Production Branch：`main`
- Storage：Public Vercel Blob

必需环境变量和 GitHub 权限见 [CMS_DEPLOYMENT.md](CMS_DEPLOYMENT.md)，变量清单也可参考 `LSBlogs/.env.example`。

首次生成或以后轮换管理员密码：

```bash
cd LSBlogs
npm run cms:password -- --vercel --deploy
```

脚本支持 Windows、macOS 和 Linux，并保留现有 `CMS_SESSION_SECRET`，不会因换登录密码而破坏云端加密数据。

## 8. 发布前验证

```powershell
node scripts/checkConfig.mjs
cd LSBlogs
npm run build
```

最后检查桌面端、移动端、浅色主题、深色主题以及文章 URL。

## 9. 保留致谢

公开发布修改版时，请保留对 [heiehiehi/XinghuisamaBlogs](https://github.com/heiehiehi/XinghuisamaBlogs) 的署名，并遵守仓库中的 CC BY-NC 4.0 许可说明。
