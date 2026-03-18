import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getScanStatus } from "@/api/client";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { ScanStatus } from "@/shared/types/api";

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "failed", "idle"]);

const IDLE_STATUS: ScanStatus = {
  running: false,
  progress: 0,
  total: 0,
  flagged: 0,
  current_file: "",
  job_id: null,
  status: "idle",
};

export function setScanStatusCache(queryClient: ReturnType<typeof useQueryClient>, data: ScanStatus) {
  queryClient.setQueryData(queryKeys.scanStatus(), data);
  if (data.job_id) {
    queryClient.setQueryData(queryKeys.scanStatus(data.job_id), data);
  }
}

export function useScanStatus() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: queryKeys.scanStatus(),
    queryFn: () => getScanStatus().then((response) => response.data),
    initialData: IDLE_STATUS,
  });

  useEffect(() => {
    if (!status.data?.running && !status.data?.job_id) {
      return;
    }

    const jobId = status.data?.job_id ?? null;
    const eventSource = new EventSource(`/api/scan/stream${jobId ? `?job_id=${jobId}` : ""}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as ScanStatus;
      setScanStatusCache(queryClient, data);

      if (data.status && TERMINAL_STATUSES.has(data.status)) {
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      void queryClient.invalidateQueries({ queryKey: queryKeys.scanStatus() });
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.scanStatus(jobId) });
      }
    };

    return () => eventSource.close();
  }, [queryClient, status.data?.job_id, status.data?.running]);

  return status;
}
