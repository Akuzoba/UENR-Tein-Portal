import Link from "next/link";
import { requirePermission } from "@/lib/admin";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getExecutive, photoOf } from "@/lib/site";
import PageTransition from "@/components/PageTransition";
import ConfirmButton from "../../../members/[id]/ConfirmButton";
import { removeExecutive } from "../../../../website-actions";
import { ExecutiveForm } from "../../forms";

export const metadata = { title: "Edit executive – TEIN UENR Admin" };

export default async function EditExecutivePage({ params }: PageProps<"/admin/website/executives/[id]">) {
  await requirePermission("website.edit");
  const e = await getExecutive((await params).id);
  if (!e) notFound();

  return (
    <PageTransition>
      <div className="max-w-2xl">
        <Link href="/admin/website/executives" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> All executives
        </Link>
        <h1 className="headline mt-4 text-4xl">{e.name}</h1>
        <section className="panel mt-6 p-6">
          <ExecutiveForm e={e} photo={photoOf(e)} />
        </section>
        <section className="panel mt-4 p-6">
          <h2 className="font-display text-xl font-bold uppercase">Remove</h2>
          <p className="mt-1 text-sm text-muted">To keep them in the archive instead, untick “Current executive” above.</p>
          <form action={removeExecutive} className="mt-4">
            <input type="hidden" name="id" value={e.id} />
            <ConfirmButton className="btn btn-danger" message={`Remove ${e.name} and their photo from the website? This cannot be undone.`}>
              <Trash2 className="h-4 w-4" /> Remove executive
            </ConfirmButton>
          </form>
        </section>
      </div>
    </PageTransition>
  );
}
