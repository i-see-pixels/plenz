import type { PublicPrompt, SavedPrompt } from "@plenz/types"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { promptGalleryRuntime } from "./prompt-gallery.runtime"
import type {
  ActionState,
  GalleryFilter,
  PromptGalleryContextValue,
  PromptGalleryState,
  PromptDraftMode,
  PromptQueryState,
} from "./prompt-gallery.types"
import {
  buildCatalogSaveLookup,
  createPromptQueryState,
  getCatalogShareSlug,
  getSearchablePromptCollection,
  isUserInfo,
  matchesSearch,
  PUBLIC_SHARE_BASE_URL,
} from "./prompt-gallery.utils"
import type { UserInfo } from "../background/auth"

const initialState: PromptGalleryState = {
  activeFilter: "trending",
  actionState: null,
  authLoading: true,
  busyPromptId: null,
  draft: {
    savedPromptId: null,
    prompt: "",
    title: "",
  },
  expandedPromptIds: {},
  promptDraftMode: "create",
  promptModalOpen: false,
  publicNewestPrompts: createPromptQueryState<PublicPrompt>("loading"),
  publicTrendingPrompts: createPromptQueryState<PublicPrompt>("loading"),
  savedPrompts: createPromptQueryState<SavedPrompt>("idle"),
  submittingPromptDraft: false,
  searchTerm: "",
  user: null,
}

const PromptGalleryContext = createContext<PromptGalleryContextValue | null>(null)

