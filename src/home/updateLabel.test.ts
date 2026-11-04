import { updateLabel, type UpdateState } from './updateLabel';

const state = (over: Partial<UpdateState> = {}): UpdateState => ({
  isEnabled: true,
  channel: 'preview',
  isEmbeddedLaunch: false,
  updateId: '3f2a1b9c-0000-4000-8000-000000000000',
  ...over,
});

describe('updateLabel', () => {
  it('shows the channel and the short ID of a downloaded update', () => {
    expect(updateLabel(state(), 'built-in')).toBe('preview · 3f2a1b9c');
  });

  it('names the JS shipped inside the build as built-in', () => {
    expect(updateLabel(state({ isEmbeddedLaunch: true }), 'built-in')).toBe('preview · built-in');
  });

  it('omits a missing channel', () => {
    expect(updateLabel(state({ channel: null }), 'built-in')).toBe('3f2a1b9c');
  });

  it('is null when updates are off (dev builds)', () => {
    expect(updateLabel(state({ isEnabled: false }), 'built-in')).toBeNull();
  });
});
