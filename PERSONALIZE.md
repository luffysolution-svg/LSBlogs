# LSBlogs 首次使用清单

这份清单面向通过 GitHub Template 创建博客的新用户。所有路径都以仓库根目录为基准，不需要填写模板作者的本机绝对路径。

## 1. 安装与预览

```powershell
cd LSBlogs
npm ci
npm run dev
```

Windows 用户也可以双击根目录的 `Start-Blog.bat`。浏览器打开 <http://localhost:3000>。

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

## 6. 使用本地管理器

双击 `my-blog-manager/Start.bat`。管理器会自动寻找同级的 `LSBlogs`，无需手写绝对路径。

如果目录结构不同，可在设置页选择博客目录，或在启动前设置 `LSBLOGS_BLOG_PATH`。自定义路径只保存在被 Git 忽略的 `manager_data/deploy_config.json`。

首次正式发布前，先使用“检查并发布”核对目录、远程仓库、分支和文件清单。管理器会先执行生产构建，再只提交受管理的博客内容。

## 7. 部署到 Vercel

- Git Repository：你通过模板创建的新仓库
- Framework Preset：Next.js
- Root Directory：`LSBlogs`
- Production Branch：`main`

可选环境变量见 `LSBlogs/.env.example`。

## 8. 发布前验证

```powershell
node scripts/checkConfig.mjs
cd LSBlogs
npm run build
```

最后检查桌面端、移动端、浅色主题、深色主题以及文章 URL。

## 9. 保留致谢

公开发布修改版时，请保留对 [heiehiehi/XinghuisamaBlogs](https://github.com/heiehiehi/XinghuisamaBlogs) 的署名，并遵守仓库中的 CC BY-NC 4.0 许可说明。
