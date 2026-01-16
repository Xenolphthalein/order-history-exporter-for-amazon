/**
 * Amazon Order History Exporter - Popup Script
 * Handles UI interactions and communicates with content script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const notAmazonEl = document.getElementById('not-amazon');
  const mainContentEl = document.getElementById('main-content');
  const exportBtn = document.getElementById('exportBtn');
  const btnText = exportBtn.querySelector('.btn-text');
  const btnLoading = exportBtn.querySelector('.btn-loading');
  const progressSection = document.getElementById('progress-section');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const statusMessage = document.getElementById('status-message');
  const dateRangeInputs = document.getElementById('date-range-inputs');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  // Set default date values
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  endDateInput.value = today.toISOString().split('T')[0];
  startDateInput.value = oneYearAgo.toISOString().split('T')[0];

  // Check if we're on an Amazon order history page
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  const isAmazonOrderPage = isAmazonOrderHistoryPage(currentTab.url);

  if (isAmazonOrderPage) {
    mainContentEl.classList.remove('hidden');
  } else {
    notAmazonEl.classList.remove('hidden');
  }

  // Handle export range radio buttons
  document.querySelectorAll('input[name="exportRange"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'dateRange') {
        dateRangeInputs.classList.remove('hidden');
      } else {
        dateRangeInputs.classList.add('hidden');
      }
    });
  });

  // Handle export button click
  exportBtn.addEventListener('click', async () => {
    const exportRange = document.querySelector('input[name="exportRange"]:checked').value;
    const exportFormat = document.querySelector('input[name="exportFormat"]:checked').value;

    let startDate = null;
    let endDate = null;

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
    showStatus('Export started! Keep this popup open or check the browser tab. The page will navigate through years automatically.', 'success');

    try {
      // Send message to content script
      const response = await browser.tabs.sendMessage(currentTab.id, {
        action: 'exportOrders',
        options: {
          format: exportFormat,
          startDate: startDate,
          endDate: endDate,
          exportAll: exportRange === 'all'
        }
      });

      if (response.success) {
        showStatus('Export initiated! Watch the browser tab - it will navigate through your orders. File will download when complete.', 'success');
      } else {
        showStatus(response.error || 'Export failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showStatus('Failed to start export. Make sure you are on the Amazon order history page and refresh the page.', 'error');
    }
  });

  // Listen for progress updates from content script
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateProgress') {
      showProgress(message.data.percent, message.data.message);
      
      // If complete, show success message
      if (message.data.percent >= 100) {
        showStatus(message.data.message, 'success');
      }
    }
  });

  function isAmazonOrderHistoryPage(url) {
    if (!url) return false;
    const amazonDomains = [
      'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr',
      'amazon.it', 'amazon.es', 'amazon.ca', 'amazon.co.jp',
      'amazon.in', 'amazon.com.au', 'amazon.com.br', 'amazon.com.mx'
    ];
    const orderPaths = ['/gp/your-account/order-history', '/your-orders'];
    
    return amazonDomains.some(domain => url.includes(domain)) &&
           orderPaths.some(path => url.includes(path));
  }

  function setLoading(loading) {
    exportBtn.disabled = loading;
    btnText.classList.toggle('hidden', loading);
    btnLoading.classList.toggle('hidden', !loading);
  }

  function showProgress(percent, text) {
    progressSection.classList.remove('hidden');
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
  }

  function hideProgress() {
    progressSection.classList.add('hidden');
  }

  function showStatus(message, type) {
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
});
