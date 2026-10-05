import Header, { MAIN_NAV } from "@/components/site/Header";
import Footer from "@/components/site/Footer";

// Main site: home, about, activities, executives, contact.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header links={MAIN_NAV} cta={{ href: "/portal/register", label: "Join TEIN" }} />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer dark />
    </>
  );
}
