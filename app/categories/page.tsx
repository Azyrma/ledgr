"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CategoryModal, { CategoryIcon, CATEGORY_ICON_MAP } from "../components/CategoryModal";
import GroupModal from "../components/GroupModal";
import PageHeader, { SplitTitle } from "../components/PageHeader";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
  color: string | null;
  icon: string | null;
  is_system: number;
  children: Category[];
};

type FlatCategory = Omit<Category, "children">;
type CategoryModalState = {
  parentId: number;
  parentName: string;
  edit?: { id: number; name: string; color?: string | null; icon?: string | null };
} | null;

type GroupModalState = { parentId: number; parentName: string; edit?: { id: number; name: string } } | null;
type DeleteTarget = { id: number; name: string } | null;

type Tag = { id: number; name: string; color: string | null; icon: string | null; is_system: number };

const DEFAULT_COLOR = "#A89080";

// ── Category tree builder ─────────────────────────────────────────────────────

function buildTree(flat: FlatCategory[]): Category[] {
  const map = new Map<number, Category>();
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: Category[] = [];
  map.forEach((node) => {
    if (node.parent_id === null) roots.push(node);
    else map.get(node.parent_id)?.children.push(node);
  });
  return roots;
}

// ── Sub-category row (has icon) ───────────────────────────────────────────────

function SubcategoryRow({
  category, onEdit, onDelete, isLast, parentColor, parentIcon,
}: {
  category: Category; onEdit: (cat: Category) => void; onDelete: (id: number, name: string) => void;
  isLast: boolean; parentColor?: string | null; parentIcon?: string | null;
}) {
  const color = category.color ?? parentColor ?? DEFAULT_COLOR;
  return (
    <div
      className="cat-row"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 10px 9px 14px",
        borderLeft: isLast ? "1px solid transparent" : "1px solid var(--hair)",
        marginLeft: 14, position: "relative",
      }}
    >
      <span style={{ position: "absolute", left: -1, top: 0, width: 12, height: "50%", borderBottom: "1px solid var(--hair)", borderLeft: "1px solid var(--hair)", borderBottomLeftRadius: 4 }} />
      <CategoryIcon color={color} iconId={category.icon ?? parentIcon ?? null} size={15} />
      <span style={{ fontSize: 13, flex: 1, color: "var(--ink-2)" }}>{category.name}</span>
      <div className="cat-actions" style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 0.1s" }}>
        <button onClick={() => onEdit(category)} className="btn btn-ghost btn-xs" style={{ fontSize: 11 }}>Edit</button>
        {!category.is_system && (
          <button onClick={() => onDelete(category.id, category.name)} className="btn btn-ghost btn-xs" style={{ fontSize: 11, color: "var(--neg)" }}>Delete</button>
        )}
      </div>
    </div>
  );
}

// ── Group row (no icon, has children) ────────────────────────────────────────

function GroupRow({
  category, onEdit, onDelete, onCreate, handlers,
}: {
  category: Category; onEdit: () => void; onDelete: (id: number, name: string) => void;
  onCreate: () => void; handlers: Handlers;
}) {
  const color = category.color ?? DEFAULT_COLOR;
  const Icon = category.icon ? CATEGORY_ICON_MAP[category.icon] : null;
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        className="cat-row"
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, marginBottom: 2 }}
      >
        {Icon ? <Icon size={15} color={color} strokeWidth={2} /> : <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />}
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: "var(--ink)" }}>{category.name}</span>
        <div className="cat-actions" style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 0.1s" }}>
          <button onClick={onEdit} className="btn btn-ghost btn-xs" style={{ fontSize: 11 }}>Edit</button>
          {!category.is_system && (
            <button onClick={() => onDelete(category.id, category.name)} className="btn btn-ghost btn-xs" style={{ fontSize: 11, color: "var(--neg)" }}>Delete</button>
          )}
        </div>
      </div>
      {category.children.map((child, i) => (
        <SubcategoryRow
          key={child.id} category={child}
          onEdit={(cat) => handlers.onEditCategory(cat, category.id, category.name)}
          onDelete={handlers.onDeleteCategory}
          isLast={i === category.children.length - 1}
          parentColor={category.color} parentIcon={category.icon}
        />
      ))}
      <button onClick={onCreate} className="btn btn-ghost btn-xs" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, marginLeft: 28, marginTop: 2, color: "var(--ink-4)" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Add category
      </button>
    </div>
  );
}

