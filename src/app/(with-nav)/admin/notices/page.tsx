import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { NoticesContent } from "./components"

export default function NoticesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NoticesContent />
    </Suspense>
  )
}
