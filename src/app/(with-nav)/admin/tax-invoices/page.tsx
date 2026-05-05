import { Suspense } from "react"
import { LoadingView } from "@/components/common/loading-view"
import { TaxPartiesContent } from "./components/tax-parties-content"

export default function TaxInvoicesPage() {
  return (
    <Suspense fallback={<LoadingView message="사업자 정보를 불러오는 중입니다" />}>
      <TaxPartiesContent />
    </Suspense>
  )
}
