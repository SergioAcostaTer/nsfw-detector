import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteFiles, getResults, getResultsCount, trashFiles } from "@/api/client";
import { toast } from "@/components/ui";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useResults(filter: string, folder: string | null, sortBy: string = "score_desc", pageSize: number = 60) {
  const queryClient = useQueryClient();

  const resultsQuery = useInfiniteQuery({
    queryKey: ["results", filter, folder, sortBy],
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      getResults({
        decision: filter !== "all" ? filter : undefined,
        folder: folder ?? undefined,
        status: "active",
        sort_by: sortBy,
        limit: pageSize,
        offset: pageParam * pageSize,
      }).then((response) => response.data),
    getNextPageParam: (lastPage, allPages) => {
      const loadedItemCount = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return loadedItemCount < lastPage.total ? allPages.length : undefined;
    },
  });

  const counts = useQuery({
    queryKey: queryKeys.resultsCount,
    queryFn: () => getResultsCount().then((response) => response.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["results"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.resultsCount });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    queryClient.invalidateQueries({ queryKey: queryKeys.folders });
  };

  const trash = useMutation({
    mutationFn: (ids: number[]) => trashFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} moved to trash` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to move files to trash", variant: "error" }),
  });

  const remove = useMutation({
    mutationFn: (ids: number[]) => deleteFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} deleted` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to delete files", variant: "error" }),
  });

  const items = resultsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = resultsQuery.data?.pages[0]?.total ?? 0;

  return { resultsQuery, items, total, counts, trash, remove };
}
