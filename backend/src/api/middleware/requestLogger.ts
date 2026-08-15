import morgan from "morgan";

const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_QUERY_KEYS = new Set([
  "access_token",
  "code",
  "refresh_token",
  "state",
  "token",
]);
const LOG_FORMAT =
  ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

interface LogStream {
  write(message: string): void;
}

export function sanitizeRequestUrl(requestUrl: string): string {
  try {
    const url = new URL(requestUrl, "http://videoflow.local");
    const sanitizedSearch = new URLSearchParams();

    for (const [key, value] of url.searchParams) {
      sanitizedSearch.append(
        key,
        SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) ? REDACTED_VALUE : value,
      );
    }

    const query = sanitizedSearch.toString();

    return `${url.pathname}${query.length > 0 ? `?${query}` : ""}`;
  } catch {
    return requestUrl.split("?", 1)[0] ?? "";
  }
}

morgan.token("safe-url", (request) => sanitizeRequestUrl(request.url ?? ""));

export function createRequestLogger(stream?: LogStream) {
  return morgan(LOG_FORMAT, stream === undefined ? undefined : { stream });
}

export const requestLogger = createRequestLogger();
