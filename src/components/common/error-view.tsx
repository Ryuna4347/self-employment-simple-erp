import { XCircle } from "lucide-react";

interface ErrorViewProps {
  message: string;
}

export function ErrorView({ message }: ErrorViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded shadow-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-4">
          <XCircle className="size-16 text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900">오류 발생</h1>
          <p className="text-center text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
}
