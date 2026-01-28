<img src="assets/icons/icon-96.png" alt="Amazon Order History Exporter" width="80">

# Amazon Order History Exporter

[![License: Unlicense](https://img.shields.io/badge/License-Unlicense-blue.svg)](LICENSE)
[![Firefox](https://img.shields.io/badge/Firefox-Extension-FF7139?logo=firefox&logoColor=white)](https://www.mozilla.org/firefox/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Firefox browser extension for exporting your Amazon order history to JSON or CSV format. While it is designed for use with [Toolbox for Firefly III](https://github.com/xenolphthalein/toolbox-for-firefly-iii) to enrich financial transactions with Amazon order details, it can be used independently for personal record-keeping or data analysis.

---

## Table of Contents

- [Amazon Order History Exporter](#amazon-order-history-exporter)
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
git clone https://github.com/xenolphthalein/amazon-order-history-exporter.git
cd amazon-order-history-exporter

# Install dependencies
npm install

# Build the extension
npm run build
```

The built extension will be in the `dist/` directory. Load it in Firefox via `about:debugging` → "This Firefox" → "Load Temporary Add-on" and select the `manifest.json` file.

---

## Usage

1. Install the extension in Firefox
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
npm run build        # Production build
npm run lint         # ESLint
```

---

## License

This project is released under the [Unlicense](LICENSE), dedicating it to the public domain. You are free to use, modify, and distribute it for any purpose without restrictions.
