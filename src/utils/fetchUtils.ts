/**
 * Network helpers for the per-order detail fetches.
 *
 * Amazon occasionally leaves a request hanging (no response, or a body that
 * never finishes) or answers with a throttling status. Without a timeout a
 * single such request blocks the whole export forever. `fetchTextWithRetry`
 * bounds every attempt (headers + body) and retries transient failures.
 *
 * `fetch` and `sleep` are injectable so the logic is unit-testable in Node.
 */

export interface FetchTextResult {
  ok: boolean;
  status: number;
  text: string;
}

export interface FetchRetryOptions {
  /** Upper bound for one attempt, including reading the body. */
  timeoutMs?: number;
  /** Additional attempts after the first one. */
  retries?: number;
  /** Delay before retry n is `backoffMs * 2^(n-1)`. */
  backoffMs?: number;
  /** Stops further retries (e.g. the user pressed Stop). */
  isStopRequested?: () => boolean;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_FETCH_RETRIES = 2;
const DEFAULT_FETCH_BACKOFF_MS = 2_000;

/** HTTP statuses worth retrying: throttling and transient server errors. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch `url` and return its body as text.
 *
 * Resolves with `ok: false` for non-retryable HTTP errors (e.g. 404) and for
 * retryable statuses once retries are exhausted. Rejects only when the last
 * attempt failed at network level (timeout, connection error) or when stopped
 * before any response was obtained.
 */
export async function fetchTextWithRetry(
  url: string,
  init: RequestInit = {},
  options: FetchRetryOptions = {}
): Promise<FetchTextResult> {
  const {
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    retries = DEFAULT_FETCH_RETRIES,
    backoffMs = DEFAULT_FETCH_BACKOFF_MS,
    isStopRequested = (): boolean => false,
    fetchImpl = fetch,
    sleep = defaultSleep,
  } = options;

  let lastError: unknown = null;
  let lastResult: FetchTextResult | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      if (isStopRequested()) break;
      await sleep(backoffMs * 2 ** (attempt - 1));
      if (isStopRequested()) break;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { ...init, signal: controller.signal });
      const text = await response.text();
      lastResult = { ok: response.ok, status: response.status, text };
      lastError = null;
      if (response.ok || !isRetryableStatus(response.status)) {
        return lastResult;
      }
    } catch (error) {
      lastError = controller.signal.aborted
        ? new Error(`Request timed out after ${timeoutMs} ms: ${url}`)
        : error;
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastError === null && lastResult) {
    return lastResult;
  }
  throw lastError ?? new Error(`Request stopped before completion: ${url}`);
}
