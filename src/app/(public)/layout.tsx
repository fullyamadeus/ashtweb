import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-shell"><Header/><main id="main-content">{children}</main><Footer/></div>;
}
