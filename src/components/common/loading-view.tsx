import { Loader2 } from "lucide-react";

interface LoadingViewProps {
  message: string;
}

export function LoadingView({ message }: LoadingViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-12 text-indigo-600 animate-spin" />
        <p className="text-lg text-gray-600">{message}</p>
      </div>
    </div>
  );
}
