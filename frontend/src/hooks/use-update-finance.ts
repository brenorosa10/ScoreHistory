import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFinance, type FinancePayload } from "@/lib/api";
import { financeQueryKey, racketsQueryKey } from "@/lib/queries";

export function useUpdateFinance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FinancePayload) => updateFinance(payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(financeQueryKey, updated);
      await queryClient.invalidateQueries({ queryKey: racketsQueryKey });
    },
  });
}
