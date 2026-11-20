/** An error carrying the HTTP status, so callers can decide whether to retry. */
export function createProviderHttpError(message: string, status: number) {
  const error = new Error(message);
  (error as Error & { status?: number }).status = status;
  return error;
}

/** Best-effort error message from a failed provider response. */
export async function readErrorMessage(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return body?.error?.message || body?.message || fallback;
}

// biome-ignore lint/suspicious/noExplicitAny: provider stream events are untyped JSON; each adapter reads its fields with optional chaining
export function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Reasoning models spend part of the output budget thinking before they
 * write, so give them room; the cap only limits cost, it isn't a target.
 */
export function outputBudget(requested: number, override?: number) {
  return override ?? requested * 4;
}
