/**
 * Background-owned guard for hiding Chrome's download shelf/bubble while
 * invoices are bulk-downloaded.
 *
 * The content script can't be trusted to restore the UI: if its tab is
 * closed or navigates away mid-export, its `finally` never runs and every
 * later download in the profile would stay hidden. So the background
 * remembers which tab asked for suppression and restores the UI itself
 * when that tab goes away. The owner is persisted (storage.session) so a
 * Chrome service-worker restart doesn't lose it.
 */

export interface DownloadsUiGuardDeps {
  /** Show/hide the download UI. Must no-op where unsupported (Firefox). */
  setUiEnabled: (enabled: boolean) => Promise<void>;
  getOwnerTabId: () => Promise<number | undefined>;
  setOwnerTabId: (tabId: number | undefined) => Promise<void>;
}

export interface DownloadsUiGuard {
  /** Hide the download UI on behalf of `tabId`. */
  suppress: (tabId: number | undefined) => Promise<void>;
  /** Show the download UI again and forget the owner. */
  restore: () => Promise<void>;
  /** Restore the UI if `tabId` is the tab that suppressed it. */
  handleTabGone: (tabId: number) => Promise<void>;
}

export function createDownloadsUiGuard(deps: DownloadsUiGuardDeps): DownloadsUiGuard {
  const restore = async (): Promise<void> => {
    await deps.setOwnerTabId(undefined);
    await deps.setUiEnabled(true);
  };

  return {
    async suppress(tabId): Promise<void> {
      // Without a tab to watch we couldn't guarantee cleanup, so keep the UI visible.
      if (tabId === undefined) return;
      // Persist the owner first so a crash between the two calls errs on the side of restoring.
      await deps.setOwnerTabId(tabId);
      await deps.setUiEnabled(false);
    },
    restore,
    async handleTabGone(tabId): Promise<void> {
      if ((await deps.getOwnerTabId()) === tabId) {
        await restore();
      }
    },
  };
}
