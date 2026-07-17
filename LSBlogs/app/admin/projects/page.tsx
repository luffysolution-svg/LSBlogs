import CmsNavbar from '../../../components/cms/CmsNavbar';
import PageTransition from '../../../components/PageTransition';
import ProjectsBoard from './ProjectsBoard';

export const metadata = {
  title: "项目矩阵 | LSBlogs",
  description: "开源项目与代码仓库展示",
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen relative pb-20">
      <CmsNavbar />
      <PageTransition>
        <div className="mt-28">
          <ProjectsBoard />
        </div>
      </PageTransition>
    </div>
  );
}


