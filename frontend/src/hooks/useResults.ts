import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteFiles, getResults, getResultsCount, quarantineFiles } from "@/api/client";
import { toast } from "@/components/ui";

export function useResults(filter: string, page: number, pageSize: number) {
  const queryClient = useQueryClient();

  const results = useQuery({
    queryKey: ["results", filter, page, pageSize],
    queryFn: () =>
      getResults({
        decision: filter !== "all" ? filter : undefined,
        status: "active",
        limit: pageSize,
        offset: page * pageSize,
      }).then((response) => response.data),
  });

  const counts = useQuery({
    queryKey: ["resultsCount"],
    queryFn: () => getResultsCount().then((response) => response.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["results"] });
    queryClient.invalidateQueries({ queryKey: ["resultsCount"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    queryClient.invalidateQueries({ queryKey: ["headerSearch"] });
  };

  const quarantine = useMutation({
    mutationFn: (ids: number[]) => quarantineFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} quarantined` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to quarantine files", variant: "error" }),
  });

  const remove = useMutation({
    mutationFn: (ids: number[]) => deleteFiles(ids),
    onSuccess: (_response, ids) => {
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} deleted` });
      invalidate();
    },
    onError: () => toast({ title: "Failed to delete files", variant: "error" }),
  });

  return { results, counts, quarantine, remove };
}
