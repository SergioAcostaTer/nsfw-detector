import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getScanStatus, startScan } from "@/api/client";

export function useScan(folder: string) {
  const queryClient = useQueryClient();

  const start = useMutation({
    mutationFn: () => startScan(folder),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scanStatus"] }),
  });

  const status = useQuery({
    queryKey: ["scanStatus"],
    queryFn: () => getScanStatus().then((response) => response.data),
    refetchInterval: (query) => (query.state.data?.running ? 1000 : false),
  });

  return { start, status };
}
