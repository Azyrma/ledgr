const CATEGORY_LOOKUP: Record<string, string> = {
  "coop":                               "Needs: General: Groceries",
  "migros":                             "Needs: General: Groceries",
  "volg":                               "Needs: General: Groceries",
  "too good to go":                     "Wants: Entertainment: Eating out",
  "sv (schweiz) ag":                    "Wants: Entertainment: Eating out",
  "compass group":                      "Wants: Entertainment: Eating out",
  "hot pasta ag":                       "Wants: Entertainment: Eating out",
  "the lemon grass":                    "Wants: Entertainment: Eating out",
  "kebab haus":                         "Wants: Entertainment: Eating out",
  "mcdonald":                           "Wants: Entertainment: Eating out",
  "selecta ag":                         "Wants: Entertainment: Eating out",
  "sbb mobile":                         "Needs: Transportation: Public Transportation",
  "urban connect":                      "Needs: Transportation: Public Transportation",
  "zürcher verkehrsverbund":            "Needs: Transportation: Public Transportation",
  "mobility kundenrechnungen":          "Needs: Transportation: Public Transportation",
  "zalando":                            "Wants: General: Clothing",
  "sunrise gmbh":                       "Needs: General: Phone",
  "galaxus abos":                       "Needs: General: Phone",
  "verein der informatik studierenden": "Needs: Education: Student Association",
  "gutschrift von eth zürich":          "Income: Salary",
};

export function lookupCategory(description: string): string {
  const lower = description.toLowerCase();
  for (const [key, category] of Object.entries(CATEGORY_LOOKUP)) {
    if (lower.includes(key)) return category;
  }
  return "";
}

// ── Category tree utilities ────────────────────────────────────────────────────

// Root system nodes are excluded from paths so paths are globally unique.
// Needs(3) and Wants(4) are kept so categories under different groups are
// distinguishable (e.g. "Needs: Food" vs "Wants: Food").
export const SYSTEM_ROOT_IDS = new Set([1, 2, 5]);

export type FlatCat = { id: number; name: string; parent_id: number | null; is_system: number };

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
