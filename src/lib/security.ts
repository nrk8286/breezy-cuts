export function assertTrustedRequest(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return;

  const originHost = new URL(origin).host;
  if (originHost !== host) {
    throw new Error("UNTRUSTED_ORIGIN");
  }
}

export function safeError(error: unknown) {
  if (error instanceof Error && error.message === "UNTRUSTED_ORIGIN") {
    return Response.json({ error: "Request origin was rejected." }, { status: 403 });
  }
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
