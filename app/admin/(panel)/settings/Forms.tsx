"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Search, ShieldCheck, X } from "lucide-react";
import { searchPrograms } from "@/components/ProgramPicker";
import type { AdminSummary } from "@/lib/db";
import { addAdmin, addPrograms, changePassword, removeProgram, setAdminActive, setAdminRole, updateFee, updateSignatory, type FormState } from "../../actions";

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

export type RoleOption = { key: string; label: string; about: string };

export function AddAdminForm({ roles }: { roles: RoleOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addAdmin, {});
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-2">
        <input name="username" required placeholder="Username" autoComplete="off" className="input mt-0 min-w-40 flex-1" />
        <input name="password" type="password" required minLength={8} placeholder="Temporary password" autoComplete="new-password" className="input mt-0 min-w-40 flex-1" />
        <select name="role" required defaultValue="" aria-label="Role" className="input mt-0 w-auto min-w-44">
          <option value="" disabled>Choose a role</option>
          {roles.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <button disabled={pending} className="btn btn-dark">{pending ? "Adding…" : "Add admin"}</button>
      </div>
      <Status state={state} />
    </form>
  );
}

/** One admin in Settings: role, last sign-in, change role, deactivate or reactivate. */
export function AdminRow({
  admin: a,
  added,
  lastLogin,
  isMe,
  roles,
}: {
  admin: AdminSummary;
  added: string;
  lastLogin: string;
  isMe: boolean;
  roles: RoleOption[];
}) {
  const [roleState, roleAction, rolePending] = useActionState<FormState, FormData>(setAdminRole, {});
  const [activeState, activeAction, activePending] = useActionState<FormState, FormData>(setAdminActive, {});
  const [role, setRole] = useState<string>(a.role);
  const disabled = a.disabled_at !== null;
  const latest = activeState.error || activeState.ok ? activeState : roleState;
  return (
    <li className={`py-3 ${disabled ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white uppercase ${disabled ? "bg-muted" : "bg-ndc-green"}`}>
          {a.username[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {a.username}
            {isMe && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}
          </div>
          <div className="text-xs text-muted">Added {added} · Last sign-in {lastLogin}</div>
        </div>
        {disabled ? (
          <span className="badge badge-pending">deactivated</span>
        ) : a.must_change ? (
          <span className="badge badge-pending">temporary password</span>
        ) : (
          <span className="badge badge-paid"><ShieldCheck className="h-3 w-3" /> active</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
        <form action={roleAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={a.id} />
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isMe || disabled}
            aria-label={`Role for ${a.username}`}
            className="input mt-0 w-auto py-1.5 text-sm"
          >
            {roles.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
          {role !== a.role && (
            <button disabled={rolePending} className="btn btn-dark px-3 py-1.5 text-sm">{rolePending ? "Saving…" : "Save role"}</button>
          )}
        </form>
        {!isMe && (
          <form
            action={activeAction}
            onSubmit={(e) => {
              if (!disabled && !confirm(`Deactivate ${a.username}? They will be signed out and can't sign in until reactivated.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="active" value={disabled ? "1" : "0"} />
            <button
              disabled={activePending}
              className={`btn px-3 py-1.5 text-sm ${disabled ? "btn-ghost" : "btn-ghost text-ndc-red hover:bg-ndc-red/10"}`}
            >
              {activePending ? "Working…" : disabled ? "Reactivate" : "Deactivate"}
            </button>
          </form>
        )}
        {isMe && <span className="text-xs text-muted">Another super admin can change your role.</span>}
      </div>
      {(latest.error || latest.ok) && (
        <div className="mt-2 pl-12">
          <Status state={latest} />
        </div>
      )}
    </li>
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

export function ProgramsForm({ programs }: { programs: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addPrograms, {});
  const ref = useResetOnSuccess(state);
  const [q, setQ] = useState("");
  const shown = searchPrograms(programs, q);
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder={`Search ${programs.length} programmes`}
            aria-label="Search programmes"
            className="input mt-0 pl-9"
          />
        </div>
        <ul className="mt-2 max-h-80 divide-y divide-line overflow-auto rounded-md border border-line">
          {shown.map((p) => (
            <li key={p} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">{p}</span>
              <form action={removeProgram}>
                <input type="hidden" name="name" value={p} />
                <button className="rounded-md p-1.5 text-muted transition-colors hover:bg-ndc-red/10 hover:text-ndc-red" aria-label={`Remove ${p}`}>
                  <X className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
          {!shown.length && <li className="px-3 py-6 text-center text-sm text-muted">{q ? `No programme matches “${q}”` : "No programmes yet"}</li>}
        </ul>
        {q && shown.length > 0 && <p className="mt-2 text-xs text-muted">Showing {shown.length} of {programs.length}</p>}
      </div>
      <form ref={ref} action={action} className="space-y-3">
        <label className="field">
          Add programmes
          <textarea name="names" rows={5} required placeholder={"BSc Computer Science\nBSc Nursing"} className="input resize-y" />
        </label>
        <p className="text-xs text-muted">
          One per line, so you can paste a whole list at once. Removing a programme only takes it off the registration form;
          members already registered under it keep it.
        </p>
        <Status state={state} />
        <button disabled={pending} className="btn btn-dark">{pending ? "Adding…" : "Add to list"}</button>
      </form>
    </div>
  );
}
