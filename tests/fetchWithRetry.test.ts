import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithRetry, FetchHttpError } from '../src/utils/fetchWithRetry';

describe('fetchWithRetry Utility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns response immediately on HTTP 200 OK without retries', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchWithRetry('https://api.example.com/data', {}, 3, 5);

    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on HTTP 503 and succeeds on subsequent attempt', async () => {
    const mock503 = new Response('Service Unavailable', { status: 503 });
    const mock200 = new Response(JSON.stringify({ success: true }), { status: 200 });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(mock503)
      .mockResolvedValueOnce(mock200);
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchWithRetry('https://api.example.com/flaky', {}, 3, 5);

    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on hard 404 error and throws FetchHttpError immediately', async () => {
    const mock404 = new Response('Not Found', { status: 404 });
    const mockFetch = vi.fn().mockResolvedValue(mock404);
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      fetchWithRetry('https://api.example.com/notfound', {}, 3, 5)
    ).rejects.toThrow(FetchHttpError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on network timeout / AbortError and throws if all retries exhausted', async () => {
    const abortErr = new DOMException('The user aborted a request.', 'AbortError');
    const mockFetch = vi.fn().mockRejectedValue(abortErr);
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      fetchWithRetry('https://api.example.com/timeout', {}, 2, 5)
    ).rejects.toThrow();

    // Initial attempt + 2 retries = 3 total attempts
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
