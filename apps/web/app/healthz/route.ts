// Liveness for the hosting platform: the web server is up and answering.
// API and database health live on the API (/api/health/ready), not here.
export function GET() {
  return Response.json({ status: "ok" });
}
