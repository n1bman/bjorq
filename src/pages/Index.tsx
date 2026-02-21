import Scene3D from '@/components/Scene3D';
import BottomNav from '@/components/BottomNav';
import ModeHeader from '@/components/ModeHeader';

const Index = () => {
  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <ModeHeader />
      <div className="absolute inset-0 pt-14 pb-16">
        <Scene3D />
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
