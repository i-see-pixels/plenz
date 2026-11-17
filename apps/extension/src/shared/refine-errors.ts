// Turns a failed refine into something a user can act on: what went wrong in
// plain words, the provider's own message as detail, and whether the fix is
// in settings (so the panel can offer a button) or just trying again.

export type RefineErrorKind =
  | "setup"
  | "auth"
  | "model"
  | "rate_limit"
  | "too_long"
  | "offline"
  | "network"
  | "timeout"
  | "server"
  | "other";

export type RefineFailure = {
  kind: RefineErrorKind;
  /** One sentence for the panel. */
  message: string;
  /** The provider's own wording, when it adds something. */
  detail?: string;
  /** The fix is in plenz's settings (key, model, provider). */
  fixInSettings: boolean;
};

const MESSAGES: Record<RefineErrorKind, string> = {
  setup: "No AI provider is ready. Add an API key or pick a model in settings.",
  auth: "Your provider rejected the API key. Check or replace it in settings.",
  model: "Your provider couldn't find that model. Pick another one in settings.",
  rate_limit: "Your provider is rate limiting you or you're out of credit. Wait a moment or check your plan.",
  too_long: "This draft is too long for the selected model. Shorten it or pick a model with a larger context.",
  offline: "You're offline. Reconnect and try again.",
  network: "Couldn't reach your provider. Check your connection, or the base URL in settings.",
  timeout: "Your provider took too long to answer. Try again.",
  server: "Your provider had a problem on its side. Try again shortly.",
  other: "The refine failed.",
};

const FIX_IN_SETTINGS: ReadonlySet<RefineErrorKind> = new Set(["setup", "auth", "model", "network"]);

const MAX_DETAIL_CHARS = 200;

function kindOf(status: number | undefined, text: string, online: boolean): RefineErrorKind {
  if (status === 401 || status === 403 || /invalid.{0,20}(api )?key|api key not valid|incorrect api key|unauthori[sz]ed|permission denied/.test(text)) {
    return "auth";
  }
  if (/context (length|window)|maximum context|too many tokens|prompt is too long|request too large/.test(text) || status === 413) {
    return "too_long";
  }
  if (status === 429 || /rate.?limit|quota|insufficient.{0,10}(credit|balance|funds)|billing/.test(text)) {
    return "rate_limit";
  }
  if (status === 404 || /model.{0,40}(not found|does not exist|not supported)|no such model/.test(text)) {
    return "model";
  }
  if (/timed? ?out|timeout/.test(text)) return "timeout";
  if (/failed to fetch|networkerror|network error|load failed|err_/.test(text)) {
    return online ? "network" : "offline";
  }
  if (typeof status === "number" && status >= 500) return "server";
  return "other";
}

/** `setup` errors come from plenz itself and already say what to do. */
export function describeRefineError(
  error: { status?: number; message?: string } | null | undefined,
  options: { online?: boolean; setup?: boolean } = {},
): RefineFailure {
  const raw = (error?.message ?? "").trim();
  const kind = options.setup ? "setup" : kindOf(error?.status, raw.toLowerCase(), options.online ?? true);
  if (kind === "setup") {
    return { kind, message: raw || MESSAGES.setup, fixInSettings: true };
  }
  if (kind === "other" && raw) {
    return { kind, message: raw.slice(0, MAX_DETAIL_CHARS), fixInSettings: false };
  }
  const detail =
    raw && !/^failed to fetch$/i.test(raw)
      ? `${error?.status ? `${error.status}: ` : ""}${raw}`.slice(0, MAX_DETAIL_CHARS)
      : undefined;
  return { kind, message: MESSAGES[kind], detail, fixInSettings: FIX_IN_SETTINGS.has(kind) };
}
