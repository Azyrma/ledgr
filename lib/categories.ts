const CATEGORY_LOOKUP: Record<string, string> = {
};

export function lookupCategory(description: string): string {
  const lower = description.toLowerCase();
  for (const [key, category] of Object.entries(CATEGORY_LOOKUP)) {
    if (lower.includes(key)) return category;
  }
  return "";
}
