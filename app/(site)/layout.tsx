import Header, { PORTAL_NAV } from "@/components/site/Header";
import Footer from "@/components/site/Footer";

// Registration portal (/portal/*) and the card verification page.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header links={PORTAL_NAV} cta={{ href: "/portal/register", label: "Register" }} />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}
