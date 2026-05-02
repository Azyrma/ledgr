"use client";

import { useEffect, useRef, useState } from "react";
import { buildCategoryNodeMap, getCategoryPath, type FlatCat } from "@/lib/categories";
import { CATEGORY_ICON_MAP } from "./CategoryModal";

const DEFAULT_CAT_COLOR = "#A89080";

type Option = {
  value: string;
  label: string;
  path: string;
  depth: number;
  isLeaf: boolean;
  color: string | null;
  icon: string | null;
};
export type Section = { label: string; options: Option[] };
export type TransferAccount = { id: number; name: string; color: string | null };

type Props = {
  onSelect: (category: string) => void;
  onClose: () => void;
  direction?: "up" | "down";
  sections?: Section[];
  transferAccounts?: TransferAccount[];
};

export function buildSections(cats: FlatCat[]): Section[] {
  const map = buildCategoryNodeMap(cats);

  function collect(
    id: number,
    depth = 0,
    inheritedColor: string | null = null,
    inheritedIcon: string | null = null,
  ): Option[] {
    const node = map.get(id);
    if (!node) return [];
    if (node.is_system) {
      return node.children.flatMap((c) => collect(c.id, depth, inheritedColor, inheritedIcon));
    }
    const path = getCategoryPath(id, map);
    const color = node.color ?? inheritedColor;
    const icon = node.icon ?? inheritedIcon;
    const userChildren = node.children.filter((c) => !c.is_system);
    const isLeaf = userChildren.length === 0;
    return [
      { value: path, label: node.name, path, depth, isLeaf, color, icon },
      ...node.children.flatMap((c) => collect(c.id, depth + 1, color, icon)),
    ];
  }

  return [
    { label: "Income",           options: collect(1) },
    { label: "Expenses · Needs", options: collect(3) },
    { label: "Expenses · Wants", options: collect(4) },
    { label: "Savings",          options: collect(5) },
  ].filter((s) => s.options.length > 0);
}

export default function SetCategoryPopover({ onSelect, onClose, direction = "up", sections: sectionsProp, transferAccounts: accountsProp }: Props) {
  const [fetchedSections, setFetchedSections] = useState<Section[]>([]);
  const [fetchedAccounts, setFetchedAccounts] = useState<TransferAccount[]>([]);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const sections = sectionsProp ?? fetchedSections;
  const accounts = accountsProp ?? fetchedAccounts;

  useEffect(() => {
    if (sectionsProp) return;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: FlatCat[]) => setFetchedSections(buildSections(data)));
  }, [sectionsProp]);

  useEffect(() => {
    if (accountsProp) return;
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: TransferAccount[]) => setFetchedAccounts(Array.isArray(data) ? data : []));
  }, [accountsProp]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !e.composedPath().includes(ref.current)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const q = search.toLowerCase();
  const filteredSections = sections
    .map((s) => ({ ...s, options: s.options.filter((o) => o.path.toLowerCase().includes(q)) }))
    .filter((s) => s.options.length > 0);
  const filteredAccounts = accounts.filter((a) =>
    `transfer: ${a.name}`.toLowerCase().includes(q)
  );
  const showUncategorise = "uncategorise".includes(q);
  const hasAny = showUncategorise || filteredSections.length > 0 || filteredAccounts.length > 0;

  return (
    <div
      ref={ref}
      className={`absolute z-30 w-64 rounded-xl border border-base-300 bg-base-100 shadow-xl ${
        direction === "up"
          ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
          : "top-full mt-1 left-0"
      }`}
    >
      <div className="border-b border-base-300 p-2">
        <input
          type="text"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="input input-sm input-ghost w-full"
        />
      </div>

      <div className="max-h-56 overflow-y-auto py-1">
        {!hasAny && (
          <p className="px-3 py-2 text-xs text-base-content/40">No categories found</p>
        )}

        {showUncategorise && (
          <button
            onClick={() => onSelect("")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-warning hover:bg-base-200"
          >
            <span className="text-base-content/30">✕</span>
            Uncategorise
          </button>
        )}

        {(search ? filteredSections : sections).map((section, i) => (
          <div key={section.label}>
            {(i > 0 || showUncategorise) && <hr className="border-base-300 my-1" />}
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-base-content/40">
              {section.label}
            </p>
            {section.options.map((o) => {
              const color = o.color ?? DEFAULT_CAT_COLOR;
              const Icon = o.icon ? CATEGORY_ICON_MAP[o.icon] : null;
              const paddingLeft = `${12 + o.depth * 12}px`;

              if (!o.isLeaf) {
                return (
                  <p
                    key={o.value}
                    className="py-1 pr-3 text-xs font-semibold uppercase tracking-wide text-base-content/50"
                    style={{ paddingLeft }}
                    title={o.path}
                  >
                    {search ? o.path : o.label}
                  </p>
                );
              }

              return (
                <button
                  key={o.value}
                  onClick={() => onSelect(o.value)}
                  className="flex w-full items-center py-1 pr-3 text-left text-sm hover:bg-base-200"
                  style={{ paddingLeft }}
                  title={o.path}
                >
                  <span
                    className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-1.5 py-0.5"
                    style={{ backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
                  >
                    {Icon
                      ? <Icon size={11} color={color} strokeWidth={2} className="shrink-0" />
                      : <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    }
                    <span className="truncate text-xs font-medium" style={{ color }}>
                      {search ? o.path : o.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {filteredAccounts.length > 0 && (
          <div>
            <hr className="border-base-300 my-1" />
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-base-content/40">Transfers</p>
            {filteredAccounts.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(`Transfer: ${a.name}`)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-base-200"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color ?? "#6366f1" }}
                />
                {a.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
