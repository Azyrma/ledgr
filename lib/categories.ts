// ── Category tree utilities ────────────────────────────────────────────────────

// Root system nodes are excluded from paths so paths are globally unique.
// Needs(3) and Wants(4) are kept so categories under different groups are
// distinguishable (e.g. "Needs: Food" vs "Wants: Food").
export const SYSTEM_ROOT_IDS = new Set([1, 2, 5]);

export type FlatCat = { id: number; name: string; parent_id: number | null; color: string | null; icon: string | null; is_system: number };

export type CategoryDisplay = { leafName: string; color: string | null; icon: string | null };

export function buildCategoryNodeMap(cats: FlatCat[]): Map<number, FlatCat & { children: FlatCat[] }> {
  const map = new Map<number, FlatCat & { children: FlatCat[] }>(
    cats.map((c) => [c.id, { ...c, children: [] }])
  );
  map.forEach((node) => {
    if (node.parent_id !== null) map.get(node.parent_id)?.children.push(node);
  });
  return map;
}

export function getCategoryPath(id: number, nodeMap: Map<number, FlatCat>): string {
  const parts: string[] = [];
  let cur = nodeMap.get(id);
  while (cur) {
    if (!SYSTEM_ROOT_IDS.has(cur.id)) parts.unshift(cur.name);
    cur = cur.parent_id !== null ? nodeMap.get(cur.parent_id) : undefined;
  }
  return parts.join(": ");
}

function resolveInherited(id: number, nodeMap: Map<number, FlatCat>, field: "color" | "icon"): string | null {
  let cur = nodeMap.get(id);
  while (cur) {
    if (cur[field]) return cur[field];
    cur = cur.parent_id !== null ? nodeMap.get(cur.parent_id) : undefined;
  }
  return null;
}

export function buildCategoryDisplayMap(cats: FlatCat[]): Map<string, CategoryDisplay> {
  const nodeMap = buildCategoryNodeMap(cats);
  const result = new Map<string, CategoryDisplay>();
  nodeMap.forEach((cat, id) => {
    if (!cat.is_system) {
      const path = getCategoryPath(id, nodeMap);
      result.set(path, {
        leafName: cat.name,
        color: resolveInherited(id, nodeMap, "color"),
        icon:  resolveInherited(id, nodeMap, "icon"),
      });
    }
  });
  return result;
}
