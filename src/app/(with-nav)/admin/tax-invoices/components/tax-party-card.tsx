import type { ReactNode } from "react"
import { Building2, Mail, MapPin, Pencil, Trash2, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatBizNo } from "@/lib/utils"
import type { TaxParty } from "../hooks/use-tax-parties"

interface TaxPartyCardProps {
  party: TaxParty
  writable: boolean
  onEdit: (party: TaxParty) => void
  onDelete: (party: TaxParty) => void
}

export function TaxPartyCard({ party, writable, onEdit, onDelete }: TaxPartyCardProps) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-foreground">{party.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{formatBizNo(party.bizNo)}</p>
        </div>

        {writable && (
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(party)}>
              <Pencil className="size-4" />
              편집
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onDelete(party)}>
              <Trash2 className="size-4" />
              삭제
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <InfoItem icon={<UserRound className="size-4" />} label="대표자명" value={party.representativeName} />
        <InfoItem
          icon={<Building2 className="size-4" />}
          label="업태/종목"
          value={[party.businessType, party.businessItem].filter(Boolean).join(" / ")}
        />
        <InfoItem icon={<Mail className="size-4" />} label="세금계산서 이메일" value={party.taxInvoiceEmail} />
        <InfoItem icon={<MapPin className="size-4" />} label="주소" value={party.address} />
      </div>
    </article>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value?: string | null
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium text-foreground">{value || "-"}</p>
      </div>
    </div>
  )
}
