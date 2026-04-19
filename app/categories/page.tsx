"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CategoryModal, { CategoryIcon } from "../components/CategoryModal";
import GroupModal from "../components/GroupModal";
import PageHeader, { SplitTitle } from "../components/PageHeader";

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

const DEFAULT_COLOR = "#A89080";

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
  category,
  onEdit,
  onDelete,
  isLast,
}: {
  category: Category;
  onEdit: (cat: Category) => void;
  onDelete: (id: number, name: string) => void;
  isLast: boolean;
}) {
  const color = category.color ?? DEFAULT_COLOR;
  return (
    <div
      className="cat-row"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--hair)",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <CategoryIcon iconId={category.icon} color={color} size={26} />
      <span style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>{category.name}</span>
      <div className="cat-actions" style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 0.1s" }}>
        <button onClick={() => onEdit(category)} className="btn btn-ghost btn-xs" style={{ padding: "2px 6px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button onClick={() => onDelete(category.id, category.name)} className="btn btn-ghost btn-xs" style={{ padding: "2px 6px", color: "var(--neg)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Group card (no icon on the group title) ───────────────────────────────────

function GroupCard({
  group,
  onEditGroup,
  onDeleteGroup,
  onAddSub,
  onEditSub,
  onDeleteSub,
}: {
  group: Category;
  onEditGroup: (cat: Category) => void;
  onDeleteGroup: (id: number, name: string) => void;
  onAddSub: (parentId: number, parentName: string) => void;
  onEditSub: (cat: Category) => void;
  onDeleteSub: (id: number, name: string) => void;
}) {
  return (
    <div className="v2-card overflow-hidden" style={{ marginBottom: 10 }}>
      {/* Group header — no icon */}
      <div
        className="cat-row"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px",
          background: "var(--surface-2)",
          borderBottom: "1px solid var(--hair)",
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{group.name}</span>
        <div className="cat-actions" style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 0.1s" }}>
          {!group.is_system && (
            <>
              <button onClick={() => onEditGroup(group)} className="btn btn-ghost btn-xs" style={{ fontSize: 11, padding: "2px 8px" }}>Edit</button>
              <button onClick={() => onDeleteGroup(group.id, group.name)} className="btn btn-ghost btn-xs" style={{ fontSize: 11, padding: "2px 8px", color: "var(--neg)" }}>Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Subcategories */}
      {group.children.map((sub, i) => (
        <SubcategoryRow
          key={sub.id}
          category={sub}
          onEdit={onEditSub}
          onDelete={onDeleteSub}
          isLast={i === group.children.length - 1}
        />
      ))}

      {/* Add subcategory */}
      <button
        onClick={() => onAddSub(group.id, group.name)}
        className="btn btn-ghost btn-xs"
        style={{
          display: "block", width: "100%", textAlign: "left",
          padding: "8px 16px", fontSize: 12,
          color: "var(--ink-3)", borderTop: group.children.length > 0 ? "1px solid var(--hair)" : "none",
          borderRadius: 0,
        }}
      >
        + Add category
      </button>
    </div>
  );
}

// ── Section (Income / Savings — no sub-headers) ───────────────────────────────

function Section({
  label,
  groups,
  onCreateGroup,
  handlers,
}: {
  label: string;
  groups: Category[];
  onCreateGroup: () => void;
  handlers: GroupHandlers;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span className="display-serif" style={{ fontSize: 20 }}>{label}</span>
        <button onClick={onCreateGroup} className="btn btn-ghost btn-xs" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create group
        </button>
      </div>
      {groups.map((g) => <GroupCard key={g.id} group={g} {...handlers} />)}
    </div>
  );
}

// ── Expenses section (has Needs / Wants sub-headers) ──────────────────────────

function ExpensesSection({
  needsGroup,
  wantsGroup,
  onCreateGroupNeeds,
  onCreateGroupWants,
  handlers,
}: {
  needsGroup: Category | undefined;
  wantsGroup: Category | undefined;
  onCreateGroupNeeds: () => void;
  onCreateGroupWants: () => void;
  handlers: GroupHandlers;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <span className="display-serif" style={{ fontSize: 20, display: "block", marginBottom: 16 }}>Expenses</span>

      {[
        { group: needsGroup, label: "Needs", onCreate: onCreateGroupNeeds },
        { group: wantsGroup, label: "Wants", onCreate: onCreateGroupWants },
      ].map(({ group, label, onCreate }) => (
        <div key={label} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
            <button onClick={onCreate} className="btn btn-ghost btn-xs" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create group
            </button>
          </div>
          {group?.children.map((g) => <GroupCard key={g.id} group={g} {...handlers} />)}
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type GroupHandlers = {
  onEditGroup: (cat: Category) => void;
  onDeleteGroup: (id: number, name: string) => void;
  onAddSub: (parentId: number, parentName: string) => void;
  onEditSub: (cat: Category) => void;
  onDeleteSub: (id: number, name: string) => void;
};

export default function CategoriesPage() {
  const [roots, setRoots]               = useState<Category[]>([]);
  const [loading, setLoading]           = useState(true);
  const [catModal, setCatModal]         = useState<CategoryModalState>(null);
  const [groupModal, setGroupModal]     = useState<GroupModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting]         = useState(false);
  const initialLoad = useRef(true);

  const fetchCategories = useCallback(async () => {
    if (initialLoad.current) setLoading(true);
    const res  = await fetch("/api/categories");
    const flat: FlatCategory[] = await res.json();
    setRoots(buildTree(flat));
    setLoading(false);
    initialLoad.current = false;
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    setDeleting(false);
    fetchCategories();
  }

  const income   = roots.find((r) => r.id === 1);
  const expenses = roots.find((r) => r.id === 2);
  const savings  = roots.find((r) => r.id === 5);
  const needs    = expenses?.children.find((g) => g.id === 3);
  const wants    = expenses?.children.find((g) => g.id === 4);

  const handlers: GroupHandlers = {
    onEditGroup:   (cat) => setGroupModal({ parentId: cat.parent_id ?? 0, parentName: "", edit: { id: cat.id, name: cat.name } }),
    onDeleteGroup: (id, name) => setDeleteTarget({ id, name }),
    onAddSub:      (parentId, parentName) => setCatModal({ parentId, parentName }),
    onEditSub:     (cat) => setCatModal({ parentId: cat.parent_id ?? 0, parentName: "", edit: { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon } }),
    onDeleteSub:   (id, name) => setDeleteTarget({ id, name }),
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={<SplitTitle left="Cate" right="gories" />} />

      <style>{`
        .cat-row:hover .cat-actions { opacity: 1 !important; }
      `}</style>

      <div className="flex-1 overflow-y-auto px-9 pb-12 pt-2">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <div style={{ maxWidth: 600 }}>
            {income && (
              <Section
                label="Income"
                groups={income.children}
                onCreateGroup={() => setGroupModal({ parentId: income.id, parentName: "Income" })}
                handlers={handlers}
              />
            )}

            <ExpensesSection
              needsGroup={needs}
              wantsGroup={wants}
              onCreateGroupNeeds={() => setGroupModal({ parentId: needs?.id ?? 3, parentName: "Needs" })}
              onCreateGroupWants={() => setGroupModal({ parentId: wants?.id ?? 4, parentName: "Wants" })}
              handlers={handlers}
            />

            {savings && (
              <Section
                label="Savings"
                groups={savings.children}
                onCreateGroup={() => setGroupModal({ parentId: savings.id, parentName: "Savings" })}
                handlers={handlers}
              />
            )}
          </div>
        )}
      </div>

      {catModal && (
        <CategoryModal
          parentId={catModal.parentId}
          parentName={catModal.parentName}
          initial={catModal.edit}
          onClose={() => setCatModal(null)}
          onSaved={fetchCategories}
        />
      )}

      {groupModal && (
        <GroupModal
          parentId={groupModal.parentId}
          parentName={groupModal.parentName}
          edit={groupModal.edit}
          onClose={() => setGroupModal(null)}
          onSaved={fetchCategories}
        />
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
    </div>
  );
}
