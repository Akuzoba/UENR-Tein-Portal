import Link from "next/link";
import { requirePermission } from "@/lib/admin";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Star, Trash2 } from "lucide-react";
import { activityPhotos, getActivity } from "@/lib/site";
import PageTransition from "@/components/PageTransition";
import PhotoUploader from "@/components/admin/PhotoUploader";
import ConfirmButton from "../../../members/[id]/ConfirmButton";
import { makeCover, removeActivity, removeActivityPhoto } from "../../../../website-actions";
import { ActivityForm } from "../../forms";

export const metadata = { title: "Edit activity – TEIN UENR Admin" };

export default async function EditActivityPage({ params, searchParams }: PageProps<"/admin/website/activities/[id]">) {
  await requirePermission("website.edit");
  const a = await getActivity({ id: (await params).id });
  if (!a) notFound();
  const { new: isNew } = await searchParams;
  const photos = await activityPhotos(a.id);
  const cover = a.cover_path ?? photos[0]?.path;

  return (
    <PageTransition>
      <div>
        <Link href="/admin/website/activities" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> All activities
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-line pb-5">
          <h1 className="headline text-4xl sm:text-5xl">{a.title}</h1>
          {a.published ? <span className="badge badge-paid">live on website</span> : <span className="badge badge-pending">hidden</span>}
          {a.published && (
            <a href={`/activities/${a.slug}`} target="_blank" className="btn btn-ghost ml-auto">
              <ExternalLink className="h-4 w-4" /> View
            </a>
          )}
        </div>

        {isNew && (
          <p className="mt-5 rounded-md border-l-4 border-ndc-green bg-white px-4 py-3 text-sm">
            <b>Activity created.</b> Add photos below, then tick <b>Show on website</b> and save to publish it.
          </p>
        )}

        <div className="mt-6 grid items-start gap-4 xl:grid-cols-[420px_1fr]">
          <div className="space-y-4">
            <section className="panel p-6">
              <h2 className="font-display text-xl font-bold uppercase">Details</h2>
              <div className="mt-4"><ActivityForm a={a} /></div>
            </section>
            <section className="panel p-6">
              <h2 className="font-display text-xl font-bold uppercase">Delete</h2>
              <p className="mt-1 text-sm text-muted">Removes the activity and all its photos.</p>
              <form action={removeActivity} className="mt-4">
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton className="btn btn-danger" message={`Delete “${a.title}” and all ${photos.length} photos? This cannot be undone.`}>
                  <Trash2 className="h-4 w-4" /> Delete activity
                </ConfirmButton>
              </form>
            </section>
          </div>

          <section className="panel p-6">
            <h2 className="font-display text-xl font-bold uppercase">Photos ({photos.length})</h2>
            <div className="mt-4"><PhotoUploader activityId={a.id} /></div>
            {photos.length > 0 && (
              <>
                <p className="mt-5 text-xs text-muted">The cover is shown on the activity card and when the link is shared.</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                  {photos.map((p) => (
                    <div key={p.id} className={`group relative overflow-hidden rounded-md bg-paper ring-2 ${p.path === cover ? "ring-ndc-green" : "ring-transparent"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                      {p.path === cover && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded bg-ndc-green px-1.5 py-0.5 text-xs font-semibold text-white">
                          <Star className="h-3 w-3" /> Cover
                        </span>
                      )}
                      {/* Always visible on touch screens; on hover elsewhere */}
                      <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        {p.path !== cover && (
                          <form action={makeCover}>
                            <input type="hidden" name="id" value={p.id} />
                            <button className="rounded bg-white/90 px-2 py-1 text-xs font-semibold text-ink hover:bg-white">Make cover</button>
                          </form>
                        )}
                        <form action={removeActivityPhoto} className="ml-auto">
                          <input type="hidden" name="id" value={p.id} />
                          <ConfirmButton className="rounded bg-white/90 p-1.5 text-ndc-red hover:bg-white" message="Delete this photo?">
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmButton>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
