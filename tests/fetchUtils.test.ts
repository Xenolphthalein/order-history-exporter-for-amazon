import { describe, it, expect, vi } from 'vitest';
import { fetchTextWithRetry, isRetryableStatus } from '../src/utils/fetchUtils';

function response(status: number, body = ''): Response {
  return new Response(body, { status });
}

/** A fetch that never resolves on its own but honours the abort signal. */
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('aborted', 'AbortError'))
    );
  });

const noSleep = vi.fn(async () => {});

describe('isRetryableStatus', () => {
  it('retries throttling and server errors', () => {
    for (const s of [408, 429, 500, 503, 599]) expect(isRetryableStatus(s)).toBe(true);
  });

  it('does not retry client errors', () => {
    for (const s of [400, 401, 403, 404]) expect(isRetryableStatus(s)).toBe(false);
  });
});

describe('fetchTextWithRetry', () => {
  it('returns the body on success', async () => {
    const fetchImpl = vi.fn(async () => response(200, 'hello'));
    const result = await fetchTextWithRetry('u', {}, { fetchImpl, sleep: noSleep });
    expect(result).toEqual({ ok: true, status: 200, text: 'hello' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('passes init options and an abort signal to fetch', async () => {
    const fetchImpl = vi.fn(async () => response(200));
    await fetchTextWithRetry('u', { credentials: 'include' }, { fetchImpl, sleep: noSleep });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('does not retry a non-retryable HTTP error', async () => {
    const fetchImpl = vi.fn(async () => response(404, 'nope'));
    const result = await fetchTextWithRetry('u', {}, { fetchImpl, sleep: noSleep });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries a throttled response and succeeds', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200, 'ok'));
    const sleep = vi.fn(async () => {});
    const result = await fetchTextWithRetry('u', {}, { fetchImpl, sleep, backoffMs: 100 });
    expect(result.text).toBe('ok');
    expect(sleep).toHaveBeenCalledWith(100);
  });

  it('uses exponential backoff', async () => {
    const fetchImpl = vi.fn(async () => response(503));
    const sleep = vi.fn(async () => {});
    await fetchTextWithRetry('u', {}, { fetchImpl, sleep, retries: 3, backoffMs: 100 });
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([100, 200, 400]);
  });

  it('returns the last retryable response once retries are exhausted', async () => {
    const fetchImpl = vi.fn(async () => response(503, 'busy'));
    const result = await fetchTextWithRetry('u', {}, { fetchImpl, sleep: noSleep, retries: 2 });
    expect(result).toEqual({ ok: false, status: 503, text: 'busy' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('aborts a hanging request after the timeout and rejects', async () => {
    await expect(
      fetchTextWithRetry(
        'u',
        {},
        { fetchImpl: hangingFetch, sleep: noSleep, timeoutMs: 10, retries: 1 }
      )
    ).rejects.toThrow(/timed out after 10 ms/);
  });

  it('applies the timeout to reading the body', async () => {
    const fetchImpl: typeof fetch = async (_input, init) => {
      const body = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener('abort', () =>
            controller.error(new DOMException('aborted', 'AbortError'))
          );
        },
      });
      return new Response(body, { status: 200 });
    };
    await expect(
      fetchTextWithRetry('u', {}, { fetchImpl, sleep: noSleep, timeoutMs: 10, retries: 0 })
    ).rejects.toThrow(/timed out/);
  });

  it('recovers when a retry succeeds after a timeout', async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = (input, init) => {
      calls++;
      return calls === 1 ? hangingFetch(input, init) : Promise.resolve(response(200, 'late'));
    };
    const result = await fetchTextWithRetry('u', {}, { fetchImpl, sleep: noSleep, timeoutMs: 10 });
    expect(result.text).toBe('late');
  });

  it('stops retrying when stop is requested', async () => {
    const fetchImpl = vi.fn(async () => response(503));
    const result = await fetchTextWithRetry(
      'u',
      {},
      { fetchImpl, sleep: noSleep, retries: 5, isStopRequested: () => true }
    );
    expect(result.status).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects with the network error when every attempt fails', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('network down');
    });
    await expect(
      fetchTextWithRetry('u', {}, { fetchImpl, sleep: noSleep, retries: 1 })
    ).rejects.toThrow('network down');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