type Handlers = {
  onEditCategory: (cat: Category, parentId: number, parentName: string) => void;
  onDeleteCategory: (id: number, name: string) => void;
  onCreateCategory: (parentId: number, parentName: string) => void;
  onEditGroup: (cat: Category, parentId: number, parentName: string) => void;
  onDeleteGroup: (id: number, name: string) => void;
};

function Section({ label, groups, onCreateGroup, handlers }: { label: string; groups: Category[]; onCreateGroup: () => void; handlers: Handlers }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 8 }}>{label}</div>
      {groups.map((g) => (
        <GroupRow
          key={g.id} category={g}
          onEdit={() => handlers.onEditGroup(g, g.parent_id!, label)}
          onDelete={handlers.onDeleteGroup}
          onCreate={() => handlers.onCreateCategory(g.id, g.name)}
          handlers={handlers}
        />
      ))}
      <button onClick={onCreateGroup} className="btn btn-ghost btn-xs" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: "var(--ink-4)" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Add group
      </button>
    </div>
  );
}

function ExpensesSection({ needsGroup, wantsGroup, onCreateGroupNeeds, onCreateGroupWants, handlers }: {
  needsGroup?: Category; wantsGroup?: Category;
  onCreateGroupNeeds: () => void; onCreateGroupWants: () => void;
  handlers: Handlers;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 8 }}>Expenses</div>
      {needsGroup && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4, paddingLeft: 4 }}>Needs</div>
          {needsGroup.children.map((g) => (
            <GroupRow key={g.id} category={g}
              onEdit={() => handlers.onEditGroup(g, needsGroup.id, "Needs")}
              onDelete={handlers.onDeleteGroup}
              onCreate={() => handlers.onCreateCategory(g.id, g.name)}
              handlers={handlers}
            />
          ))}
          <button onClick={onCreateGroupNeeds} className="btn btn-ghost btn-xs" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: "var(--ink-4)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add group
          </button>
        </div>
      )}
      {wantsGroup && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4, paddingLeft: 4 }}>Wants</div>
          {wantsGroup.children.map((g) => (
            <GroupRow key={g.id} category={g}
              onEdit={() => handlers.onEditGroup(g, wantsGroup.id, "Wants")}
              onDelete={handlers.onDeleteGroup}
              onCreate={() => handlers.onCreateCategory(g.id, g.name)}
              handlers={handlers}
            />
          ))}
          <button onClick={onCreateGroupWants} className="btn btn-ghost btn-xs" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: "var(--ink-4)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add group
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tags manager ──────────────────────────────────────────────────────────────

const ICON_IDS = Object.keys(CATEGORY_ICON_MAP);

