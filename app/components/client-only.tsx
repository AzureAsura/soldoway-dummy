"use client";

import { useSyncExternalStore, PropsWithChildren } from "react";

const subscribe = () => () => {};

export function ClientOnly({ children }: PropsWithChildren) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) return null;
  return <>{children}</>;
}
