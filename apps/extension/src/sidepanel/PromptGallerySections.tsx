import type { PublicPrompt, SavedPrompt } from "@plenz/types";
import { Badge } from "@plenz/ui/components/badge";
import { Button } from "@plenz/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@plenz/ui/components/card";
import { Input } from "@plenz/ui/components/input";
import { Skeleton } from "@plenz/ui/components/skeleton";
import { cn } from "@plenz/ui/index";
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
} from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AuthStatus } from "../components/AuthStatus";
import { sendRpc } from "../shared/rpc";
import { usePromptGallery } from "./PromptGalleryProvider";
import type {
  GalleryFilter,
  PromptGalleryActions,
} from "./prompt-gallery.types";
import {
  formatDateLabel,
  formatPromptPreview,
  isPublicPrompt,
} from "./prompt-gallery.utils";

const FILTER_OPTIONS: Array<{
  id: GalleryFilter;
  label: string;
}> = [
  { id: "trending", label: "Trending" },
  { id: "newest", label: "Newly added" },
  { id: "saved", label: "Saved" },
];

export function PromptGalleryHeader() {
  const { actions } = usePromptGallery();

  return (
    <Card className="rounded-none border-0 border-b bg-background py-0 shadow-none gap-0">
      <CardHeader className="gap-3 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-mono text-xl font-bold uppercase">
            Prompt gallery
          </h1>
          <Button
            onClick={actions.openCreatePromptModal}
            className="shrink-0 gap-2"
          >
            <Plus data-icon="inline-start" />
            Save prompt
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <AuthStatus />
      </CardContent>
    </Card>
  );
}

export function PromptGalleryToolbar() {
  const { actions, state } = usePromptGallery();

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
          aria-label="Search prompts"
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
  );
}

function PromptGalleryFilterButton({
  filter,
  label,
}: {
  filter: GalleryFilter;
  label: string;
}) {
  const { actions, state } = usePromptGallery();
  const count =
    filter === "trending"
      ? state.publicTrendingPrompts.data.length
      : filter === "newest"
        ? state.publicNewestPrompts.data.length
        : state.savedPrompts.data.length;

  return (
    <Button
      variant={state.activeFilter === filter ? "default" : "outline"}
      size="sm"
      onClick={() => actions.setActiveFilter(filter)}
      aria-pressed={state.activeFilter === filter}
      className="justify-between"
    >
      <span>{label}</span>
      <Badge
        variant="outline"
        className={cn(
          "rounded-sm",
          state.activeFilter === filter
            ? "text-primary-foreground"
            : "text-foreground",
        )}
      >
        {count}
      </Badge>
    </Button>
  );
}

export function PromptGalleryToasts() {
  const { actions, state } = usePromptGallery();
  const lastToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.actionState) {
      lastToastKeyRef.current = null;
      return;
    }

    const toastKey = `${state.actionState.kind}:${state.actionState.title}:${state.actionState.message}`;

    if (lastToastKeyRef.current === toastKey) {
      return;
    }

    lastToastKeyRef.current = toastKey;

    if (state.actionState.kind === "success") {
      toast.success(state.actionState.title, {
        description: state.actionState.message,
      });
    } else {
      toast.error(state.actionState.title, {
        description: state.actionState.message,
      });
    }

    actions.clearActionState();
  }, [actions, state.actionState]);

  return null;
}

