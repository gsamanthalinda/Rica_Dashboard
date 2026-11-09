"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";

interface State<T> {
  key: string;
  attempt: number;
  data?: T;
  error?: ApiError;
}

export interface ApiState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
}

export function useApi<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
): ApiState<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, attempt, data });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const error =
          err instanceof ApiError
            ? err
            : new ApiError("Something went wrong.", null);
        setState((prev) => ({
          key,
          attempt,
          data: prev && prev.key === key ? prev.data : undefined,
          error,
        }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  const forThisKey = state && state.key === key ? state : null;
  const settled = forThisKey && forThisKey.attempt === attempt;
  return {
    data: forThisKey?.data,
    error: settled ? forThisKey.error : undefined,
    loading: !settled && forThisKey?.data === undefined,
    refreshing: !settled && forThisKey?.data !== undefined,
    reload,
  };
}
