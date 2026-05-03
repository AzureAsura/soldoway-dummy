"use client";

import { useEffect, useState, PropsWithChildren } from "react";

export function ClientOnly({ children }: PropsWithChildren) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <>{children}</>;
}
