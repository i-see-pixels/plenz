import type { PublicPrompt, SavedPrompt } from "@plenz/types";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuthSession } from "../components/useAuthSession";
import { promptGalleryRuntime } from "./prompt-gallery.runtime";
import type {
  ActionState,
  GalleryFilter,
  PromptDraftMode,
  PromptGalleryContextValue,
  PromptGalleryState,
  PromptQueryState,
} from "./prompt-gallery.types";
import {
  buildCatalogSaveLookup,
  createPromptQueryState,
  getCatalogShareSlug,
  getSearchablePromptCollection,
  matchesSearch,
  PUBLIC_SHARE_BASE_URL,
} from "./prompt-gallery.utils";
import {
  EMPTY_DRAFT,
  type PromptModalEvent,
  promptModalTransition,
} from "./prompt-modal-machine";

const initialState: PromptGalleryState = {
  activeFilter: "trending",
  actionState: null,
  authLoading: true,
  busyPromptIds: {},
  expandedPromptIds: {},
  promptModal: { kind: "closed" },
  publicNewestPrompts: createPromptQueryState<PublicPrompt>("loading"),
  publicTrendingPrompts: createPromptQueryState<PublicPrompt>("loading"),
  savedPrompts: createPromptQueryState<SavedPrompt>("idle"),
  searchTerm: "",
  user: null,
};

const PromptGalleryContext = createContext<PromptGalleryContextValue | null>(
  null,
);

