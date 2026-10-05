"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { login, type FormState } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="field">
        Username
        <input name="username" required autoComplete="username" className="input" autoFocus />
      </label>
      <label className="field">
        Password
        <span className="relative block">
          <input name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="input pr-10" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-3 mt-[3px] -translate-y-1/2 text-muted hover:text-ink"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>
      {state.error && !pending && (
        <p role="alert" className="anim-shake rounded-md border-l-4 border-ndc-red bg-ndc-red/5 px-3 py-2 text-sm font-medium text-ndc-red">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn btn-primary w-full py-3 text-base">
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
      </button>
    </form>
  );
}
