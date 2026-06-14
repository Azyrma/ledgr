import { CATEGORY_ICON_MAP } from "@/app/components/CategoryModal";

export default function TagPill({ color, icon, label, onClick }: { color: string; icon: string | null; label: string; onClick?: () => void }) {
  const Icon = icon ? CATEGORY_ICON_MAP[icon] : null;
  return (
    <div
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 ${onClick ? "cursor-pointer transition-opacity hover:opacity-70" : ""}`}
      style={{ backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
    >
      {Icon
        ? <Icon size={10} color={color} strokeWidth={2} className="shrink-0" />
        : <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      }
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}
