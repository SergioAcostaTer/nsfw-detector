import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cancelScan, getScanStatus, startPcScan, startScan } from "@/api/client";
import { toast } from "@/components/ui";

export function useScan(folder: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["scanStatus"] });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
  };

  const start = useMutation({
    mutationFn: () => startScan(folder),
    onSuccess: () => {
      toast({ title: "Scan started" });
      invalidate();
    },
    onError: () => toast({ title: "Failed to start scan", variant: "error" }),
  });

  const startPc = useMutation({
    mutationFn: () => startPcScan(),
    onSuccess: () => {
      toast({ title: "Full PC scan started" });
      invalidate();
    },
    onError: () => toast({ title: "Failed to start full PC scan", variant: "error" }),
  });

  const cancel = useMutation({
    mutationFn: () => cancelScan(),
    onSuccess: () => {
      toast({ title: "Scan cancelled" });
      invalidate();
    },
    onError: () => toast({ title: "Failed to cancel scan", variant: "error" }),
  });

  const status = useQuery({
    queryKey: ["scanStatus"],
    queryFn: () => getScanStatus().then((response) => response.data),
    refetchInterval: (query) => (query.state.data?.running ? 1000 : false),
  });

  return { start, startPc, cancel, status };
}
