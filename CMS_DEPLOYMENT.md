# LSBlogs 云端管理与发布

部署后访问 `https://你的域名/login`，登录成功即可进入 `/admin`。管理端和博客使用同一套 Next.js 应用，因此电脑、平板、手机与安装后的 PWA 看到同样的功能、界面和待处理数据，不再依赖本机 Python、Git、Node.js 或桌面窗口。

## 必需环境变量

| 名称 | 用途 |
| --- | --- |
| `CMS_ADMIN_PASSWORD` | 管理台登录密码 |
| `CMS_SESSION_SECRET` | 至少 32 位随机字符串，用于签名登录会话 |
| `CMS_GITHUB_REPO` | 发布目标，格式为 `owner/repository` |
| `CMS_GITHUB_BRANCH` | 生产分支，通常为 `main` |
| `CMS_GITHUB_ROOT` | 博客在仓库中的目录；本模板为 `LSBlogs`，博客位于仓库根目录时留空 |
| `CMS_GITHUB_TOKEN` | GitHub Token，需要 Contents 和 Pull requests 读写权限 |
| `BLOB_READ_WRITE_TOKEN` | 由项目绑定的 Vercel Blob 自动生成 |

敏感值只保存在 Vercel 环境变量中。CMS 草稿、操作队列和图床密钥在写入 Blob 前使用 AES-256-GCM 加密；加密密钥由 `CMS_SESSION_SECRET` 派生。

## 一键部署

README 中的 Deploy Button 会完成以下动作：

1. 从模板创建你的 GitHub 仓库。
2. 将 Vercel Root Directory 设置为 `LSBlogs`。
3. 创建并绑定公开读取的 Vercel Blob；公开读取只用于图片，CMS 状态本身始终是加密数据。
4. 提示填写管理密码、会话密钥和 GitHub 发布凭据。

首次部署后，在 GitHub 仓库的 Actions 设置中确认 Workflow permissions 允许 Read and write。建议使用只授权该仓库的 fine-grained token：Contents 为 Read and write，Pull requests 为 Read and write。

## 发布流程

```text
管理台编辑 → 云端草稿/发布区 → 创建 cms/publish-* PR
           → GitHub Actions 生产构建 → 自动合并 main
           → Vercel 自动生产部署
```

管理台不会直接改写 `main`。只有由 CMS 创建、来自同仓库且分支名为 `cms/publish-*` 的 PR 才会进入自动构建与合并任务。

## 本地验证

```powershell
cd LSBlogs
npm ci
npm run build
```

本地运行管理 API 时，若未配置 Vercel Blob，状态会写入被 Git 忽略的 `LSBlogs/.cms-data/`；生产环境必须绑定 Blob。
