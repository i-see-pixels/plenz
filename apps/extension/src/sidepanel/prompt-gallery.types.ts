import type { PublicPrompt, SavedPrompt } from "@plenz/types";
import type { UserInfo } from "../background/auth";
import type { PromptModalState } from "./prompt-modal-machine";

export type GalleryFilter = "trending" | "newest" | "saved";
export type PromptDraftMode = "create" | "edit";

export interface ActionState {
  kind: "success" | "error";
  title: string;
  message?: string;
}

export interface PromptDraft {
  savedPromptId: string | null;
  title: string;
  prompt: string;
}

export interface PromptQueryState<T> {
  data: T[];
  error: string | null;
  status: "idle" | "loading" | "ready" | "error";
}

export interface PromptGalleryState {
  activeFilter: GalleryFilter;
  actionState: ActionState | null;
  authLoading: boolean;
  /** Prompts with a save or delete in flight; several can run at once. */
  busyPromptIds: Record<string, true>;
  promptModal: PromptModalState;
  expandedPromptIds: Record<string, boolean>;
  publicNewestPrompts: PromptQueryState<PublicPrompt>;
  publicTrendingPrompts: PromptQueryState<PublicPrompt>;
  savedPrompts: PromptQueryState<SavedPrompt>;
  searchTerm: string;
  user: UserInfo | null;
}

export interface PromptGalleryView {
  activeError: string | null;
  activeLoading: boolean;
  isSavedViewLocked: boolean;
  savedCatalogPrompts: Record<string, SavedPrompt>;
  selectedPrompts: Array<PublicPrompt | SavedPrompt>;
}

export interface PromptGalleryActions {
  clearActionState: () => void;
  closePromptModal: () => void;
  copyPrompt: (prompt: PublicPrompt | SavedPrompt) => Promise<void>;
  deleteSavedPrompt: (prompt: SavedPrompt) => Promise<void>;
  openCreatePromptModal: () => void;
  openEditSavedPromptModal: (prompt: SavedPrompt) => void;
  submitPromptDraft: () => Promise<void>;
  setActiveFilter: (filter: GalleryFilter) => void;
  setDraftPrompt: (value: string) => void;
  setDraftTitle: (value: string) => void;
  setSearchTerm: (value: string) => void;
  sharePrompt: (prompt: PublicPrompt | SavedPrompt) => Promise<void>;
  toggleCatalogSave: (prompt: PublicPrompt) => Promise<void>;
  togglePromptExpanded: (promptId: string) => void;
}

export interface PromptGalleryContextValue {
  actions: PromptGalleryActions;
  state: PromptGalleryState;
  view: PromptGalleryView;
}
