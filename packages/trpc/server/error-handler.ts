import { logger } from "@repo/logger";
import { TRPCError } from "@trpc/server";

export function mapAuthErrorToTRPCError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  logger.error("An unexpected error occurred while processing the request", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred while processing the request",
  });
}
