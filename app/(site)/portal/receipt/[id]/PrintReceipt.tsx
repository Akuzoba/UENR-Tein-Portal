"use client";

import { Printer } from "lucide-react";

export default function PrintReceipt() {
  return (
    <button onClick={() => window.print()} className="btn btn-dark">
      <Printer className="h-4 w-4" /> Print or save receipt
    </button>
  );
}
