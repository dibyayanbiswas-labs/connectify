// Next.js calls register() once when the server starts.
// Importing env here makes a bad config fail the boot, not the first request.
export async function register() {
  // Next also compiles this for the Edge runtime, which has no process.exit; the server is Node.
  // NEXT_RUNTIME is set by Next itself per bundle, not by config, so Turbo needn't hash it.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    await import("./env");
  } catch (error) {
    // Next only logs a failed register() and keeps serving; exit so the platform
    // sees a crash and the deploy fails, instead of a server that can't proxy.
    console.error(error);
    process.exit(1);
  }
}
