"use client";

import { Clipboard } from "lucide-react";
import { useState } from "react";

export function CopySummary({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="button ghost" onClick={copy} type="button" title="Copy report summary">
      <Clipboard size={16} />
      {copied ? "Copied" : "Copy summary"}
    </button>
  );
}
