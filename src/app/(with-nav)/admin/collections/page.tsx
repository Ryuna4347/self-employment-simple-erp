import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { CollectionsContent } from "./components/collections-content"

export default function CollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CollectionsContent />
    </Suspense>
  )
}
