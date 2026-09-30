import { Loader2 } from "lucide-react";
import type { DashboardPeriod } from "../hooks/use-dashboard";

/**
 * 대시보드 차트 영역 높이 (px)
 *
 * dashboard-charts.tsx(실제 차트)와 DashboardChartsSkeleton(로딩 중 자리 표시)이 같은 값을 써야
 * 차트 코드를 받기 전후로 아래 콘텐츠(제거/추가 매장 목록)가 밀리지 않는다.
 */
export const REVENUE_CHART_HEIGHT = 280;
export const CHART_HEIGHT = 250;

/** 조회 모드별 차트 카드 구성 (dashboard-charts.tsx와 같은 순서·제목·높이) */
function getChartCards(period: DashboardPeriod) {
  return [
    { title: "매출 추이", height: REVENUE_CHART_HEIGHT },
    {
      title: period === "daily" ? "월 누적 매출" : "연 누적 매출",
      height: CHART_HEIGHT,
    },
    // 비용 추이는 월별 모드에서만 표시
    ...(period === "monthly"
      ? [{ title: "비용 추이", height: CHART_HEIGHT }]
      : []),
    { title: "수금 현황", height: CHART_HEIGHT },
  ];
}

/**
 * 차트 코드(recharts)를 받는 동안 보여 주는 자리 표시
 *
 * 실제 차트와 같은 카드·제목·높이로 그려 로딩 전후로 레이아웃이 바뀌지 않게 한다.
 */
export function DashboardChartsSkeleton({
  period,
}: {
  period: DashboardPeriod;
}) {
  return (
    <div className="space-y-6 mb-6" aria-busy="true">
      {getChartCards(period).map((card) => (
        <div key={card.title} className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            {card.title}
          </h3>
          <div
            className="flex items-center justify-center"
            style={{ height: card.height }}
          >
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      ))}
    </div>
  );
}
