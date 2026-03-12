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
