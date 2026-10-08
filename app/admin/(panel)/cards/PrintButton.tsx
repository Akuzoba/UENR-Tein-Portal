"use client";

import { Printer } from "lucide-react";
import { logBulkPrint } from "../../actions";

export default function PrintButton({ search, memberIds }: { search: string; memberIds: string[] }) {
  return (
    <button
      onClick={() => {
        logBulkPrint(search, memberIds).catch(() => {}); // the log entry must never stop the print
        window.print();
      }}
      disabled={memberIds.length === 0}
      className="btn btn-dark"
    >
      <Printer className="h-4 w-4" /> Print all cards
    </button>
  );
}
