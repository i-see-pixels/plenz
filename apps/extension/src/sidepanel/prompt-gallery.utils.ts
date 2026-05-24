import type { PublicPrompt, SavedPrompt } from "@plenz/types";
import type { UserInfo } from "../background/auth";
import type { GalleryFilter, PromptQueryState } from "./prompt-gallery.types";

export const PUBLIC_SHARE_BASE_URL = "https://plenz.siddsingh.dev/prompts";
export const COLLAPSED_PROMPT_LENGTH = 240;

export function createPromptQueryState<T>(
  status: PromptQueryState<T>["status"],
): PromptQueryState<T> {
  return {
    data: [],
    error: null,
    status,
  };
}

export function isUserInfo(value: unknown): value is UserInfo {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as UserInfo).id === "string" &&
    typeof (value as UserInfo).email === "string" &&
    typeof (value as UserInfo).name === "string" &&
    typeof (value as UserInfo).picture === "string"
  );
}

export function isPublicPrompt(
  prompt: PublicPrompt | SavedPrompt,
): prompt is PublicPrompt {
  return "slug" in prompt;
}

export function formatPromptPreview(prompt: string, expanded: boolean) {
  if (expanded || prompt.length <= COLLAPSED_PROMPT_LENGTH) {
    return prompt;
  }

  return `${prompt.slice(0, COLLAPSED_PROMPT_LENGTH).trimEnd()}...`;
}

export function formatDateLabel(value: string | null) {
  if (!value) {
    return "Recently updated";
  }

  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedValue);
}

export function getCatalogShareSlug(prompt: PublicPrompt | SavedPrompt) {
  return isPublicPrompt(prompt) ? prompt.slug : prompt.catalogSlug;
}

export function getSearchablePromptCollection(
  filter: GalleryFilter,
  publicTrendingPrompts: PublicPrompt[],
  publicNewestPrompts: PublicPrompt[],
  savedPrompts: SavedPrompt[],
) {
  if (filter === "trending") {
    return publicTrendingPrompts;
  }

  if (filter === "newest") {
    return publicNewestPrompts;
  }

  return savedPrompts;
}

export function matchesSearch(
  prompt: PublicPrompt | SavedPrompt,
  searchTerm: string,
) {
  if (!searchTerm.trim()) {
    return true;
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  return (
    prompt.title.toLowerCase().includes(normalizedSearchTerm) ||
    prompt.prompt.toLowerCase().includes(normalizedSearchTerm) ||
    prompt.category.some((entry) =>
      entry.toLowerCase().includes(normalizedSearchTerm),
    )
  );
}

export function buildCatalogSaveLookup(savedPrompts: SavedPrompt[]) {
  return savedPrompts.reduce<Record<string, SavedPrompt>>((lookup, prompt) => {
    if (prompt.sourceType === "catalog" && prompt.catalogPromptId) {
      lookup[prompt.catalogPromptId] = prompt;
    }

    return lookup;
  }, {});
}
