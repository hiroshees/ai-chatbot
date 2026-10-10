"use client";

import { useCallback, useReducer } from "react";
import {
  initialStorageWarning,
  storageWarningReducer,
} from "@/lib/storage-warning.ts";

export function useStorageWarning() {
  const [state, dispatch] = useReducer(storageWarningReducer, initialStorageWarning);
  return {
    open: state.open,
    // ストリームで storage_full を受け取ったときに呼ぶ
    notifyFull: useCallback(() => dispatch("full"), []),
    close: useCallback(() => dispatch("close"), []),
    reset: useCallback(() => dispatch("reset"), []),
  };
}
