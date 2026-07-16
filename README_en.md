# LSBlogs

LSBlogs is a reusable personal blog template with a Next.js frontend, a local graphical content manager, and a guarded publishing workflow.

- Template: [luffysolution-svg/LSBlogs](https://github.com/luffysolution-svg/LSBlogs)
- Live example: [luffysite.top](https://luffysite.top)
- Personal site source: [luffysolution-svg/LuffySolutionBlog](https://github.com/luffysolution-svg/LuffySolutionBlog)
- Stack: Next.js 16, React 19, TypeScript, and Tailwind CSS 4

## Repository layout

```text
your-blog/
├─ LSBlogs/             # Next.js frontend and Vercel Root Directory
├─ my-blog-manager/     # local-only graphical manager
├─ scripts/             # read-only configuration checks
├─ Start-Blog.bat       # Windows development launcher
└─ PERSONALIZE.md       # first-run checklist
```

The template uses neutral placeholder content. It does not publish LuffySolution's local paths, comment repository, raw assets, or private machine settings as defaults.

## Start your own blog

1. Click **Use this template** on GitHub.
2. Clone the new repository.
3. Follow [PERSONALIZE.md](PERSONALIZE.md).
4. Import the repository into Vercel and set Root Directory to `LSBlogs`.
5. Push `main` to deploy.

```powershell
git clone https://github.com/your-name/your-blog.git
cd your-blog\LSBlogs
npm ci
npm run dev
```

## Local manager

Run `my-blog-manager/Start.bat` on Windows. The manager discovers the sibling `LSBlogs` directory, or accepts a path from its settings page or the `LSBLOGS_BLOG_PATH` environment variable.

Before publishing, it previews affected files, incrementally syncs managed content, runs the production build, stages only managed blog paths, and pushes the existing `origin`. It never runs `git add .`, creates SSH keys, or stores tokens in the template.

## Attribution and license

LSBlogs is derived from [heiehiehi/XinghuisamaBlogs](https://github.com/heiehiehi/XinghuisamaBlogs). Thanks to the original author for the project structure and open-source foundation.

The project follows CC BY-NC 4.0. Public derivatives must retain attribution, identify modifications, and remain non-commercial. Images, posts, music covers, and other third-party assets may have separate rights and should be replaced with content you are allowed to publish.
