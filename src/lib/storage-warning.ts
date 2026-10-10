// 容量警告モーダルの表示状態。検知時に1回だけ開き、閉じた後は「新しい会話」まで再表示しない
export type StorageWarningState = { open: boolean; shown: boolean };

export type StorageWarningAction = "full" | "close" | "reset";

export const initialStorageWarning: StorageWarningState = { open: false, shown: false };

export function storageWarningReducer(
  state: StorageWarningState,
  action: StorageWarningAction,
): StorageWarningState {
  switch (action) {
    case "full":
      return state.shown ? state : { open: true, shown: true };
    case "close":
      return { ...state, open: false };
    case "reset":
      return initialStorageWarning;
  }
}
