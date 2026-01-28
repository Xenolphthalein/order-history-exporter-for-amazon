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

### CSV
The CSV export exports multiple rows for orders with multiple items. The columns are as follows:

```csv
Order ID, Order Date, Total Amount, Currency, Total Savings, Status, Item Title, Item ASIN, Item Quantity, Item Price, Item Discount, Promotions, Item URL, Details URL
```
