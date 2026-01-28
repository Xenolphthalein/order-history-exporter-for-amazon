/**
 * Order History Exporter for Amazon - Background Script
 * Handles file downloads and cross-script communication
 */

import browser from 'webextension-polyfill';
import type { DownloadData, MessagePayload } from '../types';

/**
 * Get localized message from browser i18n API
 */
function getMessage(key: string, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(key, substitutions) || key;
}

// Listen for messages from content scripts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
browser.runtime.onMessage.addListener((message: any, _sender: any) => {
  const msg = message as MessagePayload;

  if (msg.action === 'downloadFile') {
    return downloadFile(msg.data as DownloadData)
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

// Log when extension is installed or updated
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log(getMessage('extensionInstalled'));
  } else if (details.reason === 'update') {
    console.log(getMessage('extensionUpdated'), browser.runtime.getManifest().version);
  }
});
