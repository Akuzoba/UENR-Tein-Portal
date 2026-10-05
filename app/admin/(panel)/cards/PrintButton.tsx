"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ disabled }: { disabled?: boolean }) {
  return (
    <button onClick={() => window.print()} disabled={disabled} className="btn btn-dark">
      <Printer className="h-4 w-4" /> Print all cards
    </button>
  );
}
