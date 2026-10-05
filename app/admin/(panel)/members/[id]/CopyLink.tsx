"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="btn btn-ghost"
      title={url}
    >
      <span key={String(copied)} className="anim-fade flex items-center gap-2">
        {copied ? <Check className="h-4 w-4 text-ndc-green" /> : <Link2 className="h-4 w-4" />}
        {copied ? "Copied" : "Copy receipt link"}
      </span>
    </button>
  );
}