export function PromptGalleryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  // Only the newest saved-prompts request may write its result.
  const savedPromptsRequest = useRef(0);

  function updateModal(event: PromptModalEvent) {
    setState((current) => ({
      ...current,
      promptModal: promptModalTransition(current.promptModal, event),
    }));
  }

  function setPromptBusy(promptId: string, busy: boolean) {
    setState((current) => {
      const busyPromptIds = { ...current.busyPromptIds };
      if (busy) busyPromptIds[promptId] = true;
      else delete busyPromptIds[promptId];
      return { ...current, busyPromptIds };
    });
  }

  const { auth } = useAuthSession();
  const authSettled = auth.status === "signedIn" || auth.status === "signedOut";
  const signedInUser = auth.status === "signedIn" ? auth.user : null;

  const loadPublicPrompts = useCallback(
    async (category: "trending" | "newest") => {
      const stateKey =
        category === "trending"
          ? "publicTrendingPrompts"
          : "publicNewestPrompts";

      setState((current) => ({
        ...current,
        [stateKey]: {
          ...current[stateKey],
          error: null,
          status: "loading",
        },
      }));

      try {
        const response = await promptGalleryRuntime.listPublicPrompts(category);

        setState((current) => ({
          ...current,
          [stateKey]: {
            data: response.prompts,
            error: null,
            status: "ready",
          } satisfies PromptQueryState<PublicPrompt>,
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          [stateKey]: {
            data: [],
            error: (error as Error).message,
            status: "error",
          } satisfies PromptQueryState<PublicPrompt>,
        }));
      }
    },
    [],
  );

  const loadSavedPrompts = useCallback(async () => {
    const request = ++savedPromptsRequest.current;
    setState((current) => ({
      ...current,
      savedPrompts: {
        ...current.savedPrompts,
        error: null,
        status: "loading",
      },
    }));

    try {
      const response = await promptGalleryRuntime.listSavedPrompts();
      if (request !== savedPromptsRequest.current) return;

      setState((current) => ({
        ...current,
        savedPrompts: {
          data: response.prompts,
          error: null,
          status: "ready",
        },
      }));
    } catch (error) {
      if (request !== savedPromptsRequest.current) return;

      setState((current) => ({
        ...current,
        savedPrompts: {
          data: [],
          error: (error as Error).message,
          status: "error",
        },
      }));
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadPublicPrompts("trending"),
      loadPublicPrompts("newest"),
    ]);
  }, [loadPublicPrompts]);

  // Follow the background auth session; it is the same on every extension page.
  // Keyed on the user id: every auth broadcast is a new object for the same user.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run only when the signed-in user changes, not on every snapshot
  useEffect(() => {
    if (!authSettled) {
      setState((current) => ({ ...current, authLoading: true }));
      return;
    }

    setState((current) => ({
      ...current,
      authLoading: false,
      savedPrompts: signedInUser
        ? current.savedPrompts
        : createPromptQueryState<SavedPrompt>("idle"),
      user: signedInUser,
    }));

    if (signedInUser) {
      void loadSavedPrompts();
    } else {
      savedPromptsRequest.current++; // drop any list still loading
    }
  }, [authSettled, signedInUser?.id, loadSavedPrompts]);

  function setActionState(actionState: ActionState | null) {
    setState((current) => ({
      ...current,
      actionState,
    }));
  }

  function clearActionState() {
    setActionState(null);
  }

  function setSearchTerm(value: string) {
    setState((current) => ({
      ...current,
      searchTerm: value,
    }));
  }

  function setActiveFilter(filter: GalleryFilter) {
    setState((current) => ({
      ...current,
      activeFilter: filter,
    }));
  }

  function togglePromptExpanded(promptId: string) {
    setState((current) => ({
      ...current,
      expandedPromptIds: {
        ...current.expandedPromptIds,
        [promptId]: !current.expandedPromptIds[promptId],
      },
    }));
  }

  function openPromptModal(mode: PromptDraftMode, prompt?: SavedPrompt) {
    setState((current) => {
      if (!current.user) {
        return {
          ...current,
          actionState: {
            kind: "error",
            title: "Sign in required",
            message: "Sign in with Google to save your own prompts.",
          },
          activeFilter: "saved",
        };
      }

      if (mode === "edit") {
        if (prompt?.sourceType !== "custom") {
          return {
            ...current,
            actionState: {
              kind: "error",
              title: "Only private prompts can be edited right now.",
              message: "Only private prompts can be edited right now.",
            },
          };
        }

        return {
          ...current,
          promptModal: promptModalTransition(current.promptModal, {
            type: "OPEN",
            mode: "edit",
            draft: {
              savedPromptId: prompt.id,
              prompt: prompt.prompt,
              title: prompt.title,
            },
          }),
        };
      }

      return {
        ...current,
        promptModal: promptModalTransition(current.promptModal, {
          type: "OPEN",
          mode: "create",
          draft: EMPTY_DRAFT,
        }),
      };
    });
  }

  function openCreatePromptModal() {
    openPromptModal("create");
  }

  function openEditSavedPromptModal(prompt: SavedPrompt) {
    openPromptModal("edit", prompt);
  }

  function closePromptModal() {
    updateModal({ type: "CLOSE" });
  }

  function setDraftTitle(value: string) {
    updateModal({ type: "EDIT", field: "title", value });
  }

  function setDraftPrompt(value: string) {
    updateModal({ type: "EDIT", field: "prompt", value });
  }

  async function copyPrompt(prompt: PublicPrompt | SavedPrompt) {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setActionState({
        kind: "success",
        title: "Prompt copied",
      });
    } catch (error) {
      setActionState({
        kind: "error",
        title: "Prompt copy failed",
        message: (error as Error).message || "Prompt could not be copied.",
      });
    }
  }

  async function sharePrompt(prompt: PublicPrompt | SavedPrompt) {
    const shareSlug = getCatalogShareSlug(prompt);

    if (!prompt.canShare || !shareSlug) {
      setActionState({
        kind: "error",
        title: "Prompt share failed",
        message: "Only editorial prompts can be shared right now.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${PUBLIC_SHARE_BASE_URL}/${shareSlug}`,
      );
      setActionState({
        kind: "success",
        title: "Prompt shared",
        message: `Copied a share link for "${prompt.title}".`,
      });
    } catch (error) {
      setActionState({
        kind: "error",
        title: "Prompt share failed",
        message: (error as Error).message || "Share link could not be copied.",
      });
    }
  }

  async function toggleCatalogSave(prompt: PublicPrompt) {
    const savedCatalogPrompts = buildCatalogSaveLookup(state.savedPrompts.data);
    const existingSavedPrompt = savedCatalogPrompts[prompt.id];

    if (state.busyPromptIds[prompt.id]) {
      return;
    }
    setPromptBusy(prompt.id, true);

    try {
      if (existingSavedPrompt) {
        await promptGalleryRuntime.deleteSavedPrompt(existingSavedPrompt.id);
        setActionState({
          kind: "success",
          title: "Prompt removed",
          // message: `Removed "${prompt.title}" from your saved prompts.`,
        });
      } else {
        await promptGalleryRuntime.savePublicPrompt(prompt);
        setActionState({
          kind: "success",
          title: "Prompt saved",
          message: `Saved "${prompt.title}" to your prompt library.`,
        });
      }

      await loadSavedPrompts();
    } catch (error) {
      setActionState({
        kind: "error",
        title: "Prompt update failed",
        message: (error as Error).message || "Prompt could not be updated.",
      });
    } finally {
      setPromptBusy(prompt.id, false);
    }
  }

  async function deleteSavedPrompt(prompt: SavedPrompt) {
    if (state.busyPromptIds[prompt.id]) {
      return;
    }
    setPromptBusy(prompt.id, true);

    try {
      await promptGalleryRuntime.deleteSavedPrompt(prompt.id);
      setActionState({
        kind: "success",
        title: "Prompt removed",
        // message: `Removed "${prompt.title}" from your saved prompts.`,
      });
      await loadSavedPrompts();
    } catch (error) {
      setActionState({
        kind: "error",
        title: "Prompt removal failed",
        message: (error as Error).message || "Prompt could not be removed.",
      });
    } finally {
      setPromptBusy(prompt.id, false);
    }
  }

  async function submitPromptDraft() {
    const modal = state.promptModal;
    if (modal.kind !== "editing") {
      return;
    }

    updateModal({ type: "SUBMIT" });

    try {
      const isEditing = modal.mode === "edit";
      const actionLabel = isEditing ? "updated" : "saved";

      if (isEditing) {
        await promptGalleryRuntime.updateSavedPrompt(
          modal.draft.savedPromptId ?? "",
          modal.draft.title,
          modal.draft.prompt,
        );
      } else {
        await promptGalleryRuntime.createSavedPrompt(
          modal.draft.title,
          modal.draft.prompt,
        );
      }

      setState((current) => ({
        ...current,
        actionState: {
          kind: "success",
          title: `Prompt ${actionLabel}`,
          // message: `Private prompt ${actionLabel} in your library.`,
        },
        activeFilter: "saved",
        promptModal: promptModalTransition(current.promptModal, {
          type: "SUBMIT_SUCCEEDED",
        }),
      }));

      await loadSavedPrompts();
    } catch (error) {
      updateModal({ type: "SUBMIT_FAILED" });
      setActionState({
        kind: "error",
        title: "Prompt save failed",
        message: (error as Error).message || "Prompt could not be saved.",
      });
    }
  }

  const selectedPrompts = getSearchablePromptCollection(
    state.activeFilter,
    state.publicTrendingPrompts.data,
    state.publicNewestPrompts.data,
    state.savedPrompts.data,
  ).filter((prompt) => matchesSearch(prompt, state.searchTerm));

  const savedCatalogPrompts = buildCatalogSaveLookup(state.savedPrompts.data);
  const activeQueryState =
    state.activeFilter === "trending"
      ? state.publicTrendingPrompts
      : state.activeFilter === "newest"
        ? state.publicNewestPrompts
        : state.savedPrompts;
  const retry = () => {
    if (state.activeFilter === "saved") void loadSavedPrompts();
    else void loadPublicPrompts(state.activeFilter);
  };

  const isSavedViewLocked =
    state.activeFilter === "saved" && !state.authLoading && !state.user;

  const value: PromptGalleryContextValue = {
    actions: {
      clearActionState,
      closePromptModal,
      copyPrompt,
      deleteSavedPrompt,
      openCreatePromptModal,
      openEditSavedPromptModal,
      retry,
      submitPromptDraft,
      setActiveFilter,
      setDraftPrompt,
      setDraftTitle,
      setSearchTerm,
      sharePrompt,
      toggleCatalogSave,
      togglePromptExpanded,
    },
    state,
    view: {
      activeError: activeQueryState.error,
      activeLoading: activeQueryState.status === "loading",
      isSavedViewLocked,
      savedCatalogPrompts,
      selectedPrompts,
    },
  };

  return (
    <PromptGalleryContext.Provider value={value}>
      {children}
    </PromptGalleryContext.Provider>
  );
}

export function usePromptGallery() {
  const context = useContext(PromptGalleryContext);

  if (!context) {
    throw new Error(
      "usePromptGallery must be used within PromptGalleryProvider.",
    );
  }

  return context;
}
