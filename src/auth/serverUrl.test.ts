import { HOSTED_SERVER_URL, displayHost, parseServerUrl } from './serverUrl';

const ok = (input: string) => parseServerUrl(input);

describe('parseServerUrl', () => {
  it.each([
    ['homeaccounting.com', 'https://homeaccounting.com'],
    ['  https://Example.COM/  ', 'https://example.com'],
    ['https://host.example/ha/', 'https://host.example/ha'],
    ['https://host.example:8443/x?y=1#z', 'https://host.example:8443/x'],
    ['HTTP://Foo.LOCAL', 'http://foo.local'],
    ['localhost:8080', 'https://localhost:8080'],
  ])('normalises %s', (input, url) => {
    expect(ok(input)).toEqual({ ok: true, url });
  });

  it.each([
    'http://localhost:8080',
    'http://127.0.0.1',
    'http://[::1]:8080',
    'http://10.0.2.2:8080',
    'http://172.16.0.5',
    'http://172.31.255.255',
    'http://192.168.1.10',
    'http://nas.local',
    'http://0x7f.1',
  ])('allows http for private host %s', (input) => {
    expect(ok(input).ok).toBe(true);
  });

  it.each([
    'http://example.com',
    'http://172.15.0.1',
    'http://172.32.0.1',
    'http://11.0.0.1',
    'http://evil-local.com',
    'http://[2001:db8::1]',
  ])('rejects http for public host %s', (input) => {
    expect(ok(input)).toEqual({ ok: false, reason: 'insecure' });
  });

  it.each([
    '',
    '   ',
    'ftp://example.com',
    'https://user:pw@example.com',
    'http://0.0.0.0',
    'https://',
  ])('rejects %p as invalid', (input) => {
    expect(ok(input)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('accepts https anywhere', () => {
    expect(ok('https://example.com').ok).toBe(true);
  });
});

describe('displayHost', () => {
  it('shows host, port and path without scheme', () => {
    expect(displayHost(HOSTED_SERVER_URL)).toBe('homeaccounting.com');
    expect(displayHost('http://192.168.1.10:8080/ha')).toBe('192.168.1.10:8080/ha');
  });
});
