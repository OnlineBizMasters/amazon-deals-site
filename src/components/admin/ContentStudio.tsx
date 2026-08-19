"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";
import Badge from "@/components/ui/Badge";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import type { ContentPack, GeneratedContent } from "@/lib/content/generate";

/**
 * Content studio for a single deal.
 *
 * The templates are generated on the server from stored deal fields only. This
 * component just reveals them, lets an editor copy each block, and shows the facts
 * used plus the warnings that apply.
 */

function packText(pack: ContentPack): string {
  return pack.sections
    .map((section) => {
      const body = Array.isArray(section.value)
        ? section.value.map((line) => `- ${line}`).join("\n")
        : section.value;
      return `## ${section.label}\n${body}`;
    })
    .join("\n\n");
}

export default function ContentStudio({ content }: { content: GeneratedContent }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(content.packs[0]?.platform ?? "YOUTUBE");

  if (!open) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Generate Content</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Build YouTube, Shorts, TikTok and Facebook Reels templates from this deal&apos;s stored
              data.
            </p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className={primaryButtonClass}>
            Generate Content
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Content Potential: <strong className="text-slate-700">{content.contentPotentialScore}/100</strong>
          . Templates use only fields stored on this record — nothing is invented.
        </p>
      </div>
    );
  }

  const pack = content.packs.find((candidate) => candidate.platform === active) ?? content.packs[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Generated content</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Built from stored deal data only. Review before publishing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="brand">Content Potential {content.contentPotentialScore}/100</Badge>
          <button type="button" onClick={() => setOpen(false)} className={secondaryButtonClass}>
            Hide
          </button>
        </div>
      </div>

      {content.warnings.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-bold text-amber-900">Before you publish</p>
          <ul className="mt-1.5 space-y-1 text-sm text-amber-900">
            {content.warnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <span aria-hidden="true">•</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Stored data used
        </p>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {content.facts.map((fact) => (
            <div key={fact.label} className="flex gap-1.5">
              <dt className="text-slate-500">{fact.label}:</dt>
              <dd className="font-medium text-slate-800">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {content.missingData.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Not stored (and therefore omitted from the templates):{" "}
            <span className="font-medium text-slate-700">{content.missingData.join(", ")}</span>. Fill
            these in on the deal to get stronger content.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 px-5 py-3">
        {content.packs.map((candidate) => (
          <button
            key={candidate.platform}
            type="button"
            onClick={() => setActive(candidate.platform)}
            aria-pressed={candidate.platform === active}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              candidate.platform === active
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      {pack && (
        <div className="space-y-5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-600">
              Tracked link for this platform:{" "}
              <code className="font-mono text-[11px] text-slate-800">{pack.trackedUrl}</code>
            </p>
            <div className="flex gap-2">
              <CopyButton value={pack.trackedUrl} label="Copy link" />
              <CopyButton value={packText(pack)} label="Copy everything" />
            </div>
          </div>

          {pack.sections.map((section) => {
            const text = Array.isArray(section.value)
              ? section.value.join("\n")
              : section.value;

            return (
              <div key={section.key}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{section.label}</h3>
                  <CopyButton value={text} />
                </div>
                {section.hint && <p className="mt-0.5 text-xs text-slate-500">{section.hint}</p>}

                {Array.isArray(section.value) ? (
                  <ul className="mt-2 space-y-1.5">
                    {section.value.map((line, index) => (
                      <li
                        key={`${section.key}-${index}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                      >
                        <span className="whitespace-pre-wrap">{line}</span>
                        <CopyButton value={line} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-sans text-sm text-slate-800">
                    {section.value}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
