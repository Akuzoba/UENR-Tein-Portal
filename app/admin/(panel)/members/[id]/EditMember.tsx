"use client";

import { useActionState } from "react";
import type { Member } from "@/lib/db";
import { PROGRAM_YEAR_OPTIONS } from "@/lib/config";
import ProgramPicker from "@/components/ProgramPicker";
import { updateMember, type FormState } from "../../../actions";

type Props = { m: Member; programs: string[]; periods: string[]; genders: string[] };

export default function EditMember({ m, programs, periods, genders }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateMember, {});
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="id" value={m.id} />
      <label className="field">
        Name
        <input name="name" defaultValue={m.name} required className="input" />
      </label>
      <label className="field">
        Student number <span className="font-normal text-muted">(reference or index)</span>
        <input name="student_id" defaultValue={m.student_id ?? ""} placeholder="e.g. UA2301542" className="input font-mono uppercase" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          Phone
          <input name="phone" defaultValue={m.phone} required className="input" />
        </label>
        <label className="field">
          Date of birth
          <input name="dob" type="date" defaultValue={m.dob ?? ""} className="input" />
        </label>
      </div>
      <label className="field">
        Email
        <input name="email" type="email" defaultValue={m.email ?? ""} className="input" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          Gender
          <select name="gender" defaultValue={m.gender ?? ""} className="input">
            <option value="">—</option>
            {genders.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="field">
          Study mode
          <select name="period" defaultValue={m.period} className="input">
            {periods.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <div>
        <label htmlFor="program" className="field">Program</label>
        <ProgramPicker id="program" name="program" programs={programs} defaultValue={m.program ?? ""} placeholder="Search programmes" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          Programme length
          <select name="program_years" defaultValue={m.program_years ?? ""} className="input">
            <option value="">—</option>
            {PROGRAM_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y} years</option>)}
          </select>
        </label>
        <label className="field">
          Level (at registration)
          <select name="level" defaultValue={m.level ?? ""} className="input">
            <option value="">—</option>
            {[1, 2, 3, 4, 5, 6].map((l) => <option key={l} value={l}>{l * 100}</option>)}
          </select>
        </label>
      </div>
      {m.valid_from && <p className="text-xs text-muted">Changing the length or level updates the end year of the card period.</p>}
      {state.error && <p className="rounded-md border-l-4 border-ndc-red bg-ndc-red/5 px-3 py-2 text-sm font-medium text-ndc-red">{state.error}</p>}
      {state.ok && <p className="rounded-md border-l-4 border-ndc-green bg-ndc-green/5 px-3 py-2 text-sm font-medium text-ndc-green">{state.ok}</p>}
      <button disabled={pending} className="btn btn-ghost w-full">{pending ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
