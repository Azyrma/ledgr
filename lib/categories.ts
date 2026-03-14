const CATEGORY_LOOKUP: Record<string, string> = {
  "coop":                               "Personal:Food",
  "migros":                             "Personal:Food",
  "volg":                               "Personal:Food",
  "too good to go":                     "Personal:Food",
  "sv (schweiz) ag":                    "Personal:Food",
  "compass group":                      "Personal:Food",
  "hot pasta ag":                       "Personal:Food",
  "the lemon grass":                    "Personal:Food",
  "kebab haus":                         "Personal:Food",
  "mcdonald":                           "Personal:Food",
  "selecta ag":                         "Personal:Food",
  "sbb mobile":                         "Personal:Travel/Transport",
  "urban connect":                      "Personal:Travel/Transport",
  "zürcher verkehrsverbund":            "Personal:Travel/Transport",
  "mobility kundenrechnungen":          "Personal:Travel/Transport",
  "zalando":                            "Personal:Clothes",
  "sunrise gmbh":                       "Bills:Phone",
  "galaxus abos":                       "Bills:Phone",
  "luzerner pensionskasse":             "Due From Parents CHF",
  "verein der informatik studierenden": "Education:VIS",
  "gutschrift von eth zürich":          "Salary",
  "stadt zuerich steueramt":            "Tax",
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
