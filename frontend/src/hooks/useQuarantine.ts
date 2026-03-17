import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteFiles, getResults, restoreFiles } from "@/api/client";

export function useQuarantine() {
  const queryClient = useQueryClient();

  const quarantine = useQuery({
    queryKey: ["quarantine"],
    queryFn: () => getResults({ status: "quarantined", limit: 200 }).then((response) => response.data),
  });

  const restore = useMutation({
    mutationFn: (ids: number[]) => restoreFiles(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quarantine"] }),
  });

  const remove = useMutation({
    mutationFn: (ids: number[]) => deleteFiles(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quarantine"] }),
  });

  return { quarantine, restore, remove };
}
