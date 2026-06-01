# API Documentation

Base URL: `http://localhost:8000`

The routes below are scaffolded and return 501 until business logic is added.

## Health
- `GET /health`

Response
```json
{ "status": "ok" }
```

## Products
- `POST /products`
- `GET /products`
- `GET /products/{id}`
- `PUT /products/{id}`
- `DELETE /products/{id}`

Example payload
```json
{
  "name": "Starter Kit",
  "sku": "SKU-001",
  "price": 59.99,
  "quantity_in_stock": 50
}
```

## Customers
- `POST /customers`
- `GET /customers`
- `GET /customers/{id}`
- `DELETE /customers/{id}`

Example payload
```json
{
  "full_name": "Jordan Lee",
  "email": "jordan@example.com",
  "phone_number": "+1-555-0100"
}
```

## Orders
- `POST /orders`
- `GET /orders`
- `GET /orders/{id}`
- `DELETE /orders/{id}`

Example payload
```json
{
  "customer_id": 1,
  "items": [
    { "product_id": 10, "quantity": 2 },
    { "product_id": 12, "quantity": 1 }
  ]
}
```

## Status Codes
- `201`: Resource created
- `200`: Successful retrieval
- `204`: Deleted
- `400`: Validation error
- `404`: Resource not found
- `409`: Conflict (unique constraints, stock issues)
- `501`: Not implemented (current scaffold)
