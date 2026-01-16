/**
 * Amazon Order History Exporter - Background Script
 * Handles file downloads and cross-script communication
 */

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadFile') {
    downloadFile(message.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'updateProgress') {
    // Forward progress updates to popup if it's open
    browser.runtime.sendMessage(message).catch(() => {
      // Popup might be closed, ignore error
    });
  }
});

/**
 * Download file using the browser's download API
 */
async function downloadFile(data) {
  const { content, fileName, mimeType } = data;
  
  // Create a data URL from the content
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  try {
    // Trigger download
    const downloadId = await browser.downloads.download({
      url: url,
      filename: fileName,
      saveAs: true
    });
    
    // Clean up the blob URL after download starts
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000); // Clean up after 1 minute
    
    return downloadId;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

// Log when extension is installed or updated
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Amazon Order History Exporter installed');
  } else if (details.reason === 'update') {
    console.log('Amazon Order History Exporter updated to version', browser.runtime.getManifest().version);
  }
});
