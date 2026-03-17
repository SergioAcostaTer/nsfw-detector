import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteFiles, getResults, getResultsCount, quarantineFiles } from "@/api/client";

export function useResults(filter: string) {
  const queryClient = useQueryClient();

  const results = useQuery({
    queryKey: ["results", filter],
    queryFn: () =>
      getResults({
        decision: filter !== "all" ? filter : undefined,
        status: "active",
        limit: 200,
      }).then((response) => response.data),
  });

  const counts = useQuery({
    queryKey: ["resultsCount"],
    queryFn: () => getResultsCount().then((response) => response.data),
  });

  const quarantine = useMutation({
    mutationFn: (ids: number[]) => quarantineFiles(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      queryClient.invalidateQueries({ queryKey: ["resultsCount"] });
    },
  });

  const remove = useMutation({
    mutationFn: (ids: number[]) => deleteFiles(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      queryClient.invalidateQueries({ queryKey: ["resultsCount"] });
    },
  });

  return { results, counts, quarantine, remove };
}