export function PromptGalleryProvider({
  children,
}: {
  children: ReactNode
}) {
  const [state, setState] = useState(initialState)

  useEffect(() => {
    void loadAuthStatus()
    void Promise.all([loadPublicPrompts("trending"), loadPublicPrompts("newest")])
  }, [])

  useEffect(() => {
    const handleAuthChange = (event: Event) => {
      const detail = (event as CustomEvent<{ user: UserInfo | null }>).detail
      const nextUser = detail?.user ?? null

      setState((current) => ({
        ...current,
        authLoading: false,
        savedPrompts: nextUser
          ? current.savedPrompts
          : createPromptQueryState<SavedPrompt>("idle"),
        user: nextUser,
      }))

      if (nextUser) {
        void loadSavedPrompts()
      }
    }

    window.addEventListener(
      "plenz-auth-status-changed",
      handleAuthChange as EventListener,
    )

    return () => {
      window.removeEventListener(
        "plenz-auth-status-changed",
        handleAuthChange as EventListener,
      )
    }
  }, [])

  async function loadAuthStatus() {
    try {
      const response = await promptGalleryRuntime.getAuthStatus()

      setState((current) => ({
        ...current,
        authLoading: false,
        user: isUserInfo(response) ? response : null,
      }))

      if (isUserInfo(response)) {
        await loadSavedPrompts()
      }
    } catch (error) {
      console.error("Prompt gallery: failed to read auth status", error)

      setState((current) => ({
        ...current,
        authLoading: false,
        user: null,
      }))
    }
  }

  async function loadPublicPrompts(category: "trending" | "newest") {
    const stateKey =
      category === "trending" ? "publicTrendingPrompts" : "publicNewestPrompts"

    setState((current) => ({
      ...current,
      [stateKey]: {
        ...current[stateKey],
        error: null,
        status: "loading",
      },
    }))

    try {
      const response = await promptGalleryRuntime.listPublicPrompts(category)

      setState((current) => ({
        ...current,
        [stateKey]: {
          data: response.prompts,
          error: null,
          status: "ready",
        } satisfies PromptQueryState<PublicPrompt>,
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        [stateKey]: {
          data: [],
          error: (error as Error).message,
          status: "error",
        } satisfies PromptQueryState<PublicPrompt>,
      }))
    }
  }

  async function loadSavedPrompts() {
    setState((current) => ({
      ...current,
      savedPrompts: {
        ...current.savedPrompts,
        error: null,
        status: "loading",
      },
    }))

    try {
      const response = await promptGalleryRuntime.listSavedPrompts()

      setState((current) => ({
        ...current,
        savedPrompts: {
          data: response.prompts,
          error: null,
          status: "ready",
        },
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        savedPrompts: {
          data: [],
          error: (error as Error).message,
          status: "error",
        },
      }))
    }
  }

  function setActionState(actionState: ActionState | null) {
    setState((current) => ({
      ...current,
      actionState,
    }))
  }

  function clearActionState() {
    setActionState(null)
  }

  function setSearchTerm(value: string) {
    setState((current) => ({
      ...current,
      searchTerm: value,
    }))
  }

  function setActiveFilter(filter: GalleryFilter) {
    setState((current) => ({
      ...current,
      activeFilter: filter,
    }))
  }

  function togglePromptExpanded(promptId: string) {
    setState((current) => ({
      ...current,
      expandedPromptIds: {
        ...current.expandedPromptIds,
        [promptId]: !current.expandedPromptIds[promptId],
      },
    }))
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
        }
      }

      if (mode === "edit") {
        if (!prompt || prompt.sourceType !== "custom") {
          return {
            ...current,
            actionState: {
              kind: "error",
              title: "Only private prompts can be edited right now.",
              message: "Only private prompts can be edited right now.",
            },
          }
        }

        return {
          ...current,
          draft: {
            savedPromptId: prompt.id,
            prompt: prompt.prompt,
            title: prompt.title,
          },
          promptDraftMode: "edit",
          promptModalOpen: true,
        }
      }

      return {
        ...current,
        draft: {
          savedPromptId: null,
          prompt: "",
          title: "",
        },
        promptDraftMode: "create",
        promptModalOpen: true,
      }
    })
  }

  function openCreatePromptModal() {
    openPromptModal("create")
  }

  function openEditSavedPromptModal(prompt: SavedPrompt) {
    openPromptModal("edit", prompt)
  }

  function closePromptModal() {
    setState((current) => ({
      ...current,
      draft: {
        savedPromptId: null,
        prompt: "",
        title: "",
      },
      promptDraftMode: "create",
      promptModalOpen: false,
    }))
  }

  function setDraftTitle(value: string) {
    setState((current) => ({
      ...current,
      draft: {
        ...current.draft,
        title: value,
      },
    }))
  }

  function setDraftPrompt(value: string) {
    setState((current) => ({
      ...current,
      draft: {
        ...current.draft,
        prompt: value,
      },
    }))
  }

  async function copyPrompt(prompt: PublicPrompt | SavedPrompt) {
    try {
      await navigator.clipboard.writeText(prompt.prompt)
      setActionState({
        kind: "success",
        title: "Prompt copied",
      })
    } catch (error) {
      setActionState({
        kind: "error",
        title: "Prompt copy failed",
        message: (error as Error).message || "Prompt could not be copied.",
      })
    }
  }

  async function sharePrompt(prompt: PublicPrompt | SavedPrompt) {
    const shareSlug = getCatalogShareSlug(prompt)

    if (!prompt.canShare || !shareSlug) {
      setActionState({
        kind: "error",
        title: "Prompt share failed",
        message: "Only editorial prompts can be shared right now.",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(`${PUBLIC_SHARE_BASE_URL}/${shareSlug}`)
      setActionState({
        kind: "success",
        title: "Prompt shared",
        message: `Copied a share link for "${prompt.title}".`,
      })
    } catch (error) {
      setActionState({
        kind: "error",
        title: "Prompt share failed",
        message: (error as Error).message || "Share link could not be copied.",
      })
    }
  }

  async function toggleCatalogSave(prompt: PublicPrompt) {
    const savedCatalogPrompts = buildCatalogSaveLookup(state.savedPrompts.data)
    const existingSavedPrompt = savedCatalogPrompts[prompt.id]

    setState((current) => ({
      ...current,
      busyPromptId: prompt.id,
    }))

    try {
      if (existingSavedPrompt) {
        await promptGalleryRuntime.deleteSavedPrompt(existingSavedPrompt.id)
        setActionState({
          kind: "success",
          title: "Prompt removed",
          // message: `Removed "${prompt.title}" from your saved prompts.`,
        })
      } else {
        await promptGalleryRuntime.savePublicPrompt(prompt)
        setActionState({
          kind: "success",
          title: "Prompt saved",
          message: `Saved "${prompt.title}" to your prompt library.`,
        })
      }

      await loadSavedPrompts()
    } catch (error) {
      setActionState({
        kind: "error",
        title: "Prompt update failed",
        message: (error as Error).message || "Prompt could not be updated.",
      })
    } finally {
      setState((current) => ({
        ...current,
        busyPromptId: null,
      }))
    }
  }

  async function deleteSavedPrompt(prompt: SavedPrompt) {
    setState((current) => ({
      ...current,
      busyPromptId: prompt.id,
    }))

    try {
      await promptGalleryRuntime.deleteSavedPrompt(prompt.id)
      setActionState({
        kind: "success",
        title: "Prompt removed",
        // message: `Removed "${prompt.title}" from your saved prompts.`,
      })
      await loadSavedPrompts()
    } catch (error) {
      setActionState({
        kind: "error",
        title: "Prompt removal failed",
        message: (error as Error).message || "Prompt could not be removed.",
      })
    } finally {
      setState((current) => ({
        ...current,
        busyPromptId: null,
      }))
    }
  }

  async function submitPromptDraft() {
    if (state.submittingPromptDraft) {
      return
    }

    setState((current) => ({
      ...current,
      submittingPromptDraft: true,
    }))

    try {
      const isEditing = state.promptDraftMode === "edit"
      const actionLabel = isEditing ? "updated" : "saved"

      if (isEditing) {
        await promptGalleryRuntime.updateSavedPrompt(
          state.draft.savedPromptId ?? "",
          state.draft.title,
          state.draft.prompt,
        )
      } else {
        await promptGalleryRuntime.createSavedPrompt(
          state.draft.title,
          state.draft.prompt,
        )
      }

      setState((current) => ({
        ...current,
        actionState: {
          kind: "success",
          title: `Prompt ${actionLabel}`,
          // message: `Private prompt ${actionLabel} in your library.`,
        },
        activeFilter: "saved",
        draft: {
          savedPromptId: null,
          prompt: "",
          title: "",
        },
        promptDraftMode: "create",
        promptModalOpen: false,
      }))

      await loadSavedPrompts()
    } catch (error) {
      setActionState({
        kind: "error",
        title: "Prompt save failed",
        message: (error as Error).message || "Prompt could not be saved.",
      })
    } finally {
      setState((current) => ({
        ...current,
        submittingPromptDraft: false,
      }))
    }
  }

  const selectedPrompts = getSearchablePromptCollection(
    state.activeFilter,
    state.publicTrendingPrompts.data,
    state.publicNewestPrompts.data,
    state.savedPrompts.data,
  ).filter((prompt) => matchesSearch(prompt, state.searchTerm))

  const savedCatalogPrompts = buildCatalogSaveLookup(state.savedPrompts.data)
  const activeQueryState =
    state.activeFilter === "trending"
      ? state.publicTrendingPrompts
      : state.activeFilter === "newest"
        ? state.publicNewestPrompts
        : state.savedPrompts
  const isSavedViewLocked =
    state.activeFilter === "saved" && !state.authLoading && !state.user

  const value: PromptGalleryContextValue = {
    actions: {
      clearActionState,
      closePromptModal,
      copyPrompt,
      deleteSavedPrompt,
      openCreatePromptModal,
      openEditSavedPromptModal,
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
  }

  return (
    <PromptGalleryContext.Provider value={value}>
      {children}
    </PromptGalleryContext.Provider>
  )
}

export function usePromptGallery() {
  const context = useContext(PromptGalleryContext)

  if (!context) {
    throw new Error("usePromptGallery must be used within PromptGalleryProvider.")
  }

  return context
}
