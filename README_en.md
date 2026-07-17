# LSBlogs

LSBlogs is a reusable personal blog template with a Next.js frontend, a cross-device Web/PWA content manager, and a build-verified GitHub/Vercel publishing workflow.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fluffysolution-svg%2FLSBlogs&root-directory=LSBlogs&project-name=lsblogs&repository-name=lsblogs&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22public%22%7D%5D&env=CMS_ADMIN_PASSWORD%2CCMS_SESSION_SECRET%2CCMS_GITHUB_REPO%2CCMS_GITHUB_TOKEN%2CCMS_GITHUB_BRANCH%2CCMS_GITHUB_ROOT&envDefaults=%7B%22CMS_GITHUB_BRANCH%22%3A%22main%22%2C%22CMS_GITHUB_ROOT%22%3A%22LSBlogs%22%7D)

- Template: [luffysolution-svg/LSBlogs](https://github.com/luffysolution-svg/LSBlogs)
- Live example: [luffysite.top](https://luffysite.top)
- Personal site source: [luffysolution-svg/LuffySolutionBlog](https://github.com/luffysolution-svg/LuffySolutionBlog)
- Stack: Next.js 16, React 19, TypeScript, and Tailwind CSS 4

## Repository layout

```text
your-blog/
├─ LSBlogs/             # Next.js frontend and Vercel Root Directory
├─ .github/workflows/   # verified CMS release automation
├─ scripts/             # read-only configuration checks
├─ Start-Blog.bat       # optional Windows preview launcher
├─ CMS_DEPLOYMENT.md    # cloud CMS and deployment guide
└─ PERSONALIZE.md       # first-run checklist
```

The template uses neutral placeholder content. It does not publish LuffySolution's local paths, comment repository, raw assets, or private machine settings as defaults.

## Start your own blog

1. Click **Use this template** on GitHub.
2. Use the Deploy Button and provide the CMS password, session secret, and GitHub publishing credentials.
3. Follow [PERSONALIZE.md](PERSONALIZE.md).
4. Open `/login` on the deployed domain from any desktop, tablet, or phone.
5. Confirm a release in the CMS; verified changes merge and deploy automatically.

```powershell
git clone https://github.com/your-name/your-blog.git
cd your-blog\LSBlogs
npm ci
npm run dev
```

## Cloud manager

The built-in `/admin` PWA manages posts, chatter, moments, albums, friends, projects, settings, drafts, publishing previews, and multiple image providers. Drafts and private provider settings are encrypted before they are stored in Vercel Blob.

Publishing creates a dedicated `cms/publish-*` pull request. GitHub Actions builds it and only then merges it into `main`, which triggers the production Vercel deployment. See [CMS_DEPLOYMENT.md](CMS_DEPLOYMENT.md) for the required environment variables and permissions.

## Attribution and license

LSBlogs is derived from [heiehiehi/XinghuisamaBlogs](https://github.com/heiehiehi/XinghuisamaBlogs). Thanks to the original author for the project structure and open-source foundation.

The project follows CC BY-NC 4.0. Public derivatives must retain attribution, identify modifications, and remain non-commercial. Images, posts, music covers, and other third-party assets may have separate rights and should be replaced with content you are allowed to publish.
