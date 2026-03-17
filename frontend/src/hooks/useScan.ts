import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { cancelScan, getScanStatus, startPcScan, startScan } from "@/api/client";
import { toast } from "@/components/ui";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useScan(folder: string) {
  const queryClient = useQueryClient();
  const wasRunningRef = useRef(false);

  const invalidate = (jobId?: string | null) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.scanStatus(jobId) });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    queryClient.invalidateQueries({ queryKey: queryKeys.folders });
    queryClient.invalidateQueries({ queryKey: ["results"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.resultsCount });
  };

  const start = useMutation({
    mutationFn: () => startScan(folder),
    onMutate: () => {
      queryClient.setQueryData(queryKeys.scanStatus(), {
        running: true,
        progress: 0,
        total: 0,
        flagged: 0,
        current_file: "Preparing scan...",
        job_id: null,
        status: "pending",
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.scanStatus(), {
        running: true,
        progress: 0,
        total: 0,
        flagged: 0,
        current_file: "Preparing scan...",
        job_id: response.data.job_id ?? null,
        status: "pending",
      });
      toast({ title: "Scan started" });
      invalidate(response.data.job_id);
    },
    onError: () => toast({ title: "Failed to start scan", variant: "error" }),
  });

  const startPc = useMutation({
    mutationFn: () => startPcScan(),
    onMutate: () => {
      queryClient.setQueryData(queryKeys.scanStatus(), {
        running: true,
        progress: 0,
        total: 0,
        flagged: 0,
        current_file: "Discovering files...",
        job_id: null,
        status: "pending",
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.scanStatus(), {
        running: true,
        progress: 0,
        total: 0,
        flagged: 0,
        current_file: "Discovering files...",
        job_id: response.data.job_id ?? null,
        status: "pending",
      });
      toast({ title: "Full PC scan started" });
      invalidate(response.data.job_id);
    },
    onError: () => toast({ title: "Failed to start full PC scan", variant: "error" }),
  });

  const cancel = useMutation({
    mutationFn: () => cancelScan(status.data?.job_id),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.scanStatus(), (current: Record<string, unknown> | undefined) => ({
        ...(current ?? {}),
        running: false,
        status: "cancelled",
        current_file: "",
      }));
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

  useEffect(() => {
    const isRunning = Boolean(status.data?.running);
    if (wasRunningRef.current && !isRunning) {
      invalidate(status.data?.job_id);
    }
    wasRunningRef.current = isRunning;
  }, [status.data?.job_id, status.data?.running]);

  return { start, startPc, cancel, status };
}
