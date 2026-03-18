import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { cancelScan, getScanStatus, startPcScan, startScan } from "@/api/client";
import { toast } from "@/components/ui";
import { setScanStatusCache } from "@/hooks/useScanStatus";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { ScanMode } from "@/shared/types/api";

export function useScan(folder: string, scanMode: ScanMode) {
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
    mutationFn: () => startScan(folder, scanMode),
    onMutate: () => {
      setScanStatusCache(queryClient, {
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
      setScanStatusCache(queryClient, {
        running: true,
        progress: 0,
        total: 0,
        flagged: 0,
        current_file: "Preparing scan...",
        job_id: response.data.job_id ?? null,
        status: "pending",
      });
      toast({ title: scanMode === "images" ? "Photo scan started" : scanMode === "videos" ? "Video scan started" : "Mixed media scan started" });
      invalidate(response.data.job_id);
    },
    onError: () => toast({ title: "Failed to start scan", variant: "error" }),
  });

  const startPc = useMutation({
    mutationFn: () => startPcScan(scanMode),
    onMutate: () => {
      setScanStatusCache(queryClient, {
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
      setScanStatusCache(queryClient, {
        running: true,
        progress: 0,
        total: 0,
        flagged: 0,
        current_file: "Discovering files...",
        job_id: response.data.job_id ?? null,
        status: "pending",
      });
      toast({ title: scanMode === "images" ? "Full PC photo scan started" : scanMode === "videos" ? "Full PC video scan started" : "Full PC mixed scan started" });
      invalidate(response.data.job_id);
    },
    onError: () => toast({ title: "Failed to start full PC scan", variant: "error" }),
  });

  const cancel = useMutation({
    mutationFn: () => cancelScan(status.data?.job_id),
    onSuccess: () => {
      setScanStatusCache(queryClient, {
        running: false,
        progress: status.data?.progress ?? 0,
        total: status.data?.total ?? 0,
        flagged: status.data?.flagged ?? 0,
        current_file: "",
        job_id: status.data?.job_id ?? null,
        status: "cancelled",
      });
      toast({ title: "Scan cancelled" });
      invalidate(status.data?.job_id);
    },
    onError: () => toast({ title: "Failed to cancel scan", variant: "error" }),
  });

  const status = useQuery({
    queryKey: queryKeys.scanStatus(),
    queryFn: () => getScanStatus().then((response) => response.data),
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
