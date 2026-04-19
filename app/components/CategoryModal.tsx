"use client";

import { useState } from "react";
import {
  Home, ShoppingCart, Coffee, Car, Plane, Train, Bike, Bus,
  Heart, Activity, Hospital, Pill,
  Music, Film, Book, Gamepad2,
  Smartphone, Laptop, Tv, Globe,
  Briefcase, Star, Gift, Package,
  Wallet, CreditCard, Building2, TrendingUp,
  Wrench, Zap, Key, Scissors,
  Leaf, Sun, Umbrella, Dog,
  GraduationCap, Camera, Headphones, Utensils,
  Shirt, ShoppingBag, Dumbbell, Baby,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_COLORS = [
  { hex: "#C96A50", label: "Terracotta" },
  { hex: "#D4825A", label: "Burnt Orange" },
  { hex: "#E8956D", label: "Peach" },
  { hex: "#E8C070", label: "Amber" },
  { hex: "#C8AA70", label: "Muted Gold" },
  { hex: "#B5A96E", label: "Warm Olive" },
  { hex: "#95B85A", label: "Moss" },
  { hex: "#7A9E7E", label: "Sage" },
  { hex: "#90C0A8", label: "Mint" },
  { hex: "#6A9E96", label: "Teal" },
  { hex: "#7A95B0", label: "Dusty Blue" },
  { hex: "#85A0C8", label: "Periwinkle" },
  { hex: "#8B8EC4", label: "Lavender" },
  { hex: "#A87AB0", label: "Mauve" },
  { hex: "#C4857A", label: "Dusty Rose" },
  { hex: "#E0A0A0", label: "Blush" },
  { hex: "#C8A090", label: "Salmon" },
  { hex: "#A89080", label: "Warm Taupe" },
  { hex: "#B07060", label: "Clay" },
  { hex: "#9E8070", label: "Umber" },
];

export type IconId = string;

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  cart: ShoppingCart,
  coffee: Coffee,
  car: Car,
  plane: Plane,
  train: Train,
  bike: Bike,
  bus: Bus,
  heart: Heart,
  activity: Activity,
  hospital: Hospital,
  pill: Pill,
  music: Music,
  film: Film,
  book: Book,
  gamepad: Gamepad2,
  phone: Smartphone,
  laptop: Laptop,
  tv: Tv,
  globe: Globe,
  briefcase: Briefcase,
  star: Star,
  gift: Gift,
  package: Package,
  wallet: Wallet,
  card: CreditCard,
  bank: Building2,
  trending: TrendingUp,
  wrench: Wrench,
  zap: Zap,
  key: Key,
  scissors: Scissors,
  leaf: Leaf,
  sun: Sun,
  umbrella: Umbrella,
  dog: Dog,
  education: GraduationCap,
  camera: Camera,
  headphones: Headphones,
  food: Utensils,
  shirt: Shirt,
  bag: ShoppingBag,
  gym: Dumbbell,
  baby: Baby,
};

const ICON_IDS = Object.keys(CATEGORY_ICON_MAP);

export function CategoryIcon({
  iconId,
  color,
  size = 28,
}: {
  iconId: string | null;
  color: string;
  size?: number;
}) {
  const Icon = iconId ? CATEGORY_ICON_MAP[iconId] : null;
  const iconSize = Math.round(size * 0.52);
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28), flexShrink: 0,
      background: `${color}22`,
      display: "grid", placeItems: "center",
    }}>
      {Icon
        ? <Icon size={iconSize} color={color} strokeWidth={1.8} />
        : <Wallet size={iconSize} color={color} strokeWidth={1.8} />
      }
    </div>
  );
}

type Props = {
  parentId: number;
  parentName: string;
  initial?: { id: number; name: string; color?: string | null; icon?: string | null };
  onClose: () => void;
  onSaved: () => void;
};

export default function CategoryModal({ parentId, parentName, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial;
  const [name,   setName]   = useState(initial?.name  ?? "");
  const [color,  setColor]  = useState(initial?.color ?? CATEGORY_COLORS[0].hex);
  const [icon,   setIcon]   = useState<IconId>(initial?.icon ?? ICON_IDS[0]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required."); return; }

    setSaving(true);
    try {
      const url    = isEdit ? `/api/categories/${initial!.id}` : "/api/categories";
      const method = isEdit ? "PUT" : "POST";
      const body   = isEdit
        ? { name, color, icon }
        : { name, parent_id: parentId, color, icon };

      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box" style={{ maxWidth: 420, padding: 0, borderRadius: 16, overflow: "hidden", background: "var(--surface)", border: "1px solid var(--hair)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", gap: 14 }}>
          <CategoryIcon iconId={icon} color={color} size={40} />
          <div style={{ flex: 1 }}>
            <div className="display-serif" style={{ fontSize: 17 }}>
              {isEdit ? "Edit category" : "New category"}
            </div>
            {!isEdit && (
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Under: {parentName}</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              Name
            </label>
            <input
              type="text"
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
                border: "1px solid var(--hair-2)", background: "var(--surface)",
                color: "var(--ink)", outline: "none", boxSizing: "border-box",
              }}
            />
            {error && <p style={{ marginTop: 6, fontSize: 12, color: "var(--neg)" }}>{error}</p>}
          </div>

          {/* Color palette */}
          <div style={{ marginBottom: 20 }}>
            <label className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
              Color
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.hex)}
                  style={{
                    width: 26, height: 26, borderRadius: 6, border: "none",
                    background: c.hex, cursor: "pointer", position: "relative",
                    outline: color === c.hex ? `2.5px solid ${c.hex}` : "2.5px solid transparent",
                    outlineOffset: 2,
                  }}
                >
                  {color === c.hex && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div style={{ marginBottom: 20 }}>
            <label className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
              Icon
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 148, overflowY: "auto", padding: "2px 0" }}>
              {ICON_IDS.map((id) => {
                const Icon = CATEGORY_ICON_MAP[id];
                const selected = icon === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={id}
                    onClick={() => setIcon(id)}
                    style={{
                      width: 34, height: 34, borderRadius: 8,
                      border: `1px solid ${selected ? color : "var(--hair)"}`,
                      background: selected ? `${color}22` : "var(--surface-2)",
                      cursor: "pointer", display: "grid", placeItems: "center",
                    }}
                  >
                    <Icon size={16} color={selected ? color : "var(--ink-3)"} strokeWidth={1.8} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-sm btn-primary">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add category"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
