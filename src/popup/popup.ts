/**
 * Amazon Order History Exporter - Popup Script
 * Handles UI interactions and communicates with content script
 */

import type { ExportOptions, ProgressData } from '../types';

document.addEventListener('DOMContentLoaded', async () => {
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
    const exportRangeEl = document.querySelector('input[name="exportRange"]:checked') as HTMLInputElement;
    const exportFormatEl = document.querySelector('input[name="exportFormat"]:checked') as HTMLInputElement;
    const exportRange = exportRangeEl?.value || 'all';
    const exportFormat = (exportFormatEl?.value || 'json') as 'json' | 'csv';

    let startDate: string | null = null;
    let endDate: string | null = null;

    if (exportRange === 'dateRange') {
      startDate = startDateInput.value;
      endDate = endDateInput.value;

      if (!startDate || !endDate) {
        showStatus('Please select both start and end dates.', 'error');
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        showStatus('Start date must be before end date.', 'error');
        return;
      }
    }

    // Start export
    showProgress(0, 'Starting export... The page will navigate through your order history.');
    showStatus(
      'Export started! Keep this popup open or check the browser tab. The page will navigate through years automatically.',
      'success'
    );

    try {
      if (!currentTab?.id) {
        showStatus('Failed to get current tab.', 'error');
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
        showStatus(
          'Export initiated! Watch the browser tab - it will navigate through your orders. File will download when complete.',
          'success'
        );
      } else {
        showStatus(response.error || 'Export failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showStatus(
        'Failed to start export. Make sure you are on the Amazon order history page and refresh the page.',
        'error'
      );
    }
  });

  // Listen for progress updates from content script
  browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { action: string; data?: ProgressData };
    if (msg.action === 'updateProgress' && msg.data) {
      showProgress(msg.data.percent, msg.data.message);

      // If complete, show success message
      if (msg.data.percent >= 100) {
        showStatus(msg.data.message, 'success');
      }
    }
  });

  function isAmazonOrderHistoryPage(url: string): boolean {
    if (!url) return false;
    const amazonDomains = [
      'amazon.com',
      'amazon.co.uk',
      'amazon.de',
      'amazon.fr',
      'amazon.it',
      'amazon.es',
      'amazon.ca',
      'amazon.co.jp',
      'amazon.in',
      'amazon.com.au',
      'amazon.com.br',
      'amazon.com.mx',
    ];
    const orderPaths = ['/gp/your-account/order-history', '/your-orders'];

    return amazonDomains.some((domain) => url.includes(domain)) && orderPaths.some((path) => url.includes(path));
  }

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
