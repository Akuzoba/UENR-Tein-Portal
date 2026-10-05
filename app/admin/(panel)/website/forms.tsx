"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "../../actions";
import { addExecutive, editActivity, editExecutive, newActivity, saveSiteContent } from "../../website-actions";
import type { Activity, Executive, SiteContent } from "@/lib/site";
import ImageInput from "@/components/admin/ImageInput";

function Status({ state }: { state: FormState }) {
  if (state.error) return <p className="rounded-md border-l-4 border-ndc-red bg-ndc-red/5 px-3 py-2 text-sm font-medium text-ndc-red">{state.error}</p>;
  if (state.ok) return <p className="rounded-md border-l-4 border-ndc-green bg-ndc-green/5 px-3 py-2 text-sm font-medium text-ndc-green">{state.ok}</p>;
  return null;
}

const Hint = ({ children }: { children: React.ReactNode }) => <span className="mt-1 block text-xs font-normal text-muted">{children}</span>;

/* ------------------------------------------------------------------ site content */

export function ContentForm({ c }: { c: SiteContent }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSiteContent, {});
  const field = (k: keyof SiteContent, label: string, hint?: string, type = "text") => (
    <label className="field">
      {label}
      <input name={k} type={type} defaultValue={c[k]} className="input" />
      {hint && <Hint>{hint}</Hint>}
    </label>
  );
  const area = (k: keyof SiteContent, label: string, rows: number, hint?: string) => (
    <label className="field">
      {label}
      <textarea name={k} defaultValue={c[k]} rows={rows} className="input leading-relaxed" />
      {hint && <Hint>{hint}</Hint>}
    </label>
  );

  return (
    <form action={action} className="space-y-6">
      <section className="panel space-y-4 p-6">
        <h2 className="font-display text-xl font-bold uppercase">Home page</h2>
        {field("tagline", "Headline", "The big line at the top of the home page.")}
        {area("intro", "Introduction", 3, "One or two sentences under the headline.")}
      </section>
      <section className="panel space-y-4 p-6">
        <h2 className="font-display text-xl font-bold uppercase">About</h2>
        {area("about", "About us", 8, "Leave a blank line between paragraphs. The first paragraph also appears on the home page.")}
        <div className="grid gap-4 md:grid-cols-2">
          {area("mission", "Mission", 4)}
          {area("vision", "Vision", 4)}
        </div>
      </section>
      <section className="panel space-y-4 p-6">
        <h2 className="font-display text-xl font-bold uppercase">Contact &amp; social media</h2>
        <p className="text-sm text-muted">Leave anything empty to hide it.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {field("whatsapp", "WhatsApp number", "e.g. 0241234567, or a WhatsApp group/chat link.")}
          {field("phone", "Phone number")}
          {field("email", "Email", undefined, "email")}
          {field("location", "Location / office")}
          {field("facebook", "Facebook", "Page link or name.")}
          {field("instagram", "Instagram", "Link or @handle.")}
          {field("x", "X (Twitter)", "Link or @handle.")}
          {field("tiktok", "TikTok", "Link or @handle.")}
        </div>
      </section>
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white/95 p-3 shadow-lg">
        <button disabled={pending} className="btn btn-primary px-6">{pending ? "Saving…" : "Save changes"}</button>
        <div className="min-w-0 flex-1"><Status state={state} /></div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ executives */

export function ExecutiveForm({ e, photo }: { e?: Executive; photo?: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(e ? editExecutive : addExecutive, {});
  const ref = useRef<HTMLFormElement>(null);
  // After adding someone, clear the form for the next person.
  useEffect(() => {
    if (!e && state.ok) ref.current?.reset();
  }, [state, e]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      {e && <input type="hidden" name="id" value={e.id} />}
      <ImageInput name="photo" current={photo} />
      {e && photo && (
        <label className="flex items-center gap-2 text-sm">
          <input name="remove_photo" type="checkbox" className="h-4 w-4 accent-ndc-red" /> Remove photo
        </label>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Full name *
          <input name="name" defaultValue={e?.name} required className="input" />
        </label>
        <label className="field">
          Position *
          <input name="position" defaultValue={e?.position} required placeholder="e.g. President" className="input" />
        </label>
        <label className="field">
          Term
          <input name="term" defaultValue={e?.term ?? ""} placeholder="e.g. 2025/2026" className="input" />
        </label>
        <label className="field">
          Display order
          <input name="sort_order" type="number" min={0} max={999} defaultValue={e?.sort_order ?? 0} className="input" />
          <Hint>Lower numbers show first (President 1, Vice 2…).</Hint>
        </label>
      </div>
      <label className="field">
        Short bio <span className="font-normal text-muted">(optional)</span>
        <textarea name="bio" defaultValue={e?.bio ?? ""} rows={3} maxLength={600} className="input" />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input name="is_current" type="checkbox" defaultChecked={e?.is_current ?? true} className="h-4 w-4 accent-ndc-green" />
        Current executive
        <span className="font-normal text-muted">(untick to move them to “Past executives”)</span>
      </label>
      <Status state={state} />
      <button disabled={pending} className="btn btn-dark">{pending ? "Saving…" : e ? "Save changes" : "Add executive"}</button>
    </form>
  );
}

/* ------------------------------------------------------------------ activities */

export function NewActivityForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(newActivity, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <label className="field">
          Title *
          <input name="title" required placeholder="e.g. Freshers' orientation 2026" className="input" />
        </label>
        <label className="field">
          Date
          <input name="happened_on" type="date" className="input" />
        </label>
      </div>
      <label className="field">
        Short summary
        <input name="summary" maxLength={400} placeholder="One sentence shown on the activity card" className="input" />
      </label>
      <Status state={state} />
      <button disabled={pending} className="btn btn-primary">{pending ? "Creating…" : "Create and add photos"}</button>
    </form>
  );
}

export function ActivityForm({ a }: { a: Activity }) {
  const [state, action, pending] = useActionState<FormState, FormData>(editActivity, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={a.id} />
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <label className="field">
          Title *
          <input name="title" defaultValue={a.title} required className="input" />
        </label>
        <label className="field">
          Date
          <input name="happened_on" type="date" defaultValue={a.happened_on ?? ""} className="input" />
        </label>
      </div>
      <label className="field">
        Short summary
        <input name="summary" defaultValue={a.summary ?? ""} maxLength={400} className="input" />
        <Hint>Shown on the activity card and when the link is shared.</Hint>
      </label>
      <label className="field">
        Write-up <span className="font-normal text-muted">(optional)</span>
        <textarea name="body" defaultValue={a.body ?? ""} rows={7} className="input leading-relaxed" />
        <Hint>What happened, who attended, key messages. Leave a blank line between paragraphs.</Hint>
      </label>
      <label className="flex items-center gap-2 rounded-md bg-paper px-3 py-3 text-sm font-semibold">
        <input name="published" type="checkbox" defaultChecked={a.published} className="h-4 w-4 accent-ndc-green" />
        Show on website
      </label>
      <Status state={state} />
      <button disabled={pending} className="btn btn-dark">{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
