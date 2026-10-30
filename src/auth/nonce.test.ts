import { bindNonce, newRawNonce } from './nonce';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => Uint8Array.from({ length: n }, (_, i) => (i * 37 + 250) % 256),
}));

describe('bindNonce', () => {
  it('matches the hosted-server vector', () =>
    expect(bindNonce('https://homeaccounting.com', 'r-123')).toBe(
      'K4QXi6gzIoAkDVeKWiHoKBylOAijdXPO2jzk6TbzR50',
    ));
  it('matches the LAN-server vector', () =>
    expect(bindNonce('http://192.168.1.10:8080', 'r-123')).toBe(
      'QQmXHq-J6DZRuqC0ijWP2ps2PRHuAk4sFTxarI5iiSQ',
    ));
});

describe('newRawNonce', () => {
  it('is 32 random bytes as unpadded base64url', () =>
    expect(newRawNonce()).toMatch(/^[A-Za-z0-9_-]{43}$/));
});
