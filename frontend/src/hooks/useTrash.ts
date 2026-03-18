import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteFiles, getResults, restoreTrashFiles } from "@/api/client";
import { toast } from "@/components/ui";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useTrash() {
  const queryClient = useQueryClient();

  const trash = useQuery({
    queryKey: queryKeys.trash,
    queryFn: () => getResults({ status: "quarantined", limit: 500 }).then((response) => response.data),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trash });
    queryClient.invalidateQueries({ queryKey: ["results"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.resultsCount });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
  };

  const restore = useMutation({
    mutationFn: (ids: number[]) => restoreTrashFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} restored from trash` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to restore files from trash", variant: "error" }),
  });

  const remove = useMutation({
    mutationFn: (ids: number[]) => deleteFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} trashed file${ids.length === 1 ? "" : "s"} deleted` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to delete trashed files", variant: "error" }),
  });

  return { trash, restore, remove };
}
