import { useState } from "react";
import { ResourceAttachment } from "../../types/chat";
import { Tooltip } from "../Tooltip";

interface ResourceCardsProps {
  attachments: ResourceAttachment[];
}

function getCleanTitle(title?: string, url?: string): string {
  if (title && !["view resource", "view pdf", "pdf", "link", "download", "view"].includes(title.trim().toLowerCase())) {
    return title;
  }
  if (!url) return "Campus Document";
  try {
    const filename = url.split("/").pop()?.split("?")[0] || "";
    if (filename) {
      const decoded = decodeURIComponent(filename);
      if (decoded.length > 3) return decoded;
    }
  } catch {
    // fallback
  }
  return "Verified Campus Document";
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

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (!lower.includes("youtube.com") && !lower.includes("youtu.be")) return null;

  // Clean iframe embed parameters (Hides clutter, logo overlays, related videos)
  const cleanParams = "modestbranding=1&rel=0&iv_load_policy=3&controls=1&color=white&showinfo=0";

  // 1. Direct Video ID match (11-character video ID e.g. aNVaQWh1Pp4)
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?${cleanParams}`;
  }

  // 2. Channel Handle Uploads List Embed (e.g. @msajce-topengineeringcolle4475)
  const handleMatch = url.match(/@([a-zA-Z0-9_-]+)/);
  if (handleMatch && handleMatch[1]) {
    const handle = handleMatch[1];
    return `https://www.youtube.com/embed?listType=user_uploads&list=${handle}&${cleanParams}`;
  }

  if (lower.includes("topengineeringcolle")) {
    return `https://www.youtube.com/embed?listType=user_uploads&list=msajce-topengineeringcolle4475&${cleanParams}`;
  }

  // 3. Fallback to official MSAJCE campus video embed (https://youtu.be/aNVaQWh1Pp4)
  return `https://www.youtube.com/embed/aNVaQWh1Pp4?${cleanParams}`;
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

  // Partition into visual media (images & videos) vs document file attachments
  const mediaItems = attachments.filter((item) => isImageUrl(item.url, item.resource_type) || isVideoUrl(item.url, item.resource_type));
  const fileItems = attachments.filter((item) => !isImageUrl(item.url, item.resource_type) && !isVideoUrl(item.url, item.resource_type));

  return (
    <div className="my-3.5 flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── 1. INLINE EDGE-TO-EDGE CAMPUS IMAGES & STREAMING YOUTUBE IFRAME ── */}
      {mediaItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Campus Media ({mediaItems.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {mediaItems.map((item, idx) => {
              const isImg = isImageUrl(item.url, item.resource_type);
              const ytEmbed = getYouTubeEmbedUrl(item.url);
              const fullUrl = item.url.startsWith("http") ? item.url : `https://${item.url}`;

              // YouTube Embedded Player with Clean UI & Channel Link Button
              if (ytEmbed) {
                const isChannel = item.url.includes("@") || item.url.includes("channel") || item.url.includes("topengineeringcolle");
                const channelUrl = item.url.startsWith("http") ? item.url : "https://www.youtube.com/@msajce-topengineeringcolle4475";

                return (
                  <div key={item.url + idx} className="flex flex-col gap-2 w-full">
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-line/70 shadow-md bg-black">
                      <iframe
                        src={ytEmbed}
                        title="MSAJCE Official Campus Video"
                        className="w-full h-full border-0 rounded-2xl"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    {isChannel && (
                      <a
                        href={channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-between px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-500 text-xs font-semibold transition-all group"
                      >
                        <span className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <span>Visit Official Channel: @msajce-topengineeringcolle4475</span>
                        </span>
                        <span className="text-[10px] opacity-70 group-hover:translate-x-0.5 transition-transform">↗</span>
                      </a>
                    )}
                  </div>
                );
              }

              // Full Edge-to-Edge Image View (No filenames or bottom text bars)
              if (isImg) {
                return (
                  <div key={item.url + idx} className="relative w-full rounded-2xl overflow-hidden border border-line/70 shadow-sm bg-inset group">
                    <img
                      src={fullUrl}
                      alt="Campus Photo"
                      className="w-full h-52 sm:h-60 object-cover rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://msajce-edu.in/images/logo.png";
                      }}
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

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
