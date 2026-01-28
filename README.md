<img src="assets/icons/icon-96.png" alt="Order History Exporter for Amazon" width="80">

# Order History Exporter for Amazon

[![License: Unlicense](https://img.shields.io/badge/License-Unlicense-blue.svg)](LICENSE)
[![Firefox](https://img.shields.io/badge/Firefox-Extension-FF7139?logo=firefox&logoColor=white)](https://www.mozilla.org/firefox/)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://www.google.com/chrome/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Browser extension for exporting your Amazon order history to JSON or CSV format. Supports both **Firefox** and **Chromium-based browsers** (Chrome, Edge, Brave, etc.). While it is designed for use with [Toolbox for Firefly III](https://github.com/xenolphthalein/toolbox-for-firefly-iii) to enrich financial transactions with Amazon order details, it can be used independently for personal record-keeping or data analysis.

---

## Table of Contents

- [Order History Exporter for Amazon](#order-history-exporter-for-amazon)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Installation](#installation)
    - [From Source](#from-source)
  - [Usage](#usage)
  - [Data Exported](#data-exported)
    - [JSON Format](#json-format)
    - [CSV Format](#csv-format)
  - [Contributing](#contributing)
  - [License](#license)

---

## Features

- **Full History Export** — Export your entire Amazon order history
- **Date Range Filtering** — Export orders within a specific date range
- **Multiple Formats** — Export as JSON or CSV
- **Privacy Focused** — No tracking or data collection; all processing happens locally
- **Open Source** — Free to use and modify

---

## Installation

### From Source

Requires Node.js 20+.

```bash
# Clone the repository
git clone https://github.com/xenolphthalein/order-history-exporter-for-amazon.git
cd order-history-exporter-for-amazon

# Install dependencies
npm install

# Build for all browsers (Firefox + Chrome)
npm run build

# Or build for a specific browser
npm run build:firefox
npm run build:chrome
```

The built extensions will be in browser-specific directories:
- **Firefox**: `dist/firefox/` — Load via `about:debugging` → "This Firefox" → "Load Temporary Add-on"
- **Chrome/Chromium**: `dist/chrome/` — Load via `chrome://extensions` → "Developer mode" → "Load unpacked"

---

## Usage

1. Install the extension in your browser (Firefox or Chrome/Chromium)
2. Navigate to Amazon and log in to your account
3. Click the extension icon in the toolbar
4. Select your export options (date range, format)
5. Click "Export" to download your order history

---

## Data Exported

### JSON Format

The data model for each order includes the following fields:

```json
{
    "orderId": "string",
    "orderDate": "string (ISO 8601 date)",
    "totalAmount": "number",
    "currency": "string",
    "items": [
        {
            "title": "string",
            "asin": "string",
            "quantity": "number",
            "price": "number",
            "discount": "number",
            "itemUrl": "string (URL to item page)"
        }
    ],
    "orderStatus": "string",
    "detailsUrl": "string (URL to order details page)",
    "promotions": [
        {
            "description": "string",
            "amount": "number"
        }
    ],
    "totalSavings": "number"
}
```

### CSV Format

The CSV export creates multiple rows for orders with multiple items. Columns:

| Column | Description |
|--------|-------------|
| Order ID | Amazon order identifier |
| Order Date | Date of the order |
| Total Amount | Order total |
| Currency | Currency code |
| Total Savings | Total discounts applied |
| Status | Order status |
| Item Title | Product name |
| Item ASIN | Amazon product identifier |
| Item Quantity | Number of items |
| Item Price | Price per item |
| Item Discount | Discount applied to item |
| Promotions | Applied promotions |
| Item URL | Link to product page |
| Details URL | Link to order details |

---

## Contributing

Contributions are welcome. Please submit PRs to the `main` branch.

**Development Commands**

```bash
npm run build              # Build for all browsers (development)
npm run build:firefox      # Build Firefox extension only
npm run build:chrome       # Build Chrome extension only
npm run build:prod         # Production build for all browsers
npm run build:prod:firefox # Production build for Firefox
npm run build:prod:chrome  # Production build for Chrome
npm run lint               # ESLint
npm run test               # Run tests
```

---

## License

This project is released under the [Unlicense](LICENSE), dedicating it to the public domain. You are free to use, modify, and distribute it for any purpose without restrictions.
