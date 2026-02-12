import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { OutstandingContent } from "./components"

export default function OutstandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OutstandingContent />
    </Suspense>
  )
}
