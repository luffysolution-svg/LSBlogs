import CmsNavbar from '../../../components/cms/CmsNavbar';
import PageTransition from '../../../components/PageTransition';
import FriendsBoard from './FriendsBoard';

export const metadata = {
  title: "友链 | LSBlogs",
  description: "赛博空间里的有趣灵魂",
};

export default function FriendsPage() {
  return (
    <div className="min-h-screen relative pb-20">
      <CmsNavbar />
      <PageTransition>
        <div className="mt-28">
          <FriendsBoard />
        </div>
      </PageTransition>
    </div>
  );
}


