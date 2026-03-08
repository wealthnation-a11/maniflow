import { useSyncExternalStore } from "react";
import { getBusinessState, subscribe } from "@/store/businessStore";

export function useBusiness() {
  const state = useSyncExternalStore(subscribe, getBusinessState);
  return state;
}
