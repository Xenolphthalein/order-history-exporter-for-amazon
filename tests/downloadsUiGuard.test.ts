import { describe, it, expect, vi } from 'vitest';
import { createDownloadsUiGuard } from '../src/utils/downloadsUiGuard';

function makeGuard() {
  let owner: number | undefined;
  const setUiEnabled = vi.fn(async (_enabled: boolean) => {});
  const guard = createDownloadsUiGuard({
    setUiEnabled,
    getOwnerTabId: async () => owner,
    setOwnerTabId: async (tabId) => {
      owner = tabId;
    },
  });
  return { guard, setUiEnabled, getOwner: () => owner };
}

describe('createDownloadsUiGuard', () => {
  it('hides the UI and remembers the requesting tab', async () => {
    const { guard, setUiEnabled, getOwner } = makeGuard();
    await guard.suppress(42);
    expect(setUiEnabled).toHaveBeenLastCalledWith(false);
    expect(getOwner()).toBe(42);
  });

  it('restores the UI when the owning tab goes away mid-export', async () => {
    const { guard, setUiEnabled, getOwner } = makeGuard();
    await guard.suppress(42);
    await guard.handleTabGone(42);
    expect(setUiEnabled).toHaveBeenLastCalledWith(true);
    expect(getOwner()).toBeUndefined();
  });

  it('ignores other tabs going away', async () => {
    const { guard, setUiEnabled } = makeGuard();
    await guard.suppress(42);
    await guard.handleTabGone(7);
    expect(setUiEnabled).toHaveBeenCalledTimes(1);
    expect(setUiEnabled).toHaveBeenLastCalledWith(false);
  });

  it('does nothing when a tab goes away and the UI was never hidden', async () => {
    const { guard, setUiEnabled } = makeGuard();
    await guard.handleTabGone(42);
    expect(setUiEnabled).not.toHaveBeenCalled();
  });

  it('does not act again on tab removal after a normal restore', async () => {
    const { guard, setUiEnabled } = makeGuard();
    await guard.suppress(42);
    await guard.restore();
    await guard.handleTabGone(42);
    expect(setUiEnabled).toHaveBeenCalledTimes(2);
    expect(setUiEnabled).toHaveBeenLastCalledWith(true);
  });

  it('keeps the UI visible when the sender tab is unknown', async () => {
    const { guard, setUiEnabled } = makeGuard();
    await guard.suppress(undefined);
    expect(setUiEnabled).not.toHaveBeenCalled();
  });
});
