import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteFiles, getResults, restoreFiles } from "@/api/client";
import { toast } from "@/components/ui";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useQuarantine() {
  const queryClient = useQueryClient();

  const quarantine = useQuery({
    queryKey: queryKeys.quarantine,
    queryFn: () => getResults({ status: "quarantined", limit: 500 }).then((response) => response.data),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.quarantine });
    queryClient.invalidateQueries({ queryKey: ["results"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.resultsCount });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
  };

  const restore = useMutation({
    mutationFn: (ids: number[]) => restoreFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} restored` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to restore files", variant: "error" }),
  });

  const remove = useMutation({
    mutationFn: (ids: number[]) => deleteFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} quarantined file${ids.length === 1 ? "" : "s"} deleted` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to delete quarantined files", variant: "error" }),
  });

  return { quarantine, restore, remove };
}
