/**
 * Shared constants for Order History Exporter for Amazon
 */

/** Key for the export state in sessionStorage */
export const STORAGE_KEY = 'amazonExporter';

/** Key for the stop-requested flag in browser.storage.session */
export const STOP_FLAG_KEY = 'amazonExporterStopRequested';

/**
 * Subfolder (relative to the browser's Downloads directory) that
 * receives auto-downloaded invoice PDFs. Kept separate from the JSON/CSV
 * export so the user's Downloads root stays uncluttered.
 */
export const INVOICE_DOWNLOAD_SUBFOLDER = 'amazon-invoices';

/**
 * Key in browser.storage.session holding the id of the tab that hid
 * Chrome's download UI, so the background can restore it if that tab
 * disappears mid-export.
 */
export const DOWNLOADS_UI_OWNER_KEY = 'amazonExporterDownloadsUiOwnerTab';
