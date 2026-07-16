# LSBlogs

LSBlogs 是一套可复用的个人博客模板，包含 Next.js 正式前端、本地图形化内容管理器和安全发布流程。

- 模板仓库：[luffysolution-svg/LSBlogs](https://github.com/luffysolution-svg/LSBlogs)
- 实际效果：[luffysite.top](https://luffysite.top)
- 个人站源码：[luffysolution-svg/LuffySolutionBlog](https://github.com/luffysolution-svg/LuffySolutionBlog)
- 技术栈：Next.js 16、React 19、TypeScript、Tailwind CSS 4

## 仓库定位

这个仓库只提供通用模板和本地管理工具。示例配置使用占位身份，不把 LuffySolution 的文章、评论仓库、本机路径或原始图片素材作为新博客的默认数据。

```text
你的博客仓库/
├─ LSBlogs/             # Next.js 博客前端，Vercel Root Directory
├─ my-blog-manager/     # 仅在本机运行的图形管理器
├─ scripts/             # 只读配置检查
├─ Start-Blog.bat       # Windows 本地启动脚本
└─ PERSONALIZE.md       # 首次使用检查清单
```

## 创建自己的博客

1. 在 GitHub 点击 **Use this template**，创建属于你的仓库。
2. 克隆新仓库并安装前端依赖。
3. 按 [PERSONALIZE.md](PERSONALIZE.md) 修改身份、内容、图片和评论仓库。
4. 在 Vercel 导入你的仓库，将 Root Directory 设置为 `LSBlogs`。
5. 向 `main` 推送后，Vercel 会自动部署。

```powershell
git clone https://github.com/你的用户名/你的仓库.git
cd 你的仓库\LSBlogs
npm ci
npm run dev
```

Windows 用户也可以双击根目录的 `Start-Blog.bat`。

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

双击 `my-blog-manager/Start.bat` 启动本地管理器。它会自动寻找同级的 `LSBlogs`，也可以在设置页选择目录，或通过 `LSBLOGS_BLOG_PATH` 环境变量指定。

发布前管理器会：

1. 显示本次同步与提交文件清单。
2. 增量复制受管理内容，不清空文章和图片目录。
3. 执行 `npm run build`。
4. 只暂存受管理的博客路径，不执行 `git add .`。
5. 使用当前仓库已有的 `origin` 和目标分支推送。

本机绝对路径只保存在被 Git 忽略的 `manager_data/deploy_config.json`。管理器不会生成 SSH 密钥，也不会把 Token 写入模板。

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
