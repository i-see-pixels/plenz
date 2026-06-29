import { Card } from "@plenz/ui/components/card"
import { Toaster } from "sonner"
import { PromptGalleryProvider } from "./PromptGalleryProvider"
import {
  PromptGalleryContent,
  PromptGalleryHeader,
  PromptGallerySaveDialog,
  PromptGalleryToasts,
  PromptGalleryToolbar,
} from "./PromptGallerySections"

const PROMPT_GALLERY_TOAST_MAX_WIDTH = 356

export function App() {
  return (
    <PromptGalleryProvider>
      <PromptGalleryScreen />
    </PromptGalleryProvider>
  )
}

function PromptGalleryScreen() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-none flex-col">
        <PromptGalleryHeader />

        <div className="flex flex-1 flex-col gap-4 px-4 py-4">
          <Card className="gap-0 rounded-md border-border py-0 shadow-lg">
            <PromptGalleryToolbar />
          </Card>

          <PromptGalleryContent />
        </div>
      </div>

      <PromptGalleryToasts />
      <Toaster
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast: "left-0 right-0 mx-auto",
          },
          style: {
            width: "fit-content",
            maxWidth: `${PROMPT_GALLERY_TOAST_MAX_WIDTH}px`,
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-xl)"
          },
        }}
      />
      <PromptGallerySaveDialog />
    </div>
  )
}
