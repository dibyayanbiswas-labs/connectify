"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "./trpc/providers";

export function HealthStatus() {
  const trpc = useTRPC();
  const { data, error, isPending } = useQuery(trpc.health.ready.queryOptions());

  if (isPending) return <p>Checking…</p>;
  if (error) return <p>API ✗: {error.message}</p>;
  return <p>API ✓ · DB {data.checks.database === "up" ? "✓" : "✗"}</p>;
}
