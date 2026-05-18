import type { PublicPrompt, SavedPrompt } from "@plenz/types"
import { useEffect, useRef } from "react"
import { AuthStatus } from "../components/AuthStatus"
import { Badge } from "@plenz/ui/components/badge"
import { Button } from "@plenz/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@plenz/ui/components/card"
import { Input } from "@plenz/ui/components/input"
import { Skeleton } from "@plenz/ui/components/skeleton"
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  Plus,
  Search,
  Share2Icon,
  SquarePenIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
import { usePromptGallery } from "./PromptGalleryProvider"
import type { GalleryFilter, PromptGalleryActions } from "./prompt-gallery.types"
import {
  formatDateLabel,
  formatPromptPreview,
  getCatalogSourceLabel,
  isPublicPrompt,
} from "./prompt-gallery.utils"
import { cn } from "@plenz/ui/index"

const FILTER_OPTIONS: Array<{
  id: GalleryFilter
  label: string
}> = [
    { id: "trending", label: "Trending" },
    { id: "newest", label: "Newly added" },
    { id: "saved", label: "Saved" },
  ]

export function PromptGalleryHeader() {
  const { actions } = usePromptGallery()

  return (
    <Card className="rounded-none border-0 border-b bg-background py-0 shadow-none gap-0">
      <CardHeader className="gap-3 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-mono text-xl font-bold uppercase">
            Prompt gallery
          </h1>
          <Button onClick={actions.openCreatePromptModal} className="shrink-0 gap-2">
            <Plus data-icon="inline-start" />
            Save prompt
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <AuthStatus />
      </CardContent>
    </Card>
  )
}

export function PromptGalleryToolbar() {
  const { actions, state } = usePromptGallery()

  return (
    <CardContent className="flex flex-col gap-4 px-4 py-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={state.searchTerm}
          onInput={(event) =>
            actions.setSearchTerm((event.target as HTMLInputElement).value)
          }
          placeholder="Search by title or prompt text"
          className="pl-9"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {FILTER_OPTIONS.map((filterOption) => (
          <PromptGalleryFilterButton
            key={filterOption.id}
            filter={filterOption.id}
            label={filterOption.label}
          />
        ))}
      </div>
    </CardContent>
  )
}

function PromptGalleryFilterButton({
  filter,
  label,
}: {
  filter: GalleryFilter
  label: string
}) {
  const { actions, state } = usePromptGallery()
  const count =
    filter === "trending"
      ? state.publicTrendingPrompts.data.length
      : filter === "newest"
        ? state.publicNewestPrompts.data.length
        : state.savedPrompts.data.length

  return (
    <Button
      variant={state.activeFilter === filter ? "default" : "outline"}
      size="sm"
      onClick={() => actions.setActiveFilter(filter)}
      className="justify-between"
    >
      <span>{label}</span>
      <Badge variant='outline' className={cn("rounded-sm", state.activeFilter === filter ? "text-primary-foreground" : "text-foreground")}>
        {count}
      </Badge>
    </Button>
  )
}

export function PromptGalleryToasts() {
  const { actions, state } = usePromptGallery()
  const lastToastKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!state.actionState) {
      lastToastKeyRef.current = null
      return
    }

    const toastKey = `${state.actionState.kind}:${state.actionState.title}:${state.actionState.message}`

    if (lastToastKeyRef.current === toastKey) {
      return
    }

    lastToastKeyRef.current = toastKey

    if (state.actionState.kind === "success") {
      toast.success(state.actionState.title, { description: state.actionState.message })
    } else {
      toast.error(state.actionState.title, { description: state.actionState.message })
    }

    actions.clearActionState()
  }, [actions, state.actionState])

  return null
}

