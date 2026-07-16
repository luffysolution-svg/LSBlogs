import fs from 'fs';
import path from 'path';

const commonKeys = [
  'title',
  'faviconUrl',
  'authorName',
  'bio',
  'navTitle',
  'navSuffix',
  'navAfter',
  'avatarUrl',
  'useGradient',
  'themeColors',
  'bgImages',
  'defaultPostCover',
  'photoWallImage',
  'cloudMusicIds',
  'social',
  'counts',
  'chatterTitle',
  'chatterDescription',
  'danmakuList',
  'buildDate',
  'footerBadges',
  'icpConfig',
  'geminiConfig',
  'friendLinkApplyFormat',
  'enableLevelSystem',
];

const tasks = [
  {
    name: '管理器',
    filePath: path.resolve('./my-blog-manager/siteConfig.ts'),
    keys: [...commonKeys, 'picBedName', 'picBedUrl', 'picBedToken'],
  },
  {
    name: '正式博客',
    filePath: path.resolve('./LSBlogs/siteConfig.ts'),
    keys: commonKeys,
  },
];

let hasErrors = false;

console.log('\n正在执行 LSBlogs 配置只读检查...');

for (const task of tasks) {
  if (!fs.existsSync(task.filePath)) {
    console.error(`未找到 ${task.name} 配置文件: ${task.filePath}`);
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(task.filePath, 'utf8');
  const missingKeys = task.keys.filter(
    (key) => !content.includes(`${key}:`) && !content.includes(`${key} :`),
  );

  if (missingKeys.length > 0) {
    console.error(`${task.name}缺少配置项: ${missingKeys.join(', ')}`);
    hasErrors = true;
  } else {
    console.log(`${task.name}配置完整。`);
  }
}

if (hasErrors) {
  console.error('配置检查未通过。请在对应的 siteConfig.ts 中补全缺失项。');
  process.exitCode = 1;
} else {
  console.log('LSBlogs 配置检查通过，未修改任何文件。');
}
