import { useState } from "react";
import { ResourceAttachment } from "../../types/chat";
import { Tooltip } from "../Tooltip";

interface ResourceCardsProps {
  attachments: ResourceAttachment[];
}

function getCleanTitle(title?: string, url?: string): string {
  let name = title;
  if (!name || ["view resource", "view pdf", "pdf", "link", "download", "view"].includes(name.trim().toLowerCase())) {
    if (!url) return "Campus Document";
    try {
      const filename = url.split("/").pop()?.split("?")[0] || "";
      if (filename) {
        name = decodeURIComponent(filename);
      }
    } catch {
      name = "Campus Document";
    }
  }
  // Strip any file extensions (.md, .pdf, .txt, .html, etc.)
  name = (name || "Campus Document").replace(/\.[a-zA-Z0-9]+$/gi, "");
  // Remove msajce_ or msajce- prefix
  name = name.replace(/^msajce[_-]/i, "");
  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]+/g, " ").trim();
  // Capitalize title
  return name.replace(/\b\w/g, (l) => l.toUpperCase());
}

function isImageUrl(url: string, type?: string): boolean {
  if (type === "image") return true;
  const clean = url.toLowerCase().split("?")[0];
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((ext) => clean.endsWith(ext));
}

function isVideoUrl(url: string, type?: string): boolean {
  if (type === "video") return true;
  const clean = url.toLowerCase();
  return ["youtube.com", "youtu.be", "vimeo.com", ".mp4", ".webm", "topengineeringcolle", "msajce"].some((v) => clean.includes(v));
}

export default function ResourceCards({ attachments }: ResourceCardsProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const handleCopy = (url: string) => {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1800);
  };

  // Only keep document file attachments (Campus Media is completely removed as requested)
  const fileItems = attachments.filter((item) => !isImageUrl(item.url, item.resource_type) && !isVideoUrl(item.url, item.resource_type));

  if (fileItems.length === 0) return null;

  return (
    <div className="my-3.5 flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">


      {/* ── 2. OFFICIAL CAMPUS PDFS & DOCUMENTS (SINGLE HORIZONTAL ROW, OPEN IN NEW TAB) ── */}
      {fileItems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <span>Campus Attachments & Direct Links ({fileItems.length})</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto flex-nowrap pb-1.5 pt-0.5 scrollbar-none w-full max-w-full">
            {fileItems.map((item, idx) => {
              const fullUrl = item.url.startsWith("http") ? item.url : `https://${item.url}`;
              const isCopied = copiedUrl === item.url;
              const cleanTitle = getCleanTitle(item.title, item.url);
              const isPdf = item.resource_type === "pdf" || item.url.toLowerCase().endsWith(".pdf");

              return (
                <div
                  key={item.url + idx}
                  className="group flex items-center gap-1.5 rounded-xl bg-surface/95 border border-line px-2 py-1.5 shadow-hairline hover:shadow-sm hover:border-accent/40 transition-all shrink-0 flex-nowrap"
                  title={cleanTitle}
                >
                  {/* Red Adobe PDF Logo Badge */}
                  {isPdf ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/25 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#DC2626" fillOpacity="0.15" stroke="#DC2626" strokeWidth="1.8"/>
                        <path d="M14 2V8H20" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="6" y="12" width="12" height="7" rx="1.5" fill="#DC2626" />
                        <text x="7" y="17.2" fill="#FFFFFF" fontSize="5.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.3">PDF</text>
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 border border-accent/20 text-accent shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </div>
                  )}

                  {/* Document Title */}
                  <Tooltip content={cleanTitle} position="top">
                    <span className="truncate font-semibold text-[11.5px] text-ink max-w-[90px] sm:max-w-[110px]">
                      {cleanTitle}
                    </span>
                  </Tooltip>

                  {/* Copy Link Button */}
                  <Tooltip content={isCopied ? "Copied!" : "Copy Direct Link"} position="top">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.url)}
                      className="p-1 rounded text-ink-3 hover:text-ink hover:bg-hover transition-colors shrink-0"
                    >
                      {isCopied ? (
                        <span className="text-emerald-600 font-bold text-xs">✓</span>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="12" height="12" rx="2.5" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </Tooltip>

                  {/* Open in New Tab Button (Icon Only) */}
                  <Tooltip content={`Open ${cleanTitle}`} position="top">
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-white bg-accent hover:bg-accent/90 transition-all shadow-sm shrink-0"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
