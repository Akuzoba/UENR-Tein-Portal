import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentAdmin } from "@/lib/admin";
import { homeFor } from "@/lib/roles";
import Logo from "@/components/brand/Logo";
import PageTransition from "@/components/PageTransition";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin login – TEIN UENR" };

export default async function LoginPage() {
  const admin = await currentAdmin();
  if (admin) redirect(homeFor(admin.role));
  return (
    <PageTransition>
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-16">
        <div className="anim-rise w-full max-w-sm">
          <Link href="/" className="inline-block">
            <Logo morph />
          </Link>
          <div className="panel mt-8 overflow-hidden">
            <div className="flag-rule h-1.5" />
            <div className="p-7">
              <h1 className="headline text-4xl">Executive sign in</h1>
              <p className="mt-2 text-sm text-muted">Manage members, payments and cards.</p>
              <LoginForm />
            </div>
          </div>
          <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
        </div>
      </main>
    </PageTransition>
  );
}
