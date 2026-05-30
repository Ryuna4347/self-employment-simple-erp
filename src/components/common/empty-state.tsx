import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  variant?: "plain" | "card";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  variant = "plain",
}: EmptyStateProps) {
  if (variant === "card") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <Icon className="size-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-base font-medium">{title}</p>
        {description && (
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <Icon className="size-12 mx-auto text-gray-300 mb-3" />
      <p className="text-gray-400">{title}</p>
      {description && (
        <p className="text-gray-400 text-sm mt-1">{description}</p>
      )}
    </div>
  );
}
