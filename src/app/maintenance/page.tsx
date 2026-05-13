import { Wrench } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "서비스 점검 중 | Small-Shop ERP",
  description: "서비스 점검 중입니다.",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="size-14 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Wrench className="size-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            서비스 점검 중
          </h1>
          <p className="text-gray-600 mt-3 text-sm leading-relaxed">
            더 나은 서비스를 제공해 드리기 위해
            <br />
            시스템 점검을 진행하고 있습니다.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl shadow-black/5 border border-gray-100 p-8">
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="inline-block size-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                점검이 완료되면 자동으로 정상 이용이 가능합니다.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="inline-block size-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                점검 중에는 로그인 및 모든 기능 이용이 제한됩니다.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="inline-block size-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                문의 사항은 관리자에게 연락 부탁드립니다.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>이용에 불편을 드려 죄송합니다.</p>
        </div>
      </div>
    </div>
  );
}
