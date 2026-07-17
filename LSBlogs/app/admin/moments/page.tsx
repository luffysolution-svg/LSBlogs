import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import CmsNavbar from '../../../components/cms/CmsNavbar';
import PageTransition from '../../../components/PageTransition';
import MomentList from './MomentList';
import { siteConfig } from '../../../siteConfig';

export const metadata = {
  title: "说说 | " + siteConfig.authorName + " の 博客",
  description: "生活动态与瞬间记录",
};

export default async function MomentsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  let allMoments: any[] = [];

  try {
    // 🌟 终极防漏绝招：同时扫描两个可能的文件夹，把所有的说说都抓出来！
    const possibleDirs = [
      path.join(process.cwd(), 'posts', 'moments'),
      path.join(process.cwd(), 'moments')
    ];

    possibleDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const fileNames = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
        fileNames.forEach(fileName => {
          const fullPath = path.join(dir, fileName);
          const { data, content } = matter(fs.readFileSync(fullPath, 'utf8'));

          allMoments.push({
            id: fileName.replace(/\.md$/, ''),
            date: String(data.date || '1970-01-01'),
            location: data.location || '',
            images: data.images || [],
            content: content.trim()
          });
        });
      }
    });

    // 去重，防止你在两个文件夹放了同名文件
    allMoments = Array.from(new Map(allMoments.map(item => [item.id, item])).values());

  } catch (e) {
    console.error("读取说说数据失败:", e);
  }

  return (
    <div className="min-h-screen relative pb-10 flex flex-col">
      <CmsNavbar />
      <PageTransition className="flex-1 flex flex-col">
        <MomentList
          moments={allMoments}
          authorName={siteConfig.authorName}
          avatarUrl={siteConfig.avatarUrl}
          initialEditId={edit || null}
        />
      </PageTransition>
    </div>
  );
}
