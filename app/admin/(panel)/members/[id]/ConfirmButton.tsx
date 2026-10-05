"use client";

import { useFormStatus } from "react-dom";

export default function ConfirmButton({ message, className, children }: { message: string; className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
