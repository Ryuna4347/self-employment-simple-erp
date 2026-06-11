"use client";

import type { WorkRecordItem } from "../hooks/use-work-records";

interface RecordItemsTableProps {
  items: WorkRecordItem[];
  totalAmount: number;
}

/**
 * 거래 품목 테이블 (품명/수량/금액 + 합계 푸터)
 */
export function RecordItemsTable({ items, totalAmount }: RecordItemsTableProps) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-2">거래 품목</h4>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-gray-700 font-medium">
                품명
              </th>
              <th className="px-3 py-2 text-right text-gray-700 font-medium">
                수량
              </th>
              <th className="px-3 py-2 text-right text-gray-700 font-medium">
                금액
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900">{item.name}</td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {item.quantity}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">
                  {item.amount.toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td
                colSpan={2}
                className="px-3 py-2 text-right font-semibold text-gray-900"
              >
                합계
              </td>
              <td className="px-3 py-2 text-right font-bold text-gray-900">
                {totalAmount.toLocaleString()}원
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
