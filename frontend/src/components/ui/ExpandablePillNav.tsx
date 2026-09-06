import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  onClick?: () => void;
}

interface ExpandablePillNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
  labelWidth?: number;
}

export const ExpandablePillNav: React.FC<ExpandablePillNavProps> = ({
  items,
  activeId,
  onSelect,
  className,
  labelWidth = 84,
}) => {
  return (
    <motion.nav
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Expandable Navigation"
      className={cn(
        "rounded-full flex items-center p-1.5 shadow-lg border backdrop-blur-2xl transition-colors duration-300 space-x-1",
        "bg-surface/90 border-line text-ink dark:bg-[#14151a]/90 dark:border-white/[0.08] dark:text-[#f4f3ee]",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;

        return (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => {
              if (item.onClick) item.onClick();
              onSelect(item.id);
            }}
            type="button"
            className={cn(
              "flex items-center gap-0 px-3 py-2 rounded-full transition-all duration-200 relative h-9 min-w-[38px] cursor-pointer overflow-hidden",
              isActive
                ? "bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 font-bold shadow-md"
                : "bg-transparent text-ink-3 dark:text-[#b1ada1] hover:bg-hover dark:hover:bg-white/[0.06] hover:text-ink dark:hover:text-[#f4f3ee]"
            )}
            aria-label={item.label}
          >
            <Icon
              size={18}
              strokeWidth={isActive ? 2.3 : 1.8}
              className="shrink-0 transition-transform duration-200"
            />

            <motion.div
              initial={false}
              animate={{
                width: isActive ? `${labelWidth}px` : "0px",
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? "6px" : "0px",
              }}
              transition={{
                width: { type: "spring", stiffness: 350, damping: 30 },
                opacity: { duration: 0.18 },
                marginLeft: { duration: 0.18 },
              }}
              className="overflow-hidden flex items-center whitespace-nowrap"
            >
              <span
                className={cn(
                  "font-medium text-xs whitespace-nowrap select-none transition-opacity duration-200 truncate",
                  isActive
                    ? "text-white dark:text-zinc-950 font-bold"
                    : "opacity-0"
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </motion.div>

            {item.badge !== undefined && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-400 text-zinc-950">
                {item.badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </motion.nav>
  );
};
