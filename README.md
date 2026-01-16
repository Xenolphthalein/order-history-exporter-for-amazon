# Amazon Order History Exporter
This firefox browser extension allows you to export your Amazon order history as a json file.

## Features
- Export your entire Amazon Order History
- Export orders within a specific date range
- Export in JSON format
- Easy to use interface
- Open source and free to use
- No tracking or data collection

## Data Exported

### JSON
The data model for each order includes the following JSON fields:

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
            "itemUrl": "string (URL to item page)"
        }
    ],
    "orderStatus": "string",
    "detailsUrl": "string (URL to order details page)"
}
```

### CSV
The CSV export exports multiple rows for orders with multiple items. The columns are as follows:

```csv
orderId, orderDate, totalAmount, currency, itemTitle, itemAsin, itemQuantity, itemPrice, itemUrl, orderStatus, detailsUrl
```
