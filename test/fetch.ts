export interface RecordedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
}

type Reply =
  { status: number; body?: unknown } | { status: number; text: string } | { reject: Error };

/** Replaces global fetch; returns the requests it saw. */
export function mockFetch(reply: (req: RecordedRequest) => Reply): RecordedRequest[] {
  const seen: RecordedRequest[] = [];
  globalThis.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const req: RecordedRequest = {
      url: typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? init.body : undefined,
    };
    seen.push(req);
    const r = reply(req);
    if ('reject' in r) return Promise.reject(r.reject);
    const { status } = r;
    const text = 'text' in r ? r.text : r.body === undefined ? '' : JSON.stringify(r.body);
    return Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      text: () => Promise.resolve(text),
      json: () => {
        try {
          return Promise.resolve(JSON.parse(text) as unknown);
        } catch (e) {
          return Promise.reject(e instanceof Error ? e : new Error(String(e)));
        }
      },
    } as Response);
  }) as typeof fetch;
  return seen;
}
