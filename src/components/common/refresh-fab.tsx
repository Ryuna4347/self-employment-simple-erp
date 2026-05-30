"use client";

import { RefreshCw } from "lucide-react";

interface RefreshFabProps {
  onRefresh: () => void;
  isFetching: boolean;
  offset?: "default" | "stacked";
}

export function RefreshFab({
  onRefresh,
  isFetching,
  offset = "default",
}: RefreshFabProps) {
  const bottom = offset === "stacked" ? "bottom-[9.5rem]" : "bottom-[5.75rem]";

  return (
    <button
      onClick={onRefresh}
      disabled={isFetching}
      className={`fixed ${bottom} right-7 size-12 rounded-full shadow-md transition-all z-40 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
      aria-label="새로고침"
    >
      <RefreshCw className={`size-5 ${isFetching ? "animate-spin" : ""}`} />
    </button>
  );
}
