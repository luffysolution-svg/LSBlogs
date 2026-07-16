# LSBlogs Frontend

这是 LSBlogs 模板中的 Next.js 正式前端。完整安装、管理器和部署说明位于仓库根目录的 [README.md](../README.md) 与 [PERSONALIZE.md](../PERSONALIZE.md)。

## 本地运行

```bash
npm ci
npm run dev
```

生产验证：

```bash
npm run build
npm run start
```

## 主要配置

- 全站身份：`siteConfig.ts`
- 关于页：`app/about/about.md`
- 文章：`posts/*.md`
- 杂谈：`chatters/*.md`
- 瞬间：`moments/*.md`
- 相册、友链和项目：`data/*.ts`
- 公开图片：`public/images/`

在 Vercel 导入整个模板仓库时，请将 Root Directory 设置为 `LSBlogs`。

## 致谢与许可

本项目基于 [heiehiehi/XinghuisamaBlogs](https://github.com/heiehiehi/XinghuisamaBlogs) 二次开发，并由 [LuffySolution](https://github.com/luffysolution-svg) 整理为 LSBlogs 模板。感谢原作者提供项目结构与开源基础。

项目遵循 [CC BY-NC 4.0](./LICENSE.md)。公开修改版需要保留署名并标明修改，且不得用于商业用途。第三方图片、文章和音乐素材可能具有独立权利归属。
