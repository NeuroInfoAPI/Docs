**⤴️ Back to the [README](README.md)**

# Shop API Documentation

## Endpoints

### All Products

`GET https://neuroinfoapi.dev/api/v2/shop/products`

### Specific Product

`GET https://neuroinfoapi.dev/api/v2/shop/product`

## Description

Access Neuro-sama shop products, including variants, prices, images, collections, and additional product details. Older drops are included when available, even if they can no longer be purchased.

## Authentication

**Required** - Use header: `Authorization: Bearer YOUR_API_TOKEN`

## Endpoints Details

### All Products

#### Parameters

| Parameter  | Type   | Required | Description                                                   |
| ---------- | ------ | -------- | ------------------------------------------------------------- |
| `currency` | string | No       | Requested price currency, for example `USD`, `EUR`, or `GBP`. |

#### Request Examples

```http
GET https://neuroinfoapi.dev/api/v2/shop/products
Authorization: Bearer YOUR_API_TOKEN

GET https://neuroinfoapi.dev/api/v2/shop/products?currency=EUR
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

The following product is an example of the response structure.

```json
{
  "data": [
    {
      "id": "1234567890123",
      "title": "Neuro-sama Plush",
      "handle": "neuro-sama-plush",
      "url": "https://neurosama.shop/p/1234567890123",
      "description": "Neuro-sama plush.",
      "descriptionHtml": "<p>Neuro-sama plush.</p>",
      "vendor": "Neuro-sama",
      "productType": "Plush",
      "tags": [],
      "availableForSale": true,
      "createdAt": 1793491200000,
      "updatedAt": 1793577600000,
      "publishedAt": 1793491200000,
      "seo": { "title": null, "description": null },
      "options": [{ "name": "Size", "values": ["One size"] }],
      "images": [],
      "variants": [
        {
          "id": "1234567890456",
          "title": "One size",
          "sku": null,
          "availableForSale": true,
          "price": { "amount": "29.99", "currencyCode": "USD" },
          "compareAtPrice": null,
          "selectedOptions": [{ "name": "Size", "value": "One size" }],
          "image": null
        }
      ],
      "collections": [{ "id": "123456789", "title": "Neuro-sama" }],
      "metafields": []
    }
  ]
}
```

### Specific Product

#### Parameters

| Parameter  | Type   | Required | Description                                                  |
| ---------- | ------ | -------- | ------------------------------------------------------------ |
| `id`       | string | Yes      | Numeric product ID from the catalog, containing 1-20 digits. |
| `currency` | string | No       | Requested price currency, for example `EUR`.                 |

#### Request Examples

```http
GET https://neuroinfoapi.dev/api/v2/shop/product?id=1234567890123
Authorization: Bearer YOUR_API_TOKEN

GET https://neuroinfoapi.dev/api/v2/shop/product?id=1234567890123&currency=EUR
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

The response uses the same product properties as the list endpoint. `data` contains one product object instead of an array. Use an exact product ID from the list endpoint.

## Product Properties

| Property                                | Type     | Description                                                   |
| --------------------------------------- | -------- | ------------------------------------------------------------- |
| `id`                                    | string   | Numeric Shopify product ID, kept as a string.                 |
| `title`, `handle`                       | string   | Product title and storefront handle.                          |
| `url`                                   | string   | Product URL at `https://neurosama.shop/p/{id}`.               |
| `description`, `descriptionHtml`        | string   | Plain-text and HTML descriptions.                             |
| `vendor`, `productType`                 | string   | Vendor name and product category from the storefront.         |
| `tags`                                  | string[] | Product tags from the storefront.                             |
| `availableForSale`                      | boolean  | Availability reported by the shop; see the note below.        |
| `createdAt`, `updatedAt`, `publishedAt` | number   | Product timestamps in Unix milliseconds.                      |
| `seo`                                   | object   | SEO `title` and `description`; either can be `null`.          |
| `options`                               | object[] | Available options, each with `name` and string `values`.      |
| `images`                                | object[] | Images with `url`, nullable `altText`, `width`, and `height`. |
| `variants`                              | object[] | Product variants; see below.                                  |
| `collections`                           | object[] | Collections with numeric string `id` and `title`.             |
| `metafields`                            | object[] | Published metadata; see below.                                |

### Variants

| Property           | Type           | Description                                            |
| ------------------ | -------------- | ------------------------------------------------------ |
| `id`               | string         | Numeric Shopify variant ID.                            |
| `title`            | string         | Variant title.                                         |
| `sku`              | string or null | Stock keeping unit, if provided.                       |
| `availableForSale` | boolean        | Availability reported by the shop; see the note below. |
| `price`            | object         | Price with string `amount` and `currencyCode`.         |
| `compareAtPrice`   | object or null | Original comparison price, with the same money format. |
| `selectedOptions`  | object[]       | Selected option pairs with `name` and `value`.         |
| `image`            | object or null | Variant image, with the same fields as product images. |

`availableForSale` can remain `true` for older drops that can no longer be purchased. This applies to both products and variants. Check the product page for current ordering availability.

### Metafields

Published metadata includes selected `productListing` and `taiga` fields, such as product details, size guides, order type, and preorder timelines, when available. Each entry contains `namespace`, `key`, `type`, string `value`, and a nullable `reference` object. JSON values remain strings and are not automatically parsed.

References can contain a metaobject (`type` and `fields` with `key`, `type`, `value`), a file (`url`, `mimeType`), or an image (`image` with the same image properties as above), identified by `__typename`. Fields that are not published to the storefront are omitted.

## Currency Conversion

Without `currency`, prices use their original shop currency. With `currency`, both `price` and non-null `compareAtPrice` values are converted. Currency input is trimmed and uppercased; converted amounts are decimal strings rounded to the target currency's fraction digits.

Each price's `currencyCode` identifies its returned currency, matching the Shopify Storefront price format. For example:

```json
{
  "price": {
    "amount": "27.59",
    "currencyCode": "EUR"
  }
}
```

If a currency is unsupported or conversion fails, the affected product keeps its original prices and currency codes. The response remains HTTP `200`.

Converted prices are estimates; final checkout prices may differ.

## Error Responses

| Status | Code                  | Description                                                                                                              |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `401`  | `AU9`, `AU10`, `AU11` | Missing, malformed, or invalid/expired API token.                                                                        |
| `400`  | `AP4`                 | Missing/invalid `id`, repeated values for supported query parameters, or `currency` longer than 32 characters after trimming. |
| `404`  | `SH1`                 | No product found with the given ID.                                                                                      |
| `503`  | `SH2`                 | Product data is temporarily unavailable; includes `Retry-After: 120`.                                                    |
| `429`  | `RL3`                 | Shared v2 rate limit exceeded.                                                                                           |

### No Product (404)

```json
{
  "error": {
    "code": "SH1",
    "message": "No shop product found with the given id.",
    "timestamp": 1794182400000,
    "path": "/api/v2/shop/product"
  }
}
```

See [errors.md](errors.md) for the common error format and codes.

## Notes

- Product data is updated every 30 seconds to 2 minutes.
- Successful responses may also be cached privately in the browser for 30 seconds.
- During temporary outages, older product data may be returned.
- Both endpoints use the default v2 rate limits: 100 requests per minute per authenticated Twitch account.
- The list endpoint returns all available entries in one response, without pagination. An empty catalog returns `data: []`.
- The [`shopProductsUpdate` WebSocket event](websocket.md#shop-products-update-event) sends the full catalog when products change, using original shop currencies.
