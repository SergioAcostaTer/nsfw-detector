import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cancelScan, getScanStatus, startPcScan, startScan } from "@/api/client";
import { toast } from "@/components/ui";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useScan(folder: string) {
  const queryClient = useQueryClient();

  const invalidate = (jobId?: string | null) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.scanStatus(jobId) });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    queryClient.invalidateQueries({ queryKey: queryKeys.folders });
  };

  const start = useMutation({
    mutationFn: () => startScan(folder),
    onSuccess: (response) => {
      toast({ title: "Scan started" });
      invalidate(response.data.job_id);
    },
    onError: () => toast({ title: "Failed to start scan", variant: "error" }),
  });

  const startPc = useMutation({
    mutationFn: () => startPcScan(),
    onSuccess: (response) => {
      toast({ title: "Full PC scan started" });
      invalidate(response.data.job_id);
    },
    onError: () => toast({ title: "Failed to start full PC scan", variant: "error" }),
  });

  const cancel = useMutation({
    mutationFn: () => cancelScan(status.data?.job_id),
    onSuccess: () => {
      toast({ title: "Scan cancelled" });
      invalidate(status.data?.job_id);
    },
    onError: () => toast({ title: "Failed to cancel scan", variant: "error" }),
  });

  const status = useQuery({
    queryKey: queryKeys.scanStatus(),
    queryFn: () => getScanStatus().then((response) => response.data),
    refetchInterval: (query) => (query.state.data?.running ? 1000 : false),
  });

  return { start, startPc, cancel, status };
}
