import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteFiles, getResults, restoreFiles } from "@/api/client";
import { toast } from "@/components/ui";

export function useQuarantine() {
  const queryClient = useQueryClient();

  const quarantine = useQuery({
    queryKey: ["quarantine"],
    queryFn: () => getResults({ status: "quarantined", limit: 500 }).then((response) => response.data),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["quarantine"] });
    queryClient.invalidateQueries({ queryKey: ["results"] });
    queryClient.invalidateQueries({ queryKey: ["resultsCount"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["headerSearch"] });
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
