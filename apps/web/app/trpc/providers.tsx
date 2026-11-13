"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  TRPCClientError,
  type ServerRouter,
} from "@repo/trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState, type ReactNode } from "react";

export const { TRPCProvider, useTRPC } = createTRPCContext<ServerRouter>();

/**
 * Retry network failures and 5xx (the server may recover), never 4xx: bad input or
 * "not signed in" fails the same way every time, and retrying only delays the error.
 */
function shouldRetry(failureCount: number, error: unknown) {
  const status = error instanceof TRPCClientError ? error.data?.httpStatus : undefined;
  if (typeof status === "number" && status < 500) return false;
  return failureCount < 3;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } }),
  );
  const [trpcClient] = useState(() =>
    createTRPCClient<ServerRouter>({ links: [httpBatchLink({ url: "/api/trpc" })] }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
