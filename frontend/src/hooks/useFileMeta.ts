import { useQuery } from "@tanstack/react-query";

import { getFileMeta } from "@/features/review/api";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useFileMeta(path: string | null) {
  return useQuery({
    queryKey: queryKeys.fileMeta(path),
    queryFn: () => getFileMeta(path as string).then((response) => response.data),
    enabled: Boolean(path),
    staleTime: 60_000,
  });
}
