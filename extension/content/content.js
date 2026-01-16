/**
 * Amazon Order History Exporter - Content Script
 * Scrapes order data from Amazon order history pages using browser navigation
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'amazonExporter';
  
  // Check if we're in the middle of an export operation
  checkExportState();

  // Listen for messages from popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'exportOrders') {
      startExport(message.options);
      sendResponse({ success: true, message: 'Export started' });
      return true;
    }
    if (message.action === 'getExportStatus') {
      const state = getExportState();
      sendResponse(state);
      return true;
    }
  });

  /**
   * Get export state from sessionStorage
   */
  function getExportState() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Save export state to sessionStorage
   */
  function saveExportState(state) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Clear export state
   */
  function clearExportState() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Check if we should continue an export after page navigation
   */
  function checkExportState() {
    // Wait for page to be fully loaded
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        setTimeout(checkExportState, 500);
      });
      return;
    }
    
    // Additional delay to let Amazon's JS render
    setTimeout(() => {
      const state = getExportState();
      if (state && state.inProgress) {
        console.log('[Amazon Exporter] Resuming export...', state);
        continueExport(state);
      }
    }, 1500);
  }

  /**
   * Start a new export
   */
  function startExport(options) {
    const { format, startDate, endDate, exportAll } = options;
    
    // Get available years
    const years = getAvailableYears();
    console.log('[Amazon Exporter] Found years:', years);
    
    // Filter years based on date range
    let yearsToProcess = [...years];
    if (!exportAll && startDate && endDate) {
      const startYear = new Date(startDate).getFullYear();
      const endYear = new Date(endDate).getFullYear();
      yearsToProcess = years.filter(year => {
        const yearNum = parseInt(year);
        return yearNum >= startYear && yearNum <= endYear;
      });
    }
    
    console.log('[Amazon Exporter] Years to process:', yearsToProcess);
    
    if (yearsToProcess.length === 0) {
      alert('No years found to export. Please make sure you are on the Amazon order history page.');
      return;
    }
    
    // Initialize export state
    const state = {
      inProgress: true,
      format: format,
      startDate: startDate,
      endDate: endDate,
      exportAll: exportAll,
      yearsToProcess: yearsToProcess,
      currentYearIndex: 0,
      currentStartIndex: 0,
      collectedOrders: [],
      seenOrderIds: [],
      baseUrl: getOrderHistoryBaseUrl()
    };
    
    saveExportState(state);
    
    // Navigate to first year's first page
    const firstUrl = buildOrderPageUrl(state.baseUrl, yearsToProcess[0], 0);
    console.log('[Amazon Exporter] Starting export, navigating to:', firstUrl);
    
    // If we're already on the right page, scrape directly
    if (window.location.href.includes(`timeFilter=year-${yearsToProcess[0]}`) && !window.location.href.includes('startIndex')) {
      scrapeCurrentPageAndContinue(state);
    } else {
      window.location.href = firstUrl;
    }
  }

  /**
   * Continue an export after page navigation
   */
  function continueExport(state) {
    updateProgress(
      calculateProgress(state),
      `Processing ${state.yearsToProcess[state.currentYearIndex]} (page ${Math.floor(state.currentStartIndex / 10) + 1})...`
    );
    
    scrapeCurrentPageAndContinue(state);
  }

  /**
   * Scrape the current page and decide what to do next
   */
  function scrapeCurrentPageAndContinue(state) {
    const startDateObj = state.startDate ? new Date(state.startDate) : null;
    const endDateObj = state.endDate ? new Date(state.endDate) : null;
    
    // Scrape orders from current page
    const pageOrders = scrapeVisibleOrders(startDateObj, endDateObj, state.exportAll, new Set(state.seenOrderIds));
    
    console.log('[Amazon Exporter] Found', pageOrders.length, 'orders on this page');
    
    // Add to collected orders (avoiding duplicates)
    pageOrders.forEach(order => {
      if (!state.seenOrderIds.includes(order.orderId)) {
        state.collectedOrders.push(order);
        state.seenOrderIds.push(order.orderId);
      }
    });
    
    // Check if there are more pages for current year
    const hasNextPage = checkForNextPage();
    
    if (hasNextPage && pageOrders.length > 0) {
      // Navigate to next page of current year
      state.currentStartIndex += 10;
      saveExportState(state);
      
      const nextUrl = buildOrderPageUrl(state.baseUrl, state.yearsToProcess[state.currentYearIndex], state.currentStartIndex);
      console.log('[Amazon Exporter] Navigating to next page:', nextUrl);
      window.location.href = nextUrl;
      return;
    }
    
    // Move to next year
    state.currentYearIndex++;
    state.currentStartIndex = 0;
    
    if (state.currentYearIndex < state.yearsToProcess.length) {
      // Navigate to first page of next year
      saveExportState(state);
      
      const nextUrl = buildOrderPageUrl(state.baseUrl, state.yearsToProcess[state.currentYearIndex], 0);
      console.log('[Amazon Exporter] Navigating to next year:', nextUrl);
      window.location.href = nextUrl;
      return;
    }
    
    // All done - finish export
    finishExport(state);
  }

  /**
   * Finish the export and download the file
   */
  async function finishExport(state) {
    console.log('[Amazon Exporter] Export complete. Total orders:', state.collectedOrders.length);
    
    updateProgress(80, `Fetching item prices for ${state.collectedOrders.length} orders...`);
    
    // Fetch item prices for multi-item orders
    await fetchOrderDetailsForPrices(state.collectedOrders);
    
    updateProgress(95, 'Generating file...');
    
    // Generate file
    let fileContent, fileName, mimeType;
    const timestamp = new Date().toISOString().split('T')[0];

    if (state.format === 'json') {
      fileContent = JSON.stringify(state.collectedOrders, null, 2);
      fileName = `amazon-orders-${timestamp}.json`;
      mimeType = 'application/json';
    } else {
      fileContent = convertToCSV(state.collectedOrders);
      fileName = `amazon-orders-${timestamp}.csv`;
      mimeType = 'text/csv';
    }

    // Download via background script
    await browser.runtime.sendMessage({
      action: 'downloadFile',
      data: {
        content: fileContent,
        fileName: fileName,
        mimeType: mimeType
      }
    });

    updateProgress(100, `Export complete! ${state.collectedOrders.length} orders exported.`);
    
    // Clear state
    clearExportState();
  }

  /**
   * Calculate progress percentage
   */
  function calculateProgress(state) {
    const yearProgress = state.currentYearIndex / state.yearsToProcess.length;
    const pageProgress = Math.min(state.currentStartIndex / 100, 0.9);
    return Math.floor((yearProgress + (pageProgress / state.yearsToProcess.length)) * 75) + 5;
  }

  /**
   * Get the base URL for order history
   */
  function getOrderHistoryBaseUrl() {
    const urlObj = new URL(window.location.href);
    return `${urlObj.origin}/your-orders/orders`;
  }

  /**
   * Build URL for a specific year and page
   */
  function buildOrderPageUrl(baseUrl, year, startIndex = 0) {
    const params = new URLSearchParams();
    params.set('timeFilter', `year-${year}`);
    if (startIndex > 0) {
      params.set('startIndex', startIndex.toString());
    }
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Get available years from the order filter dropdown
   */
  function getAvailableYears() {
    const years = [];
    
    // Try different selectors for the year/time filter
    const selectors = [
      '#time-filter',
      '#orderFilter',
      'select[name="timeFilter"]',
      'select[name="orderFilter"]',
      '[data-action="a-dropdown-button"]',
      '.a-dropdown-container select',
      '#a-autoid-1-announce',
      '[id*="dropdown"] select',
      'form select'
    ];
    
    for (const selector of selectors) {
      const dropdown = document.querySelector(selector);
      if (dropdown) {
        const options = dropdown.querySelectorAll('option');
        options.forEach(option => {
          const value = option.value || option.textContent;
          const yearMatch = value.match(/\b(20\d{2})\b/);
          if (yearMatch) {
            years.push(yearMatch[1]);
          }
        });
        if (years.length > 0) break;
      }
    }
    
    // Check for year links
    const yearLinks = document.querySelectorAll('a[href*="timeFilter=year-"]');
    yearLinks.forEach(link => {
      const yearMatch = link.href.match(/year-?(20\d{2})/);
      if (yearMatch && !years.includes(yearMatch[1])) {
        years.push(yearMatch[1]);
      }
    });
    
    // Check dropdown items in Amazon's custom dropdown
    const dropdownItems = document.querySelectorAll('[data-value*="year-"], .a-popover-inner li, #orderFilter option');
    dropdownItems.forEach(item => {
      const value = item.getAttribute('data-value') || item.value || item.textContent || '';
      const yearMatch = value.match(/year-?(20\d{2})/i) || value.match(/\b(20\d{2})\b/);
      if (yearMatch && !years.includes(yearMatch[1])) {
        years.push(yearMatch[1]);
      }
    });

    // If no years found, generate recent years
    if (years.length === 0) {
      const currentYear = new Date().getFullYear();
      for (let y = currentYear; y >= currentYear - 10; y--) {
        years.push(y.toString());
      }
    }

    return [...new Set(years)].sort((a, b) => b - a);
  }

  /**
   * Check if there's a next page
   */
  function checkForNextPage() {
    const nextSelectors = [
      '.a-pagination .a-last:not(.a-disabled) a',
      'a[aria-label*="Nächste"]',
      'a[aria-label*="Next"]',
      '.a-pagination li:last-child:not(.a-disabled) a',
      'a.a-last:not(.a-disabled)'
    ];
    
    for (const selector of nextSelectors) {
      const nextBtn = document.querySelector(selector);
      if (nextBtn) {
        console.log('[Amazon Exporter] Next page button found');
        return true;
      }
    }
    
    return false;
  }

  /**
   * Scrape orders from the currently visible page
   */
  function scrapeVisibleOrders(startDateObj, endDateObj, exportAll, seenOrderIds) {
    const orders = [];
    
    console.log('[Amazon Exporter] Scraping visible page...');
    console.log('[Amazon Exporter] URL:', window.location.href);
    
    // Try multiple selectors for order cards
    const orderSelectors = [
      '.order-card',
      '.order',
      '[data-component="orderCard"]',
      '.a-box-group.order',
      '.your-orders-content-container .a-box-group',
      '#ordersContainer .order-card',
      '.js-order-card',
      '[class*="order-card"]'
    ];
    
    let orderElements = [];
    for (const selector of orderSelectors) {
      orderElements = document.querySelectorAll(selector);
      if (orderElements.length > 0) {
        console.log(`[Amazon Exporter] Found ${orderElements.length} orders with selector: ${selector}`);
        break;
      }
    }
    
    // Fallback: find elements containing order IDs
    if (orderElements.length === 0) {
      const orderIdPattern = /\d{3}-\d{7}-\d{7}/;
      const potentialOrders = new Set();
      
      document.querySelectorAll('*').forEach(el => {
        if (el.textContent && orderIdPattern.test(el.textContent)) {
          let parent = el;
          for (let i = 0; i < 10 && parent.parentElement; i++) {
            parent = parent.parentElement;
            if (parent.classList.contains('a-box') || 
                parent.classList.contains('a-box-group') ||
                (parent.tagName === 'DIV' && parent.children.length > 3)) {
              potentialOrders.add(parent);
              break;
            }
          }
        }
      });
      
      orderElements = Array.from(potentialOrders);
      console.log(`[Amazon Exporter] Fallback found ${orderElements.length} order containers`);
    }

    orderElements.forEach((orderEl, index) => {
      try {
        const order = parseOrderElement(orderEl);
        if (order && order.orderId) {
          // Skip duplicates
          if (seenOrderIds.has(order.orderId)) {
            return;
          }
          
          // Filter by date if specified
          if (!exportAll && startDateObj && endDateObj && order.orderDate) {
            const orderDateObj = new Date(order.orderDate);
            if (orderDateObj < startDateObj || orderDateObj > endDateObj) {
              return;
            }
          }
          
          orders.push(order);
          console.log(`[Amazon Exporter] Parsed order: ${order.orderId}, ${order.orderDate}, ${order.totalAmount} ${order.currency}`);
        }
      } catch (error) {
        console.warn(`[Amazon Exporter] Failed to parse order ${index}:`, error);
      }
    });

    return orders;
  }

  /**
   * Parse a single order element
   */
  function parseOrderElement(orderEl) {
    const order = {
      orderId: '',
      orderDate: '',
      totalAmount: 0,
      currency: 'EUR',
      items: [],
      orderStatus: '',
      detailsUrl: ''
    };

    const orderText = orderEl.textContent || '';

    // Extract Order ID
    const orderIdMatch = orderText.match(/\d{3}-\d{7}-\d{7}/);
    if (orderIdMatch) {
      order.orderId = orderIdMatch[0];
    }
    
    // Try links for order ID
    if (!order.orderId) {
      const links = orderEl.querySelectorAll('a[href]');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const urlMatch = href.match(/orderI[Dd]=(\d{3}-\d{7}-\d{7})/);
        if (urlMatch) {
          order.orderId = urlMatch[1];
          break;
        }
      }
    }

    // Extract order details URL
    const detailsLink = orderEl.querySelector('a[href*="order-details"], a[href*="orderID="], a[href*="orderId="]');
    if (detailsLink) {
      order.detailsUrl = detailsLink.href;
      if (!order.orderId) {
        const urlMatch = order.detailsUrl.match(/orderI[Dd]=(\d{3}-\d{7}-\d{7})/i);
        if (urlMatch) {
          order.orderId = urlMatch[1];
        }
      }
    }

    // Extract Order Date - German format: "15. Januar 2025"
    const datePatterns = [
      /(?:Bestellt am|Bestellung aufgegeben am)\s+(\d{1,2}\.\s*[A-Za-zäöü]+\s+\d{4})/i,
      /(\d{1,2}\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4})/i,
      /(?:Order placed|Ordered on)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i
    ];
    
    for (const pattern of datePatterns) {
      const match = orderText.match(pattern);
      if (match) {
        const parsedDate = parseDate(match[1]);
        if (parsedDate && parsedDate.startsWith('20')) {
          order.orderDate = parsedDate;
          break;
        }
      }
    }

    // Extract Total Amount
    const pricePatterns = [
      /(?:Summe|Gesamtsumme|Gesamt|Total)[:\s]*(?:EUR|€)?\s*([0-9.,]+)\s*(?:EUR|€)?/i,
      /(?:EUR|€)\s*([0-9.,]+)/i,
      /([0-9]+[.,][0-9]{2})\s*(?:EUR|€)/,
      /(?:\$|£)\s*([0-9.,]+)/
    ];
    
    for (const pattern of pricePatterns) {
      const match = orderText.match(pattern);
      if (match) {
        let priceStr = match[1];
        // Handle European format
        if (priceStr.includes(',') && priceStr.includes('.')) {
          priceStr = priceStr.replace(/\./g, '').replace(',', '.');
        } else if (priceStr.includes(',')) {
          priceStr = priceStr.replace(',', '.');
        }
        const amount = parseFloat(priceStr);
        if (!isNaN(amount) && amount > 0) {
          order.totalAmount = amount;
          if (orderText.includes('€') || orderText.includes('EUR')) {
            order.currency = 'EUR';
          } else if (orderText.includes('£')) {
            order.currency = 'GBP';
          } else if (orderText.includes('$')) {
            order.currency = 'USD';
          }
          break;
        }
      }
    }

    // Extract Order Status
    const statusPatterns = [
      /(?:Zugestellt|Geliefert)\s*(?:am)?\s*[\d\.\s\w]*/i,
      /(?:Delivered|Arriving|Shipped)\s*[\w\s,\d]*/i,
      /(?:Storniert|Cancelled|Returned|Refunded)/i
    ];
    
    for (const pattern of statusPatterns) {
      const match = orderText.match(pattern);
      if (match) {
        order.orderStatus = match[0].trim().substring(0, 50);
        break;
      }
    }

    // Extract Items
    order.items = parseOrderItems(orderEl);

    return order;
  }

  /**
   * Parse items from an order element
   */
  function parseOrderItems(orderEl) {
    const items = [];
    const seenAsins = new Set();
    
    // Find all product links
    const productLinks = orderEl.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"]');
    
    productLinks.forEach(link => {
      const href = link.getAttribute('href') || link.href || '';
      const asinMatch = href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (!asinMatch) return;
      
      const asin = asinMatch[1].toUpperCase();
      if (seenAsins.has(asin)) return;
      seenAsins.add(asin);
      
      const item = {
        title: '',
        asin: asin,
        quantity: 1,
        price: 0,
        itemUrl: `https://www.amazon.de/dp/${asin}`
      };
      
      // Get title
      let title = link.textContent?.trim() || '';
      
      if (!title || title.length < 5) {
        let parent = link.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const titleEl = parent.querySelector('.a-text-bold, [class*="product-title"], [class*="item-title"]');
          if (titleEl && titleEl.textContent?.trim().length > 5) {
            title = titleEl.textContent.trim();
            break;
          }
          parent = parent.parentElement;
        }
      }
      
      if (!title || title.length < 5) {
        title = link.title || link.getAttribute('aria-label') || '';
      }
      
      if (!title || title.length < 5) {
        const img = link.querySelector('img') || link.parentElement?.querySelector('img');
        if (img?.alt) title = img.alt;
      }
      
      item.title = title.replace(/\s+/g, ' ').trim();
      
      // Get quantity
      let parentEl = link.parentElement;
      for (let i = 0; i < 8 && parentEl; i++) {
        const qtyMatch = (parentEl.textContent || '').match(/(?:Qty|Quantity|Menge|Anzahl)[:\s]*(\d+)/i);
        if (qtyMatch) {
          item.quantity = parseInt(qtyMatch[1], 10);
          break;
        }
        parentEl = parentEl.parentElement;
      }
      
      if (item.title || item.asin) {
        items.push(item);
      }
    });
    
    return items;
  }

  /**
   * Fetch order details for item prices (only for multi-item orders)
   */
  async function fetchOrderDetailsForPrices(orders) {
    // Handle single-item orders - use total as price
    orders.forEach(order => {
      if (order.items.length === 1 && order.totalAmount > 0) {
        order.items[0].price = order.totalAmount;
      }
    });
    
    // Filter orders needing detail fetch
    const ordersNeedingDetails = orders.filter(order => 
      order.items.length > 1 && order.items.some(item => item.price === 0) && order.detailsUrl
    );
    
    console.log('[Amazon Exporter] Fetching details for', ordersNeedingDetails.length, 'multi-item orders');
    
    for (let i = 0; i < ordersNeedingDetails.length; i++) {
      const order = ordersNeedingDetails[i];
      
      try {
        updateProgress(80 + (i / ordersNeedingDetails.length) * 10, 
          `Fetching prices for order ${i + 1}/${ordersNeedingDetails.length}...`);
        
        const response = await fetch(order.detailsUrl, {
          credentials: 'include'
        });
        
        if (!response.ok) continue;
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        parseItemPricesFromDetails(order, doc);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn('[Amazon Exporter] Error fetching details:', error);
      }
    }
  }

  /**
   * Parse item prices from order details page
   */
  function parseItemPricesFromDetails(order, doc) {
    const asinPriceMap = new Map();
    
    // Look for product containers with prices
    const containers = doc.querySelectorAll('.a-row, [class*="item"], [class*="product"]');
    
    containers.forEach(container => {
      const link = container.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]');
      if (!link) return;
      
      const asinMatch = (link.getAttribute('href') || '').match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (!asinMatch) return;
      
      const asin = asinMatch[1].toUpperCase();
      const text = container.textContent || '';
      
      const priceMatch = text.match(/(?:EUR|€)\s*([0-9]+[.,][0-9]{2})/i) ||
                         text.match(/([0-9]+[.,][0-9]{2})\s*(?:EUR|€)/);
      
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(',', '.'));
        if (!isNaN(price) && price > 0) {
          asinPriceMap.set(asin, price);
        }
      }
    });
    
    // Update items
    order.items.forEach(item => {
      if (asinPriceMap.has(item.asin)) {
        item.price = asinPriceMap.get(item.asin);
      }
    });
  }

  /**
   * Parse date string to ISO format
   */
  function parseDate(dateText) {
    if (!dateText) return null;
    
    const germanMonths = {
      'januar': 1, 'februar': 2, 'märz': 3, 'april': 4,
      'mai': 5, 'juni': 6, 'juli': 7, 'august': 8,
      'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12
    };
    
    const englishMonths = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    
    const allMonths = { ...germanMonths, ...englishMonths };
    const cleanText = dateText.trim().toLowerCase();
    
    // German: "15. Januar 2024"
    const germanMatch = cleanText.match(/(\d{1,2})\.?\s*([a-zäöü]+)\s*(\d{4})/i);
    if (germanMatch) {
      const day = parseInt(germanMatch[1], 10);
      const monthName = germanMatch[2].toLowerCase();
      const year = parseInt(germanMatch[3], 10);
      
      if (year >= 2000 && year <= 2100 && allMonths[monthName]) {
        return `${year}-${String(allMonths[monthName]).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    // English: "January 15, 2024"
    const englishMatch = cleanText.match(/([a-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
    if (englishMatch) {
      const monthName = englishMatch[1].toLowerCase();
      const day = parseInt(englishMatch[2], 10);
      const year = parseInt(englishMatch[3], 10);
      
      if (year >= 2000 && year <= 2100 && allMonths[monthName]) {
        return `${year}-${String(allMonths[monthName]).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    return null;
  }

  /**
   * Convert orders to CSV format
   */
  function convertToCSV(orders) {
    const headers = [
      'Order ID', 'Order Date', 'Total Amount', 'Currency', 'Status',
      'Item Title', 'Item ASIN', 'Item Quantity', 'Item Price', 'Item URL', 'Details URL'
    ];
    
    const rows = [headers.join(',')];
    
    orders.forEach(order => {
      if (order.items.length === 0) {
        rows.push([
          `"${order.orderId}"`,
          `"${order.orderDate}"`,
          order.totalAmount,
          `"${order.currency}"`,
          `"${(order.orderStatus || '').replace(/"/g, '""')}"`,
          '', '', '', '', '',
          `"${order.detailsUrl}"`
        ].join(','));
      } else {
        order.items.forEach(item => {
          rows.push([
            `"${order.orderId}"`,
            `"${order.orderDate}"`,
            order.totalAmount,
            `"${order.currency}"`,
            `"${(order.orderStatus || '').replace(/"/g, '""')}"`,
            `"${(item.title || '').replace(/"/g, '""')}"`,
            `"${item.asin}"`,
            item.quantity,
            item.price,
            `"${item.itemUrl}"`,
            `"${order.detailsUrl}"`
          ].join(','));
        });
      }
    });
    
    return rows.join('\n');
  }

  /**
   * Update progress in popup
   */
  function updateProgress(percent, message) {
    browser.runtime.sendMessage({
      action: 'updateProgress',
      data: { percent, message }
    }).catch(() => {});
  }

})();
