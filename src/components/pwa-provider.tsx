"use client";

import { SerwistProvider } from "@serwist/next/react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const scope = basePath ? `${basePath}/` : "/";

  return (
    <SerwistProvider
      swUrl={`${basePath}/sw.js`}
      disable={process.env.NODE_ENV === "development"}
      options={{ scope }}
    >
      {children}
    </SerwistProvider>
  );
}
