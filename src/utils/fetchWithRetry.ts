export interface FetchWithRetryOptions extends RequestInit {
  timeoutMs?: number;
}

export class FetchHttpError extends Error {
  status: number;
  response?: Response;

  constructor(status: number, message: string, response?: Response) {
    super(message);
    this.name = 'FetchHttpError';
    this.status = status;
    this.response = response;
  }
}

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

/**
 * Fetch wrapper with exponential backoff and auto-retry for volatile external APIs (e.g., Open Food Facts).
 *
 * @param url Target endpoint URL
 * @param options Fetch RequestInit options (including optional timeoutMs)
 * @param retries Maximum retry attempts (default: 3)
 * @param backoff Initial backoff delay in milliseconds (default: 500)
 * @returns Resolves with Response if successful, throws FetchHttpError or Error on final failure
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
  retries: number = 3,
  backoff: number = 500
): Promise<Response> {
  let currentBackoff = backoff;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Per-attempt timeout controller (default 10s if not specified)
    const timeoutMs = options.timeoutMs ?? 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Chain caller's signal if provided
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Success: return immediately
      if (response.ok) {
        return response;
      }

      // Check if status is a retryable gateway/service error (502, 503, 504)
      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        if (attempt < retries) {
          console.warn(
            `[fetchWithRetry] Received HTTP ${response.status} from ${url}. Retrying in ${currentBackoff}ms (attempt ${
              attempt + 1
            }/${retries})...`
          );
          await new Promise((res) => setTimeout(res, currentBackoff));
          currentBackoff *= 2;
          continue;
        }

        throw new FetchHttpError(
          response.status,
          `Open Food Facts service unavailable (HTTP ${response.status}) after ${retries} retries.`,
          response
        );
      }

      // Hard non-retryable error (e.g. 400, 404, 401, 403, 500)
      throw new FetchHttpError(
        response.status,
        `Request failed with HTTP ${response.status}`,
        response
      );
    } catch (err: unknown) {
      clearTimeout(timer);

      // If it's already our hard non-retryable FetchHttpError, rethrow immediately
      if (err instanceof FetchHttpError && !RETRYABLE_STATUS_CODES.has(err.status)) {
        throw err;
      }

      const isTimeout =
        (err instanceof Error && err.name === 'AbortError') ||
        (err instanceof DOMException && err.name === 'AbortError');

      const isNetworkError =
        isTimeout || (err instanceof TypeError && err.message.toLowerCase().includes('fetch'));

      if (isNetworkError && attempt < retries) {
        console.warn(
          `[fetchWithRetry] Network error/timeout (${
            isTimeout ? 'Timeout' : 'Network Failure'
          }) requesting ${url}. Retrying in ${currentBackoff}ms (attempt ${
            attempt + 1
          }/${retries})...`
        );
        await new Promise((res) => setTimeout(res, currentBackoff));
        currentBackoff *= 2;
        continue;
      }

      lastError =
        err instanceof Error
          ? err
          : new Error(`Network request failed after ${retries} attempts.`);
    }
  }

  throw (
    lastError ||
    new Error(`Open Food Facts request failed after ${retries} retry attempts.`)
  );
}
