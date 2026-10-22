/**
 * Order History Exporter for Amazon - Background Script
 * Handles file downloads and cross-script communication
 */

import browser from 'webextension-polyfill';
import type { DownloadData, DownloadUrlData, MessagePayload } from '../types';
import { DOWNLOADS_UI_OWNER_KEY } from '../constants';
import { createDownloadsUiGuard } from '../utils/downloadsUiGuard';

/**
 * Get localized message from browser i18n API
 */
function getMessage(key: string, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(key, substitutions) || key;
}

const downloadsUiGuard = createDownloadsUiGuard({
  setUiEnabled: setDownloadsUIEnabled,
  async getOwnerTabId() {
    const stored = await browser.storage.session.get(DOWNLOADS_UI_OWNER_KEY);
    const tabId = stored[DOWNLOADS_UI_OWNER_KEY];
    return typeof tabId === 'number' ? tabId : undefined;
  },
  async setOwnerTabId(tabId) {
    if (tabId === undefined) {
      await browser.storage.session.remove(DOWNLOADS_UI_OWNER_KEY);
    } else {
      await browser.storage.session.set({ [DOWNLOADS_UI_OWNER_KEY]: tabId });
    }
  },
});

// Restore the download UI if the exporting tab is closed or navigates away
// mid-export: its content script dies before it can restore the UI itself.
browser.tabs.onRemoved.addListener((tabId) => {
  downloadsUiGuard.handleTabGone(tabId).catch((error: unknown) => {
    console.warn('[Amazon Exporter] Failed to restore downloads UI:', error);
  });
});
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;
  downloadsUiGuard.handleTabGone(tabId).catch((error: unknown) => {
    console.warn('[Amazon Exporter] Failed to restore downloads UI:', error);
  });
});

// Listen for messages from content scripts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
browser.runtime.onMessage.addListener((message: any, sender: any) => {
  const msg = message as MessagePayload;

  if (msg.action === 'downloadFile') {
    return downloadFile(msg.data as DownloadData)
      .then(() => ({ success: true }))
      .catch((error: Error) => ({ success: false, error: error.message }));
  }

  if (msg.action === 'downloadInvoiceUrl') {
    return downloadInvoiceUrl(msg.data as DownloadUrlData)
      .then(() => ({ success: true }))
      .catch((error: Error) => ({ success: false, error: error.message }));
  }

  if (msg.action === 'setDownloadsUIEnabled') {
    const enabled = Boolean((msg.data as { enabled?: boolean } | undefined)?.enabled);
    const tabId = (sender as browser.Runtime.MessageSender | undefined)?.tab?.id;
    return (enabled ? downloadsUiGuard.restore() : downloadsUiGuard.suppress(tabId))
      .then(() => ({ success: true }))
      .catch((error: Error) => ({ success: false, error: error.message }));
  }

  if (msg.action === 'updateProgress') {
    // Forward progress updates to popup if it's open
    browser.runtime.sendMessage(message).catch(() => {
      // Popup might be closed, ignore error
    });
  }

  return undefined;
});

/**
 * Download file using the browser's download API
 */
async function downloadFile(data: DownloadData): Promise<number> {
  const { content, fileName, mimeType } = data;

  let url: string;
  let isObjectUrl = false;

  // Check if we're in a service worker context (Chrome MV3) or regular background script (Firefox)
  // Service workers don't have access to Blob/URL.createObjectURL
  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
    // Firefox: Use Blob URL
    const blob = new Blob([content], { type: mimeType });
    url = URL.createObjectURL(blob);
    isObjectUrl = true;
  } else {
    // Chrome MV3 service worker: Use data URL
    const base64Content = globalThis.btoa(unescape(encodeURIComponent(content)));
    url = `data:${mimeType};base64,${base64Content}`;
  }

  try {
    const downloadId = await browser.downloads.download({
      url: url,
      filename: fileName,
      saveAs: true,
    });

    // Clean up blob URL after a delay (only for object URLs)
    if (isObjectUrl) {
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    }

    return downloadId;
  } catch (error) {
    if (isObjectUrl) {
      URL.revokeObjectURL(url);
    }
    throw error;
  }
}

/**
 * Download an invoice PDF from an Amazon URL, letting the browser reuse
 * the user's session cookies for authentication. Silent (no Save-As
 * prompt) since one export can queue dozens of invoices; conflicts are
 * uniquified so re-runs of the same order don't overwrite prior files.
 */
async function downloadInvoiceUrl(data: DownloadUrlData): Promise<number> {
  return browser.downloads.download({
    url: data.url,
    filename: data.fileName,
    saveAs: false,
    conflictAction: 'uniquify',
  });
}

/**
 * Toggle Chrome's download shelf/bubble so a bulk invoice export doesn't
 * spam the UI. Requires the `downloads.ui` permission (Chrome only).
 * Firefox lacks this API, so we silently no-op. Only call through
 * `downloadsUiGuard`, which restores the UI if the exporting tab goes away.
 */
async function setDownloadsUIEnabled(enabled: boolean): Promise<void> {
  const api = browser.downloads as typeof browser.downloads & {
    setUiOptions?: (options: { enabled: boolean }) => Promise<void>;
  };
  if (typeof api.setUiOptions !== 'function') return;
  await api.setUiOptions({ enabled });
}

// Log when extension is installed or updated
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log(getMessage('extensionInstalled'));
  } else if (details.reason === 'update') {
    console.log(getMessage('extensionUpdated'), browser.runtime.getManifest().version);
  }
});
