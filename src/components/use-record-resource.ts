"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/client-api";

export function useRecordResource<Result>(url: string | null, revision: number) {
  const key = `${url}:${revision}`;
  const [state, setState] = useState<{ key: string; data: Result | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    requestJson<Result>(url, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ key, data: null, error: error instanceof Error ? error.message : "تعذّر تحميل السجلات." });
        }
      });
    return () => controller.abort();
  }, [url, key]);

  const current = url && state?.key === key ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: Boolean(url && !current),
  };
}
