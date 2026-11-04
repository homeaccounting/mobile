export interface UpdateState {
  isEnabled: boolean;
  channel: string | null;
  isEmbeddedLaunch: boolean;
  updateId: string | null;
}

/** The channel plus the running OTA update's short ID, so a tester can tell which JS a build runs; null in dev builds, where updates are off. */
export function updateLabel(state: UpdateState, builtIn: string): string | null {
  if (!state.isEnabled) return null;
  const id = state.isEmbeddedLaunch || !state.updateId ? builtIn : state.updateId.slice(0, 8);
  return [state.channel, id].filter((p): p is string => !!p).join(' · ');
}
