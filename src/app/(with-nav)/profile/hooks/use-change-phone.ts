import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface ChangePhoneInput {
  phoneNumber: string | null;
}

interface ChangePhoneResponse {
  data: { phoneNumber: string | null };
  message?: string;
}

export function useChangePhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ChangePhoneInput) => {
      return apiClient<ChangePhoneResponse>("/api/profile/phone", {
        method: "PATCH",
        json: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", "phoneNumber"] });
    },
  });
}
