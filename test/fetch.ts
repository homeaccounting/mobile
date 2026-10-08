export interface RecordedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
}

type Reply = { status: number; body?: unknown };

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
    const { status, body } = reply(req);
    const text = body === undefined ? '' : JSON.stringify(body);
    return Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      text: () => Promise.resolve(text),
      json: () =>
        text
          ? Promise.resolve(JSON.parse(text) as unknown)
          : Promise.reject(new SyntaxError('empty')),
    } as Response);
  }) as typeof fetch;
  return seen;
}
