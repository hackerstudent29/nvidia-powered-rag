import { SourceItem } from "../../types/chat";
import { Tooltip } from "../Tooltip";
const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%231f7a5f'/%3E%3Cpath d='M20 36c0 7 5.4 12 12 12s12-5 12-12H20Z' fill='%23fff'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23bff3dd'/%3E%3Cpath d='M24 24c4-7 13-7 17 0' fill='none' stroke='%231f7a5f' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E";

export function getDomainFromUrl(url: string): string {
  try {
    if (!url.startsWith("http")) return "msajce-edu.in";
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "msajce-edu.in";
  }
}

interface SourceChipProps {
  source: SourceItem;
  index?: number;
}

export default function SourceChip({ source }: SourceChipProps) {
  const domain = source.domain || getDomainFromUrl(source.page_url);
  const href = source.page_url.startsWith("http") ? source.page_url : `https://${source.page_url}`;

  return (
    <Tooltip content={`${source.title} (${domain})`} position="top">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="ml-1 mr-1 inline-flex h-5 translate-y-[-1px] items-center gap-1 rounded-[5px]
          bg-inset pr-1.5 pl-[3px] align-middle font-mono text-[10.5px] text-ink-2 shadow-hairline
          transition-colors duration-150 hover:bg-hover hover:text-ink hover:border-accent"
        style={{ animation: "pop-in 250ms cubic-bezier(0.23,1,0.32,1) both" }}
      >
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          className="size-3.5 rounded-[3px] bg-surface object-cover"
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
          }}
        />
        <span className="max-w-[120px] truncate">{source.title}</span>
      </a>
    </Tooltip>
  );
}