export function PromptGalleryContent() {
  const { actions, state, view } = usePromptGallery();

  if (view.activeLoading) {
    return <PromptGalleryLoadingState />;
  }

  if (view.activeError) {
    const offline = !navigator.onLine;
    return (
      <PromptGalleryMessageCard
        title="Couldn't load prompts"
        description={
          offline
            ? "You're offline. Reconnect and try again."
            : "Something went wrong reaching the prompt library. Try again in a moment."
        }
        detail={offline ? undefined : view.activeError}
        tone="error"
      >
        <Button onClick={actions.retry}>Try again</Button>
      </PromptGalleryMessageCard>
    );
  }

  if (view.isSavedViewLocked) {
    return (
      <PromptGalleryMessageCard
        title="Your saved prompts"
        description="Sign in with Google to keep your own prompts here and save ones you like from Trending. Trending and Newly added work without an account."
      >
        <Button onClick={() => void sendRpc("AUTH_SIGN_IN")}>
          Sign in with Google
        </Button>
      </PromptGalleryMessageCard>
    );
  }

  if (view.selectedPrompts.length === 0) {
    const search = state.searchTerm.trim();
    if (search) {
      return (
        <PromptGalleryMessageCard
          title="No matches"
          description={`No prompts here match "${search}". Try other words or another tab.`}
        >
          <Button variant="outline" onClick={() => actions.setSearchTerm("")}>
            Clear search
          </Button>
        </PromptGalleryMessageCard>
      );
    }
    if (state.activeFilter === "saved") {
      return (
        <PromptGalleryMessageCard
          title="No saved prompts yet"
          description="Press Save on a prompt in Trending to keep it, or add your own. Saved prompts also show up when you type / in a chat box."
        >
          <Button onClick={actions.openCreatePromptModal}>Add a prompt</Button>
          <Button
            variant="outline"
            onClick={() => actions.setActiveFilter("trending")}
          >
            Browse Trending
          </Button>
        </PromptGalleryMessageCard>
      );
    }
    return (
      <PromptGalleryMessageCard
        title="Nothing here yet"
        description="New prompts show up here as they're added. Check back soon."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {view.selectedPrompts.map((prompt) => (
        <PromptGalleryPromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  );
}

function PromptGalleryLoadingState() {
  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-busy="true"
      aria-label="Loading prompts"
    >
      <Skeleton className="h-36 w-full rounded-sm" />
      <Skeleton className="h-36 w-full rounded-sm" />
      <Skeleton className="h-36 w-full rounded-sm" />
    </div>
  );
}

function PromptGalleryMessageCard({
  children,
  description,
  detail,
  title,
  tone = "default",
}: {
  children?: ReactNode;
  description: string;
  /** Technical detail, e.g. the error as reported. */
  detail?: string;
  title: string;
  tone?: "default" | "error";
}) {
  return (
    <Card
      className="gap-0 rounded-md border-border py-0 shadow-none"
      role={tone === "error" ? "alert" : "status"}
      data-gallery-state={title}
    >
      <CardContent className="flex flex-col gap-2 px-4 py-4">
        <p
          className={`font-mono text-[10px] font-semibold tracking-[0.16em] uppercase ${
            tone === "error" ? "text-accent-signal" : "text-muted-foreground"
          }`}
        >
          {title}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {detail ? (
          <p className="font-mono text-xs break-words text-muted-foreground">
            {detail}
          </p>
        ) : null}
        {children ? (
          <div className="mt-1 flex flex-wrap gap-2">{children}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PromptGalleryPromptCard({
  prompt,
}: {
  prompt: PublicPrompt | SavedPrompt;
}) {
  const { actions, state } = usePromptGallery();
  const expanded = !!state.expandedPromptIds[prompt.id];
  const promptText = formatPromptPreview(prompt.prompt, expanded);
  const isExpandable = prompt.prompt.length > 240;

  return (
    <Card className="gap-0 rounded-md border-border py-0 shadow-none">
      <CardHeader className="gap-2 px-4 py-4">
        <CardTitle className="text-xl font-semibold flex flex-col gap-2">
          <div className="flex justify-between items-start gap-x-2">
            <h2 className="line-clamp-2">{prompt.title}</h2>
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
          <PromptGalleryPromptBadges prompt={prompt} />
        </CardTitle>
      </CardHeader>

      <CardContent
        className={cn("px-4 pb-4", isExpandable ? "test" : "")}
        onClick={() => isExpandable && actions.togglePromptExpanded(prompt.id)}
      >
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground mb-2 rounded-2xl">
          {promptText}
        </p>

        <div className="flex items-center justify-center text-muted-foreground">
          {isExpandable ? (
            expanded ? (
              <ChevronUpIcon className="size-5" />
            ) : (
              <ChevronDownIcon className="size-5" />
            )
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PromptGalleryPromptActions({
  prompt,
  actions,
}: {
  prompt: PublicPrompt | SavedPrompt;
  actions: PromptGalleryActions;
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
        aria-label={`Share "${prompt.title}"`}
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
        aria-label={`Copy "${prompt.title}"`}
        title="Copy prompt"
      >
        <CopyIcon data-icon="inline-start" className="size-4" />
      </Button>
    </div>
  );
}

function PromptGalleryPromptBadges({
  prompt,
}: {
  prompt: PublicPrompt | SavedPrompt;
}) {
  const categories = prompt.category;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {categories.map((entry) => (
        <Badge
          key={`${prompt.id}-${entry}`}
          variant="outline"
          className="rounded-sm border-border font-mono text-[10px] tracking-[0.12em] text-muted-foreground"
        >
          {entry}
        </Badge>
      ))}

      {"savedAt" in prompt && prompt.sourceType === "custom" ? (
        <Badge
          variant="outline"
          className="rounded-sm border-border font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground"
        >
          Private
        </Badge>
      ) : null}
    </div>
  );
}

function CatalogPromptActions({ prompt }: { prompt: PublicPrompt }) {
  const { actions, state, view } = usePromptGallery();
  const savedPrompt = view.savedCatalogPrompts[prompt.id];
  const isBusy = !!state.busyPromptIds[prompt.id];
  const buttonLabel = isBusy ? "Working..." : savedPrompt ? "Saved" : "Save";

  return (
    <Button
      variant={savedPrompt ? "secondary" : "outline"}
      size="sm"
      disabled={isBusy}
      onClick={() => void actions.toggleCatalogSave(prompt)}
    >
      {buttonLabel}
    </Button>
  );
}

function SavedPromptActions({ prompt }: { prompt: SavedPrompt }) {
  const { actions, state } = usePromptGallery();
  const isBusy = !!state.busyPromptIds[prompt.id];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        disabled={isBusy}
        onClick={() => void actions.deleteSavedPrompt(prompt)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        title="Remove saved prompt"
        aria-label={`Remove "${prompt.title}" from saved`}
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
          aria-label={`Edit "${prompt.title}"`}
          // className="size-5"
        >
          <SquarePenIcon data-icon="inline-start" className="size-4" />
        </Button>
      ) : null}
    </>
  );
}

export function PromptGallerySaveDialog() {
  const { actions, state } = usePromptGallery();
  const modal = state.promptModal;

  if (modal.kind === "closed") {
    return null;
  }

  const isEditing = modal.mode === "edit";
  const isSubmitting = modal.kind === "submitting";

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
            under your{" "}
            <Badge variant="outline" className="rounded">
              Saved
            </Badge>{" "}
            filter.
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
              value={modal.draft.title}
              onInput={(event) =>
                actions.setDraftTitle((event.target as HTMLInputElement).value)
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
              value={modal.draft.prompt}
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
              disabled={isSubmitting}
            >
              {isSubmitting
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
