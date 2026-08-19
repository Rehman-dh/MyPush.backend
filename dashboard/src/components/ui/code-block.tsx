"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A copy-pasteable code block with a copy-to-clipboard button and "Copied!"
 * feedback. Dependency-free (no syntax highlighting) — a muted monospace block.
 */
export function CodeBlock({
  code,
  language,
  className,
}: {
  code: string;
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <div className={cn("group relative", className)}>
      {language && (
        <span className="absolute left-3 top-2 select-none text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {language}
        </span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border bg-background/80 px-2 py-1 text-xs text-muted-foreground opacity-0 transition hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-green-600" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </>
        )}
      </button>
      <pre
        className={cn(
          "overflow-x-auto rounded-lg bg-muted p-4 text-sm leading-relaxed",
          language && "pt-7"
        )}
      >
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
