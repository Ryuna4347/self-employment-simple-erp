import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface PhoneNumberResponse {
  data: { phoneNumber: string | null };
}

export function usePhoneNumber(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["profile", "phoneNumber"],
    queryFn: async () => {
      const res = await apiClient<PhoneNumberResponse>("/api/profile/phone", {
        method: "GET",
      });
      return res.data.phoneNumber;
    },
    enabled: options?.enabled ?? true,
  });
}
