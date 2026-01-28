/**
 * Order History Exporter for Amazon - Popup Script
 * Handles UI interactions and communicates with content script
 */

import browser from 'webextension-polyfill';
import type { ExportOptions, ProgressData } from '../types';
import { isAmazonOrderHistoryPage } from '../utils';

/**
 * Get localized message from browser i18n API
 */
function getMessage(key: string, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(key, substitutions) || key;
}

/**
 * Apply i18n translations to all elements with data-i18n attribute
 */
function applyI18n(): void {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const message = getMessage(key);
      if (message) {
        element.textContent = message;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Apply translations
  applyI18n();
  const notAmazonEl = document.getElementById('not-amazon') as HTMLElement;
  const mainContentEl = document.getElementById('main-content') as HTMLElement;
  const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
  const btnText = exportBtn.querySelector('.btn-text') as HTMLElement;
  const btnLoading = exportBtn.querySelector('.btn-loading') as HTMLElement;
  const progressSection = document.getElementById('progress-section') as HTMLElement;
  const progressFill = document.getElementById('progressFill') as HTMLElement;
  const progressText = document.getElementById('progressText') as HTMLElement;
  const statusMessage = document.getElementById('status-message') as HTMLElement;
  const dateRangeInputs = document.getElementById('date-range-inputs') as HTMLElement;
  const startDateInput = document.getElementById('startDate') as HTMLInputElement;
  const endDateInput = document.getElementById('endDate') as HTMLInputElement;
  const settingsSection = document.getElementById('settings-section') as HTMLElement;

  // Set default date values
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  endDateInput.value = today.toISOString().split('T')[0] || '';
  startDateInput.value = oneYearAgo.toISOString().split('T')[0] || '';

  // Check if we're on an Amazon order history page
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  const isAmazonOrderPage = currentTab?.url ? isAmazonOrderHistoryPage(currentTab.url) : false;

  if (isAmazonOrderPage) {
    mainContentEl.classList.remove('hidden');
  } else {
    notAmazonEl.classList.remove('hidden');
  }

  // Handle export range radio buttons
  document.querySelectorAll('input[name="exportRange"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value === 'dateRange') {
        dateRangeInputs.classList.remove('hidden');
      } else {
        dateRangeInputs.classList.add('hidden');
      }
    });
  });

  // Handle export button click
  exportBtn.addEventListener('click', async () => {
    const exportRangeEl = document.querySelector(
      'input[name="exportRange"]:checked'
    ) as HTMLInputElement;
    const exportFormatEl = document.querySelector(
      'input[name="exportFormat"]:checked'
    ) as HTMLInputElement;
    const exportRange = exportRangeEl?.value || 'all';
    const exportFormat = (exportFormatEl?.value || 'json') as 'json' | 'csv';

    let startDate: string | null = null;
    let endDate: string | null = null;

    if (exportRange === 'dateRange') {
      startDate = startDateInput.value;
      endDate = endDateInput.value;

      if (!startDate || !endDate) {
        showStatus(getMessage('errorSelectDates'), 'error');
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        showStatus(getMessage('errorDateOrder'), 'error');
        return;
      }
    }

    // Start export - hide settings and show progress
    settingsSection.classList.add('hidden');
    exportBtn.classList.add('hidden');
    showProgress(0, getMessage('exportStartedMessage'));
    showStatus(getMessage('exportStartedStatus'), 'success');

    try {
      if (!currentTab?.id) {
        settingsSection.classList.remove('hidden');
        exportBtn.classList.remove('hidden');
        hideProgress();
        showStatus(getMessage('errorGetTab'), 'error');
        return;
      }

      const options: ExportOptions = {
        format: exportFormat,
        startDate: startDate,
        endDate: endDate,
        exportAll: exportRange === 'all',
      };

      // Send message to content script
      const response = (await browser.tabs.sendMessage(currentTab.id, {
        action: 'exportOrders',
        options: options,
      })) as { success: boolean; error?: string };

      if (response.success) {
        showStatus(getMessage('exportInitiatedStatus'), 'success');
      } else {
        settingsSection.classList.remove('hidden');
        exportBtn.classList.remove('hidden');
        hideProgress();
        showStatus(response.error || getMessage('exportFailedGeneric'), 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      settingsSection.classList.remove('hidden');
      exportBtn.classList.remove('hidden');
      hideProgress();
      showStatus(getMessage('exportFailedRefresh'), 'error');
    }
  });

  // Listen for progress updates from content script
  browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { action: string; data?: ProgressData };
    if (msg.action === 'updateProgress' && msg.data) {
      showProgress(msg.data.percent, msg.data.message);

      // If complete, show success message and restore UI
      if (msg.data.percent >= 100) {
        settingsSection.classList.remove('hidden');
        exportBtn.classList.remove('hidden');
        showStatus(msg.data.message, 'success');
      }
    }
  });

  function setLoading(loading: boolean): void {
    exportBtn.disabled = loading;
    btnText.classList.toggle('hidden', loading);
    btnLoading.classList.toggle('hidden', !loading);
  }

  function showProgress(percent: number, text: string): void {
    progressSection.classList.remove('hidden');
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
  }

  function hideProgress(): void {
    progressSection.classList.add('hidden');
  }

  function showStatus(message: string, type: 'success' | 'error' | 'info'): void {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusMessage.classList.add('hidden');
      }, 5000);
    }
  }

  // Suppress unused function warnings
  void setLoading;
  void hideProgress;
});