function TagRow({ tag, onSave, onDelete }: {
  tag: Tag;
  onSave: (id: number, color: string | null, icon: string | null) => Promise<void>;
  onDelete: (id: number, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [color, setColor] = useState(tag.color ?? DEFAULT_COLOR);
  const [icon, setIcon] = useState<string | null>(tag.icon);
  const [saving, setSaving] = useState(false);

  const Icon = icon ? CATEGORY_ICON_MAP[icon] : null;
  const displayColor = tag.color ?? DEFAULT_COLOR;
  const DisplayIcon = tag.icon ? CATEGORY_ICON_MAP[tag.icon] : null;

  async function handleSave() {
    setSaving(true);
    await onSave(tag.id, color || null, icon || null);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        className="cat-row"
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8 }}
      >
        {/* Pill preview */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          borderRadius: 999, padding: "3px 8px",
          backgroundColor: `${displayColor}22`, border: `1px solid ${displayColor}55`,
        }}>
          {DisplayIcon
            ? <DisplayIcon size={11} color={displayColor} strokeWidth={2} />
            : <span style={{ width: 8, height: 8, borderRadius: "50%", background: displayColor }} />
          }
          <span style={{ fontSize: 12, fontWeight: 500, color: displayColor }}>{tag.name}</span>
        </div>

        <span style={{ flex: 1 }} />

        <div className="cat-actions" style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 0.1s" }}>
          <button onClick={() => { setColor(tag.color ?? DEFAULT_COLOR); setIcon(tag.icon); setEditing(true); }} className="btn btn-ghost btn-xs" style={{ fontSize: 11 }}>Edit</button>
          {!tag.is_system && (
            <button onClick={() => onDelete(tag.id, tag.name)} className="btn btn-ghost btn-xs" style={{ fontSize: 11, color: "var(--neg)" }}>Delete</button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ marginLeft: 14, marginTop: 4, marginBottom: 8, padding: 12, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--hair)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>Color</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  style={{ width: 32, height: 28, borderRadius: 5, border: "1px solid var(--hair-2)", cursor: "pointer", padding: 2 }} />
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{color}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>Icon</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                <button
                  onClick={() => setIcon(null)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    border: icon === null ? `2px solid ${color}` : "1px solid var(--hair-2)",
                    background: icon === null ? `${color}22` : "transparent",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                </button>
                {ICON_IDS.map((id) => {
                  const Ic = CATEGORY_ICON_MAP[id];
                  return (
                    <button
                      key={id}
                      onClick={() => setIcon(id)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                        border: icon === id ? `2px solid ${color}` : "1px solid var(--hair-2)",
                        background: icon === id ? `${color}22` : "transparent",
                      }}
                    >
                      <Ic size={14} color={icon === id ? color : "var(--ink-3)"} strokeWidth={2} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleSave} disabled={saving} className="btn btn-sm btn-primary">{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setEditing(false)} className="btn btn-sm btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddTagForm({ onAdd }: { onAdd: (name: string, color: string | null, icon: string | null) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7C9E7E");
  const [icon, setIcon] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(name.trim(), color || null, icon || null);
    setSaving(false);
    setName(""); setColor("#7C9E7E"); setIcon(null); setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-ghost btn-xs" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: "var(--ink-4)" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Add tag
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--hair)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>Name</div>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Tag name"
            autoFocus
            style={{ width: "100%", padding: "6px 8px", fontSize: 13, borderRadius: 5, border: "1px solid var(--hair-2)", background: "var(--surface)", color: "var(--ink)", outline: "none" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--hair-2)")}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setOpen(false); }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>Color</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              style={{ width: 32, height: 28, borderRadius: 5, border: "1px solid var(--hair-2)", cursor: "pointer", padding: 2 }} />
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{color}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>Icon</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            <button
              onClick={() => setIcon(null)}
              style={{
                width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                border: icon === null ? `2px solid ${color}` : "1px solid var(--hair-2)",
                background: icon === null ? `${color}22` : "transparent",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            </button>
            {ICON_IDS.map((id) => {
              const Ic = CATEGORY_ICON_MAP[id];
              return (
                <button
                  key={id}
                  onClick={() => setIcon(id)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    border: icon === id ? `2px solid ${color}` : "1px solid var(--hair-2)",
                    background: icon === id ? `${color}22` : "transparent",
                  }}
                >
                  <Ic size={14} color={icon === id ? color : "var(--ink-3)"} strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn btn-sm btn-primary">{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => setOpen(false)} className="btn btn-sm btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [catModal, setCatModal] = useState<CategoryModalState>(null);
  const [groupModal, setGroupModal] = useState<GroupModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleteTagTarget, setDeleteTagTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }, []);

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data);
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  async function handleSaveTag(id: number, color: string | null, icon: string | null) {
    await fetch("/api/tags", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, color, icon }) });
    fetchTags();
  }

  async function handleAddTag(name: string, color: string | null, icon: string | null) {
    await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color, icon }) });
    fetchTags();
  }

  async function handleDeleteTag() {
    if (!deleteTagTarget) return;
    setDeleting(true);
    await fetch("/api/tags", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTagTarget.id }) });
    setDeleting(false);
    setDeleteTagTarget(null);
    fetchTags();
  }

  const tree = buildTree(categories);
  const income  = tree.find((c) => c.id === 1);
  const expenses = tree.find((c) => c.id === 2);
  const needs   = expenses?.children.find((c) => c.id === 3);
  const wants   = expenses?.children.find((c) => c.id === 4);
  const savings = tree.find((c) => c.id === 5);

  const handlers: Handlers = {
    onEditCategory: (cat, parentId, parentName) =>
      setCatModal({ parentId, parentName, edit: { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon } }),
    onDeleteCategory: (id, name) => setDeleteTarget({ id, name }),
    onCreateCategory: (parentId, parentName) => setCatModal({ parentId, parentName }),
    onEditGroup: (cat, parentId, parentName) =>
      setGroupModal({ parentId, parentName, edit: { id: cat.id, name: cat.name } }),
    onDeleteGroup: (id, name) => setDeleteTarget({ id, name }),
  };

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    fetchCategories();
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={<SplitTitle left="Categories" right=" & Tags" />} />

      <style>{`
        .cat-row:hover .cat-actions { opacity: 1 !important; }
      `}</style>

      <div className="flex-1 overflow-y-auto px-9 pb-12 pt-2">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
            {/* Left: Categories */}
            <div style={{ flex: "0 0 auto", width: "min(600px, 55%)" }}>
              {income && (
                <Section label="Income" groups={income.children}
                  onCreateGroup={() => setGroupModal({ parentId: income.id, parentName: "Income" })}
                  handlers={handlers} />
              )}
              <ExpensesSection
                needsGroup={needs} wantsGroup={wants}
                onCreateGroupNeeds={() => setGroupModal({ parentId: needs?.id ?? 3, parentName: "Needs" })}
                onCreateGroupWants={() => setGroupModal({ parentId: wants?.id ?? 4, parentName: "Wants" })}
                handlers={handlers} />
              {savings && (
                <Section label="Savings" groups={savings.children}
                  onCreateGroup={() => setGroupModal({ parentId: savings.id, parentName: "Savings" })}
                  handlers={handlers} />
              )}
            </div>

            {/* Divider */}
            <div style={{ width: 1, alignSelf: "stretch", background: "var(--hair)", margin: "0 40px", flexShrink: 0 }} />

            {/* Right: Tags */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>Tags</div>
              {tags.map((tag) => (
                <TagRow key={tag.id} tag={tag} onSave={handleSaveTag} onDelete={(id, name) => setDeleteTagTarget({ id, name })} />
              ))}
              <AddTagForm onAdd={handleAddTag} />
            </div>
          </div>
        )}
      </div>

      {catModal && (
        <CategoryModal parentId={catModal.parentId} parentName={catModal.parentName}
          initial={catModal.edit} onClose={() => setCatModal(null)} onSaved={fetchCategories} />
      )}
      {groupModal && (
        <GroupModal parentId={groupModal.parentId} parentName={groupModal.parentName}
          edit={groupModal.edit} onClose={() => setGroupModal(null)} onSaved={fetchCategories} />
      )}

      {deleteTarget && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm" style={{ borderRadius: 16, background: "var(--surface)", border: "1px solid var(--hair)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 600 }}>Delete?</h3>
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{deleteTarget.name}</span> and all its subcategories will be deleted. Transactions will become uncategorised.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button onClick={() => setDeleteTarget(null)} className="btn btn-sm btn-ghost">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn btn-sm" style={{ background: "var(--neg)", color: "#fff", border: "none" }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setDeleteTarget(null)}>close</button></form>
        </dialog>
      )}

      {deleteTagTarget && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm" style={{ borderRadius: 16, background: "var(--surface)", border: "1px solid var(--hair)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 600 }}>Delete tag?</h3>
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{deleteTagTarget.name}</span> will be deleted.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button onClick={() => setDeleteTagTarget(null)} className="btn btn-sm btn-ghost">Cancel</button>
              <button onClick={handleDeleteTag} disabled={deleting} className="btn btn-sm" style={{ background: "var(--neg)", color: "#fff", border: "none" }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setDeleteTagTarget(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
