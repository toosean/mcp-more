import Sidebar from './Sidebar';
import TitleBar from './TitleBar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto scrollbar-hover">
          {children}
        </main>
      </div>
    </div>
  );
}