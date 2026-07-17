# LSBlogs

LSBlogs 是一套可复用的个人博客模板，包含 Next.js 正式前端、跨设备 Web/PWA 图形管理台和经过构建验证的 GitHub/Vercel 发布流程。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fluffysolution-svg%2FLSBlogs&root-directory=LSBlogs&project-name=lsblogs&repository-name=lsblogs&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22public%22%7D%5D&env=CMS_ADMIN_PASSWORD%2CCMS_SESSION_SECRET%2CCMS_GITHUB_REPO%2CCMS_GITHUB_TOKEN%2CCMS_GITHUB_BRANCH%2CCMS_GITHUB_ROOT&envDefaults=%7B%22CMS_GITHUB_BRANCH%22%3A%22main%22%2C%22CMS_GITHUB_ROOT%22%3A%22LSBlogs%22%7D&envDescription=LSBlogs%20%E7%AE%A1%E7%90%86%E5%8F%B0%E7%99%BB%E5%BD%95%E3%80%81GitHub%20%E5%8F%91%E5%B8%83%E5%92%8C%E5%8A%A0%E5%AF%86%E4%BA%91%E7%8A%B6%E6%80%81%E6%89%80%E9%9C%80%E9%85%8D%E7%BD%AE)

- 模板仓库：[luffysolution-svg/LSBlogs](https://github.com/luffysolution-svg/LSBlogs)
- 实际效果：[luffysite.top](https://luffysite.top)
- 个人站源码：[luffysolution-svg/LuffySolutionBlog](https://github.com/luffysolution-svg/LuffySolutionBlog)
- 技术栈：Next.js 16、React 19、TypeScript、Tailwind CSS 4

## 仓库定位

这个仓库提供通用博客与内置云端管理台。示例配置使用占位身份，不把 LuffySolution 的文章、评论仓库、本机路径或原始图片素材作为新博客的默认数据。

```text
你的博客仓库/
├─ LSBlogs/             # Next.js 博客前端，Vercel Root Directory
├─ .github/workflows/   # CMS 发布构建与自动合并
├─ scripts/             # 只读配置检查
├─ Start-Blog.bat       # 可选的本地预览脚本
├─ CMS_DEPLOYMENT.md    # 云端管理与发布配置
└─ PERSONALIZE.md       # 首次使用检查清单
```

## 创建自己的博客

1. 在 GitHub 点击 **Use this template**，创建属于你的仓库。
2. 使用上方 Deploy Button，填写 CMS 密码、会话密钥和 GitHub 发布凭据；Vercel 会同时创建 Blob。
3. 按 [PERSONALIZE.md](PERSONALIZE.md) 修改身份、内容、图片和评论仓库。
4. 打开部署域名的 `/login`，从任意设备进入同一套管理台。
5. 在管理台确认发布后，构建通过的内容会自动合并并部署。

```powershell
git clone https://github.com/你的用户名/你的仓库.git
cd 你的仓库\LSBlogs
npm ci
npm run dev
```

本地预览仍可双击根目录的 `Start-Blog.bat`，但在线管理和发布不需要在电脑安装或启动这些工具。

## 内容位置

```text
LSBlogs/posts/*.md
LSBlogs/chatters/*.md
LSBlogs/moments/*.md
LSBlogs/app/about/about.md
LSBlogs/public/images/
LSBlogs/siteConfig.ts
```

博客支持 Markdown 文章、杂谈、瞬间、时间轴、相册、友链、项目、网易云音乐、深浅主题以及 Utterances GitHub Issues 评论。

## 图形管理器

管理台内置在博客的 `/admin`，支持文章、杂谈、说说、相册、友链、项目、站点设置、草稿、发布预览与多云图床。Vercel Blob 是零配置默认图床，也可继续使用 Lsky Pro、腾讯云 COS、阿里云 OSS 或 GitHub。

草稿、待处理队列和私密图床配置会加密同步到云端；GitHub Token 和登录密码只存在于部署环境。发布时只创建受管理内容的独立 PR，GitHub Actions 构建通过后才自动合并，Vercel 随后部署生产站点。完整说明见 [CMS_DEPLOYMENT.md](CMS_DEPLOYMENT.md)。

## 验证

```powershell
node scripts/checkConfig.mjs
cd LSBlogs
npm run build
```

配置检查脚本只读取文件，不会注入作者默认值或改写项目。

## 致谢与许可

LSBlogs 基于 [heiehiehi/XinghuisamaBlogs](https://github.com/heiehiehi/XinghuisamaBlogs) 二次开发。感谢原作者提供项目结构与开源基础。

项目遵循 CC BY-NC 4.0。公开修改版需要保留原作者署名并标明修改，且不得用于商业用途。图片、文章、音乐封面与其他第三方素材可能具有独立权利归属，复用者应替换为自己有权公开使用的内容。
