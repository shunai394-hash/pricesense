import type { JobCategory, JobGroupId } from "@/data/types";
import {
  JOB_CATEGORIES,
  JOB_CATEGORY_COUNT,
} from "@/data/jobCategories";

export { JOB_CATEGORY_COUNT };

export function getAllCategories(): JobCategory[] {
  return JOB_CATEGORIES;
}

export function searchCategories(query: string): JobCategory[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return JOB_CATEGORIES;

  const scored = JOB_CATEGORIES.map((category) => {
    let score = 0;
    const label = category.label.toLowerCase();
    const groupLabel = category.groupLabel.toLowerCase();
    const description = category.description.toLowerCase();

    if (label === trimmed) score += 100;
    else if (label.startsWith(trimmed)) score += 80;
    else if (label.includes(trimmed)) score += 60;

    if (groupLabel.includes(trimmed)) score += 30;
    if (description.includes(trimmed)) score += 10;

    for (const keyword of category.keywords) {
      const kw = keyword.toLowerCase();
      if (kw === trimmed) score += 50;
      else if (kw.startsWith(trimmed)) score += 35;
      else if (kw.includes(trimmed)) score += 20;
    }

    for (const tag of category.tags) {
      const t = tag.toLowerCase();
      if (t.includes(trimmed)) score += 15;
    }

    return { category, score };
  })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.category.label.localeCompare(b.category.label, "ja")
    );

  return scored.map(({ category }) => category);
}

export function groupCategoriesByGroup(
  categories: JobCategory[]
): Map<JobGroupId, JobCategory[]> {
  const map = new Map<JobGroupId, JobCategory[]>();
  for (const category of categories) {
    const list = map.get(category.group) ?? [];
    list.push(category);
    map.set(category.group, list);
  }
  return map;
}
