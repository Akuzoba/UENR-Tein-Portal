"use client";

import { useActionState, useEffect, useRef } from "react";
import { addAdmin, changePassword, updateFee, updateSignatory, type FormState } from "../../actions";

function Status({ state }: { state: FormState }) {
  if (state.error) return <p className="rounded-md border-l-4 border-ndc-red bg-ndc-red/5 px-3 py-2 text-sm font-medium text-ndc-red">{state.error}</p>;
  if (state.ok) return <p className="rounded-md border-l-4 border-ndc-green bg-ndc-green/5 px-3 py-2 text-sm font-medium text-ndc-green">{state.ok}</p>;
  return null;
}

function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="mt-3 space-y-3">
      <label className="field">
        Current password
        <input name="current" type="password" required autoComplete="current-password" className="input" />
      </label>
      <label className="field">
        New password
        <input name="next" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </label>
      <label className="field">
        Confirm new password
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </label>
      <Status state={state} />
      <button disabled={pending} className="btn btn-dark">{pending ? "Saving…" : "Update password"}</button>
    </form>
  );
}

export function AddAdminForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addAdmin, {});
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-2">
        <input name="username" required placeholder="Username" autoComplete="off" className="input mt-0 min-w-40 flex-1" />
        <input name="password" type="password" required minLength={8} placeholder="Temporary password" autoComplete="new-password" className="input mt-0 min-w-40 flex-1" />
        <button disabled={pending} className="btn btn-dark">{pending ? "Adding…" : "Add admin"}</button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function SignatoryForm({ name, title, signature }: { name: string; title: string; signature: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateSignatory, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <div className="flex h-24 items-end justify-center rounded-md border border-line bg-paper px-4 pb-2">
        {signature ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signature} alt="Current signature" className="max-h-20 max-w-full object-contain mix-blend-multiply" />
        ) : (
          <span className="pb-6 text-sm text-muted">No signature uploaded yet</span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Name
          <input name="name" defaultValue={name} required className="input" />
        </label>
        <label className="field">
          Title
          <input name="title" defaultValue={title} required className="input" />
        </label>
      </div>
      <label className="field">
        Signature image <span className="font-normal text-muted">(PNG or JPEG, under 500 KB)</span>
        <input name="signature" type="file" accept="image/png,image/jpeg,image/webp" className="input file:mr-3 file:rounded file:border-0 file:bg-paper file:px-2 file:py-1 file:text-sm file:font-semibold" />
      </label>
      <p className="text-xs text-muted">
        Sign in black ink on plain white paper and take a flat, well-lit photo, cropped close to the signature. The white
        paper blends into the card automatically.
      </p>
      {signature && (
        <label className="flex items-center gap-2 text-sm">
          <input name="remove" type="checkbox" className="h-4 w-4 accent-ndc-red" /> Remove the current signature
        </label>
      )}
      <Status state={state} />
      <button disabled={pending} className="btn btn-dark">{pending ? "Saving…" : "Save signatory"}</button>
    </form>
  );
}

export function FeeForm({ current, currency }: { current: string; currency: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateFee, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="field">
        New fee
        <span className="mt-1.5 flex items-stretch overflow-hidden rounded-md border border-line bg-white focus-within:border-ndc-green focus-within:ring-2 focus-within:ring-ndc-green/15">
          <span className="flex items-center border-r border-line bg-paper px-3 text-sm font-semibold text-muted">{currency}</span>
          <input
            name="fee"
            inputMode="decimal"
            defaultValue={current}
            required
            className="w-full px-3 py-2.5 font-normal text-ink outline-none"
            aria-describedby="fee-help"
          />
        </span>
      </label>
      <p id="fee-help" className="text-xs text-muted">
        Members only see the fee on the last registration step and at checkout. Changing it doesn&apos;t affect anyone who has already paid.
      </p>
      <Status state={state} />
      <button disabled={pending} className="btn btn-dark">{pending ? "Saving…" : "Save fee"}</button>
    </form>
  );
}
