import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteFiles, getResults, unvaultFiles } from "@/api/client";
import { toast } from "@/components/ui";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useVault() {
  const queryClient = useQueryClient();

  const vault = useQuery({
    queryKey: queryKeys.vault,
    queryFn: () => getResults({ status: "vaulted", limit: 500 }).then((response) => response.data),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.vault });
    queryClient.invalidateQueries({ queryKey: ["results"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.resultsCount });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
  };

  const restore = useMutation({
    mutationFn: (ids: number[]) => unvaultFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} restored from vault` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to restore files from vault", variant: "error" }),
  });

  const remove = useMutation({
    mutationFn: (ids: number[]) => deleteFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} vaulted file${ids.length === 1 ? "" : "s"} deleted` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to delete vaulted files", variant: "error" }),
  });

  return { vault, restore, remove };
}
