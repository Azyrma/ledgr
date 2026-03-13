"use client";

import { useEffect, useRef, useState } from "react";

type FlatCategory = {
  id: number;
  name: string;
  parent_id: number | null;
  is_system: number;
};

type Account = { id: number; name: string; color: string | null };

type Option = { value: string; label: string; path: string; depth: number };
type Section = { label: string; options: Option[] };

type Props = {
  onSelect: (category: string) => void;
  onClose: () => void;
  direction?: "up" | "down";
};

// Root system nodes excluded from paths; Needs(3) and Wants(4) are kept so paths are globally unique
const SYSTEM_IDS = new Set([1, 2, 5]);

function buildSections(cats: FlatCategory[]): Section[] {
  const map = new Map<number, FlatCategory & { children: FlatCategory[] }>();
  cats.forEach((c) => map.set(c.id, { ...c, children: [] }));
  map.forEach((node) => {
    if (node.parent_id !== null) map.get(node.parent_id)?.children.push(node);
  });

  function getPath(id: number): string {
    const parts: string[] = [];
    let cur = map.get(id);
    while (cur) {
      if (!SYSTEM_IDS.has(cur.id)) parts.unshift(cur.name);
      cur = cur.parent_id !== null ? map.get(cur.parent_id) : undefined;
    }
    return parts.join(": ");
  }

  function collect(id: number, depth = 0): Option[] {
    const node = map.get(id);
    if (!node) return [];
    if (node.is_system) {
      // Don't emit system nodes; walk their children at the same depth
      return node.children.flatMap((c) => collect(c.id, depth));
    }
    return [
      { value: getPath(id), label: node.name, path: getPath(id), depth },
      ...node.children.flatMap((c) => collect(c.id, depth + 1)),
    ];
  }

  return [
    { label: "Income",           options: collect(1) },
    { label: "Expenses · Needs", options: collect(3) },
    { label: "Expenses · Wants", options: collect(4) },
    { label: "Savings",          options: collect(5) },
  ].filter((s) => s.options.length > 0);
}

export default function SetCategoryPopover({ onSelect, onClose, direction = "up" }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch]     = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: FlatCategory[]) => setSections(buildSections(data)));
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: Account[]) => setAccounts(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
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
      className={`absolute z-30 w-64 rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900 ${
        direction === "up"
          ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
          : "top-full mt-1 left-0"
      }`}
    >
      <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
        <input
          type="text"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="w-full rounded-md bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500"
        />
      </div>

      <div className="max-h-56 overflow-y-auto py-1">
        {!hasAny && (
          <p className="px-3 py-2 text-xs text-zinc-400">No categories found</p>
        )}

        {showUncategorise && (
          <button
            onClick={() => onSelect("")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-500 hover:bg-zinc-50 dark:text-amber-400 dark:hover:bg-zinc-800"
          >
            <span className="text-zinc-300 dark:text-zinc-600">✕</span>
            Uncategorise
          </button>
        )}

        {(search ? filteredSections : sections).map((section, i) => (
          <div key={section.label}>
            {(i > 0 || showUncategorise) && (
              <div className="mx-3 my-1 border-t border-zinc-100 dark:border-zinc-800" />
            )}
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {section.label}
            </p>
            {section.options.map((o) => (
              <button
                key={o.value}
                onClick={() => onSelect(o.value)}
                className="flex w-full items-center gap-2 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                style={{ paddingLeft: `${12 + o.depth * 12}px` }}
              >
                {o.depth > 0 && <span className="text-zinc-300 dark:text-zinc-600">└</span>}
                {search ? <span className="truncate">{o.path}</span> : o.label}
              </button>
            ))}
          </div>
        ))}

        {filteredAccounts.length > 0 && (
          <>
            <div className="mx-3 my-1 border-t border-zinc-100 dark:border-zinc-800" />
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Transfers
            </p>
            {filteredAccounts.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(`Transfer: ${a.name}`)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color ?? "#6366f1" }}
                />
                {a.name}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
