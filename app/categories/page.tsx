"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CategoryModal from "../components/CategoryModal";

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
  color: string | null;
  is_system: number;
  children: Category[];
};

type FlatCategory = Omit<Category, "children">;

type ModalState = {
  parentId: number;
  parentName: string;
  edit?: { id: number; name: string };
} | null;

type DeleteTarget = { id: number; name: string } | null;

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

function CategoryRow({
  category,
  depth,
  accentColor,
  onAdd,
  onEdit,
  onDelete,
}: {
  category: Category;
  depth: number;
  accentColor: string;
  onAdd: (parentId: number, parentName: string) => void;
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children.length > 0;
  const isSystem = category.is_system === 1;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-3 py-2 hover:bg-base-200"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-base-content/30"
        >
          {hasChildren ? (
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <span className="h-1 w-1 rounded-full bg-base-300" />
          )}
        </button>

        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />

        <span className={`flex-1 text-sm ${isSystem ? "font-medium" : "text-base-content/70"}`}>
          {category.name}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onAdd(category.id, category.name)} title="Add subcategory" className="btn btn-ghost btn-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {!isSystem && (
            <>
              <button onClick={() => onEdit(category.id, category.name)} title="Rename" className="btn btn-ghost btn-xs">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button onClick={() => onDelete(category.id, category.name)} title="Delete" className="btn btn-ghost btn-xs text-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && category.children.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          depth={depth + 1}
          accentColor={accentColor}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function SectionCard({
  root,
  onAdd,
  onEdit,
  onDelete,
}: {
  root: Category;
  onAdd: (parentId: number, parentName: string) => void;
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number, name: string) => void;
}) {
  const color = root.color ?? "#6366f1";
  const isExpenses = root.id === 2;

  return (
    <div className="card bg-base-100 border border-base-300 overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: color }} />

      <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="text-base font-semibold">{root.name}</h2>
        </div>
        {!isExpenses && (
          <button onClick={() => onAdd(root.id, root.name)} className="btn btn-outline btn-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add category
          </button>
        )}
      </div>

      <div className="py-2">
        {isExpenses ? (
          root.children.map((group) => (
            <div key={group.id}>
              <div className="flex items-center justify-between px-5 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                  {group.name}
                </span>
                <button onClick={() => onAdd(group.id, group.name)} className="btn btn-ghost btn-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add
                </button>
              </div>
              {group.children.length === 0 ? (
                <p className="px-5 pb-2 text-xs text-base-content/30">No categories yet</p>
              ) : (
                group.children.map((cat) => (
                  <CategoryRow key={cat.id} category={cat} depth={1} accentColor={color} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
                ))
              )}
            </div>
          ))
        ) : (
          root.children.length === 0 ? (
            <p className="px-5 py-3 text-xs text-base-content/30">No categories yet</p>
          ) : (
            root.children.map((cat) => (
              <CategoryRow key={cat.id} category={cat} depth={0} accentColor={color} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
            ))
          )
        )}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [roots, setRoots]             = useState<Category[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting]       = useState(false);
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

  function openAdd(parentId: number, parentName: string) {
    setModal({ parentId, parentName });
  }

  function openEdit(id: number, name: string) {
    setModal({ parentId: 0, parentName: "", edit: { id, name } });
  }

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

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center border-b border-base-300 bg-base-100 px-8 py-4">
        <h1 className="text-xl font-semibold">Categories</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {income   && <SectionCard root={income}   onAdd={openAdd} onEdit={openEdit} onDelete={(id, name) => setDeleteTarget({ id, name })} />}
            {expenses && <SectionCard root={expenses} onAdd={openAdd} onEdit={openEdit} onDelete={(id, name) => setDeleteTarget({ id, name })} />}
            {savings  && <SectionCard root={savings}  onAdd={openAdd} onEdit={openEdit} onDelete={(id, name) => setDeleteTarget({ id, name })} />}
          </div>
        )}
      </div>

      {modal && (
        <CategoryModal
          parentId={modal.parentId}
          parentName={modal.parentName}
          initial={modal.edit}
          onClose={() => setModal(null)}
          onSaved={fetchCategories}
        />
      )}

      {deleteTarget && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="text-lg font-bold">Delete category?</h3>
            <p className="mt-2 text-sm text-base-content/60">
              <span className="font-medium text-base-content">{deleteTarget.name}</span> and all its subcategories will be deleted. Transactions will become uncategorised.
            </p>
            <div className="modal-action">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn btn-error">
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
