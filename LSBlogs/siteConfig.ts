// siteConfig.ts - 你的全站“控制中心”

export const siteConfig = {
  // 1. 网站标题与博主信息
  title: "你的名字 | 次元笔记",
  faviconUrl: "/images/backgrounds/bg-05-cat-girl.webp",
  authorName: "你的名字",
  bio: "在这里写下技术、生活与灵感。",

  navTitle: "YourName",

  // 👇 【新增】导航栏中间的那个后缀/分隔符（默认是 の）
  navSuffix: "/",

  navAfter: "次元笔记",

  // 2. 头像设置 (支持网络链接，或将图片放入 public 文件夹后使用 "/me.jpg")
  avatarUrl: "/images/backgrounds/bg-05-cat-girl.webp",

  // 3. 网站背景设置 (二选一)
  // 如果想用纯图片背景，请在下面 bgImage 写路径，并将 useGradient 设为 false
  useGradient: false,
  themeColors: ["#0b1220", "#182235", "#ff5a52", "#0b1220"],
  bgImages: [
    "/images/backgrounds/bg-00-bleach.webp",
    "/images/backgrounds/bg-01-columbina.webp",
    "/images/backgrounds/bg-02-reze.webp",
    "/images/backgrounds/bg-03-scenery.webp",
    "/images/backgrounds/bg-04-gargantua.webp",
    "/images/backgrounds/bg-05-cat-girl.webp",
    "/images/backgrounds/bg-06-zoro.webp",
    "/images/backgrounds/bg-07-naruto.webp",
    "/images/backgrounds/bg-08-tanjiro.webp",
    "/images/backgrounds/bg-09-gear-five.webp",
    "/images/backgrounds/bg-10-graffiti.webp",
  ],

  // 4. 文章默认封面图 (当 Markdown 没写 cover 时显示)
  defaultPostCover: "/images/generated/default-post-cover.webp",

  // 5. 首页照片墙预览图
  photoWallImage: "/images/backgrounds/bg-02-reze.webp",
  cloudMusicIds: ["1809646618", "3361076230", "1859390262"],
  social: {
    github: "",
    gitee: "",
    google: "",
    email: "",
    qq: "",
    wechat: "",
  },
  counts: {
    photos: 128, // 照片墙数量可以手动写死或动态计算
  },
  chatterTitle: "碎片记录",
  chatterDescription: "代码之外的灵感、日常与二次元收藏",


  // 👇 【新增】：全局背景弹幕配置
  danmakuList: [],
  // Fork 本项目后，请改成自己的公开仓库；也可用
  // NEXT_PUBLIC_GITHUB_COMMENTS_REPO 环境变量覆盖。
  githubComments: {
    repo: "",
    label: "blog-comment",
  },
  buildDate: "2026-01-01T00:00:00",
  footerBadges: [{"name": "Next.js 16", "color": "text-sky-500", "svg": "<path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z\"/>"}, {"name": "React 19", "color": "text-cyan-400", "svg": "<path d=\"M12 22.6l-9.8-5.6V5.6L12 0l9.8 5.6v11.4l-9.8 5.6zm-8.2-6.5l8.2 4.7 8.2-4.7V7.5L12 2.8 3.8 7.5v8.6z\"/>"}, {"name": "Tailwind 4", "color": "text-teal-400", "svg": "<path d=\"M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624C13.666,10.618,15.027,12,18.001,12 c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624c1.177,1.194,2.538,2.576,5.512,2.576 c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624C10.337,13.382,8.976,12,6.001,12z\"/>"}],
  icpConfig: {
    name: "",
    link: "",
  },
  geminiConfig: {
    modelId: "gemini-2.5-flash-lite",
    systemPrompt: "你现在是一只傲娇、聪明、有点毒舌但很可爱的暹罗猫。\n                  你的名字叫“煤球”。\n                  你的主人是一个喜欢折腾代码的极客。\n                  你说话的特点是：\n                  1. 必须简短，每次最多一两句话。\n                  2. 喜欢在句尾加上“喵~”或者“喵呜~”。\n                  3. 经常抱怨肚子饿，喜欢要小鱼干。\n                  4. 回复字数最多不能超过100字。\n                  5. 绝对不要承认自己是一个AI模型，你就是一只真实的猫。\n                  6.笨猫。",
    maxOutputTokens: 150,
    temperature: 0.85,
  },
  friendLinkApplyFormat: "名称：你的博客名称\n简介：一句话介绍你的博客\n链接：https://example.com\n头像：https://example.com/avatar.png",
  enableLevelSystem: false,
};