export function PromptGalleryContent() {
  const { state, view } = usePromptGallery()

  if (view.activeLoading) {
    return <PromptGalleryLoadingState />
  }

  if (view.activeError) {
    return (
      <PromptGalleryMessageCard
        title="Prompt gallery unavailable"
        description={view.activeError}
        tone="error"
      />
    )
  }

  if (view.isSavedViewLocked) {
    return (
      <PromptGalleryMessageCard
        title="Sign in required"
        description="Trending and newly added prompts stay visible for everyone. Sign in with Google to see only your saved prompts and add private prompts to the library."
      />
    )
  }

  if (view.selectedPrompts.length === 0) {
    return (
      <PromptGalleryMessageCard
        title="No prompts found"
        description={
          state.searchTerm.trim()
            ? "Try a different search term or switch to another category."
            : state.activeFilter === "saved"
              ? "Saved prompts will appear here after you add or save one."
              : "The editorial catalog is empty right now."
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {view.selectedPrompts.map((prompt) => (
        <PromptGalleryPromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  )
}

function PromptGalleryLoadingState() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-36 w-full rounded-sm" />
      <Skeleton className="h-36 w-full rounded-sm" />
      <Skeleton className="h-36 w-full rounded-sm" />
    </div>
  )
}

function PromptGalleryMessageCard({
  description,
  title,
  tone = "default",
}: {
  description: string
  title: string
  tone?: "default" | "error"
}) {
  return (
    <Card className="gap-0 rounded-md border-border py-0 shadow-none">
      <CardContent className="px-4 py-4">
        <p
          className={`font-mono text-[10px] font-semibold tracking-[0.16em] uppercase ${tone === "error" ? "text-accent-signal" : "text-muted-foreground"
            }`}
        >
          {title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function PromptGalleryPromptCard({
  prompt,
}: {
  prompt: PublicPrompt | SavedPrompt
}) {
  const { actions, state, view } = usePromptGallery()
  const expanded = !!state.expandedPromptIds[prompt.id]
  const promptText = formatPromptPreview(prompt.prompt, expanded)
  const isExpandable = prompt.prompt.length > 240

  return (
    <Card className="gap-0 rounded-md border-border py-0 shadow-none"
    >
      <CardHeader
        className="gap-2 px-4 py-4"
      >
        <CardTitle className="text-xl font-semibold flex flex-col gap-2">
          <div className="flex justify-between items-start gap-x-2">
            <h2 className="line-clamp-2">
              {prompt.title}
            </h2>
            <PromptGalleryPromptActions prompt={prompt} actions={actions} />
          </div>
          <div className="flex items-center-safe gap-1 font-mono font-thin text-xs text-muted-foreground">
            <CalendarIcon className="size-3 mb-0.5" />
            {formatDateLabel(
              "savedAt" in prompt
                ? prompt.savedAt || prompt.updatedAt
                : prompt.createdAt || prompt.updatedAt,
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className={cn("px-4 pb-4", isExpandable ? "test" : "")}
        onClick={() => isExpandable && actions.togglePromptExpanded(prompt.id)}
      >
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground mb-2 rounded-2xl">
          {promptText}
        </p>

        <div className="flex items-center justify-center text-muted-foreground">
          {isExpandable ? (
            expanded ? (<ChevronUpIcon className="size-5" />) : (<ChevronDownIcon className="size-5" />)
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function PromptGalleryPromptActions({
  prompt, actions
}: {
  prompt: PublicPrompt | SavedPrompt
  actions: PromptGalleryActions
}) {
  return (
    <div className="flex shrink-0 items-center gap-x-0">
      {isPublicPrompt(prompt) ? (
        <CatalogPromptActions prompt={prompt} />
      ) : (
        <SavedPromptActions prompt={prompt} />
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={() => void actions.sharePrompt(prompt)}
        disabled={!prompt.canShare}
        title={
          prompt.canShare
            ? "Copy a public share link"
            : "Only editorial prompts can be shared"
        }
      >
        <Share2Icon data-icon="inline-start" className="size-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => void actions.copyPrompt(prompt)}
      >
        <CopyIcon data-icon="inline-start" className="size-4" />
      </Button>
    </div>
  )

}

function PromptGalleryPromptBadges({
  prompt,
}: {
  prompt: PublicPrompt | SavedPrompt
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className="rounded-sm font-mono text-[10px] tracking-[0.12em] uppercase"
      >
        {getCatalogSourceLabel(prompt)}
      </Badge>

      {"savedAt" in prompt && prompt.sourceType === "custom" ? (
        <Badge
          variant="outline"
          className="rounded-sm border-border font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground"
        >
          Private
        </Badge>
      ) : null}
    </div>
  )
}

function CatalogPromptActions({
  prompt,
}: {
  prompt: PublicPrompt
}) {
  const { actions, state, view } = usePromptGallery()
  const savedPrompt = view.savedCatalogPrompts[prompt.id]
  const buttonLabel =
    state.busyPromptId === prompt.id
      ? "Working..."
      : savedPrompt
        ? "Saved"
        : "Save"

  return (
    <Button
      variant={savedPrompt ? "secondary" : "outline"}
      size="sm"
      disabled={state.busyPromptId === prompt.id}
      onClick={() => void actions.toggleCatalogSave(prompt)}
    >
      {buttonLabel}
    </Button>
  )
}

function SavedPromptActions({
  prompt,
}: {
  prompt: SavedPrompt
}) {
  const { actions, state } = usePromptGallery()
  const isBusy = state.busyPromptId === prompt.id

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        disabled={isBusy}
        onClick={() => void actions.deleteSavedPrompt(prompt)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        title="Remove saved prompt"
      >
        <Trash2Icon data-icon="inline-start" className="size-4" />
      </Button>

      {prompt.sourceType === "custom" ? (
        <Button
          variant="ghost"
          size="icon"
          disabled={isBusy}
          onClick={() => actions.openEditSavedPromptModal(prompt)}
          title="Edit private prompt"
        // className="size-5"
        >
          <SquarePenIcon data-icon="inline-start" className="size-4" />
        </Button>
      ) : null}
    </>
  )
}

export function PromptGallerySaveDialog() {
  const { actions, state } = usePromptGallery()
  const isEditing = state.promptDraftMode === "edit"

  if (!state.promptModalOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/15 px-4">
      <Card className="w-full max-w-xl gap-0 rounded-md border-border py-0 shadow-none">
        <CardHeader className="gap-1 border-b border-border px-4 py-4">
          <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {isEditing ? "Edit a private prompt" : "Save a private prompt"}
          </p>
          <CardTitle className="text-lg tracking-tight">
            {isEditing
              ? "Update a prompt in your saved library"
              : "Add a prompt to your saved library"}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Saved prompts are private to your Google account and appear only
            under your <Badge variant='outline' className="rounded">Saved</Badge> filter.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-4 py-4">
          <div className="grid gap-2">
            <label
              htmlFor="custom-prompt-title"
              className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
            >
              Title
            </label>
            <Input
              id="custom-prompt-title"
              value={state.draft.title}
              onInput={(event) =>
                actions.setDraftTitle(
                  (event.target as HTMLInputElement).value,
                )
              }
              placeholder="Example: Launch announcement prompt"
            />
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="custom-prompt-body"
              className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
            >
              Prompt
            </label>
            <textarea
              id="custom-prompt-body"
              value={state.draft.prompt}
              onInput={(event) =>
                actions.setDraftPrompt(
                  (event.target as HTMLTextAreaElement).value,
                )
              }
              placeholder="Paste the prompt you want to keep handy."
              className="min-h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void actions.submitPromptDraft()}
              disabled={state.submittingPromptDraft}
            >
              {state.submittingPromptDraft
                ? isEditing
                  ? "Saving changes..."
                  : "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Save prompt"}
            </Button>
            <Button
              variant="outline"
              onClick={actions.closePromptModal}
              disabled={state.submittingPromptDraft}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
