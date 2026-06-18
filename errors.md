**⤴️ Back to the [README](README.md)**

# API Error Documentation

## Response Format

v2 error responses follow a consistent JSON format. Success responses use a consistent `{ "data": ... }` envelope; the payload inside `data` differs by endpoint and is shown in each endpoint's documentation.

**Success Response (example):**

```json
{
  "data": {
    "year": 2026,
    "week": 11,
    "schedule": []
  }
}
```

**Error Response:**

All REST errors use the same envelope. `timestamp` is a Unix epoch in milliseconds; `path` is the request path without query parameters.

```json
{
  "error": {
    "code": "SC1",
    "message": "No schedule found in the database for the given week & year.",
    "timestamp": 1717516800000,
    "path": "/api/v2/schedule"
  }
}
```

This applies to route handlers, query validation (`AP4`), authentication (`AU*`), and rate limits (`RL*`).

## Error Codes Reference

### General API Errors (AP)

| Code  | Error                  | Description                                  |
| ----- | ---------------------- | -------------------------------------------- |
| `AP1` | `Api_InternalError`    | Internal server error                        |
| `AP2` | `Api_MethodNotAllowed` | Method not allowed (API tokens are GET-only) |
| `AP3` | `Api_NotFound`         | 404 Not Found                                |
| `AP4` | `Api_InvalidQuery`     | Invalid query parameters                     |

### Schedule Errors (SC)

| Code  | Error                  | Description                                                 |
| ----- | ---------------------- | ----------------------------------------------------------- |
| `SC1` | `Sched_NoSchedule`     | No schedule found in the database for the given week & year |
| `SC2` | `Sched_InvalidParams`  | Invalid year or week parameter                              |
| `SC3` | `Sched_NoSearchInput`  | Missing search query parameter                              |
| `SC4` | `Sched_SearchTooShort` | Search query must be at least 3 characters long             |

### VOD Errors (VD)

| Code  | Error        | Description                           |
| ----- | ------------ | ------------------------------------- |
| `VD1` | `Vod_NoVod`  | No vod found with the given stream id |
| `VD2` | `Vod_NoVods` | No vods found in the database         |

### Authentication Errors (AU)

| Code   | Error                        | Description                                                                    |
| ------ | ---------------------------- | ------------------------------------------------------------------------------ |
| `AU1`  | `Auth_MissingHeader`         | Missing or invalid authorization header                                        |
| `AU2`  | `Auth_InvalidToken`          | Invalid or expired API token                                                   |
| `AU3`  | `Auth_TokenRegenFailed`      | Failed to regenerate token                                                     |
| `AU4`  | `Auth_MissingUserData`       | User ID and username are required                                              |
| `AU5`  | `Auth_TokenGenFailed`        | Failed to generate token                                                       |
| `AU6`  | `Auth_TokenDelFailed`        | Failed to delete token                                                         |
| `AU8`  | `Auth_AccountBlocked`        | Account is blocked                                                             |
| `AU9`  | `Auth_MissingHeaderDetailed` | Missing or invalid authorization header. Use: Authorization: Bearer YOUR_TOKEN |
| `AU10` | `Auth_InvalidTokenFormat`    | Invalid token format                                                           |
| `AU11` | `Auth_InvalidExpiredToken`   | Invalid or expired API token                                                   |
| `AU12` | `Auth_InternalError`         | Internal server error during authentication                                    |
| `AU13` | `Auth_ConfigurationError`    | Configuration error. Please check Twitch settings                              |
| `AU14` | `Auth_MissingAuthCode`       | Authorization code missing                                                     |
| `AU15` | `Auth_OriginNotAllowed`      | Browser origin is not allowed for this authentication request                  |

### Rate Limit Errors (RL)

| Code  | Error                       | Description                                             |
| ----- | --------------------------- | ------------------------------------------------------- |
| `RL2` | `RateLimit_TooManyRequests` | Too many requests from this API token                   |
| `RL3` | `RateLimit_Strict`          | Rate limit exceeded: Maximum 30 requests per minute     |
| `RL4` | `RateLimit_Standard`        | Rate limit exceeded: Maximum 100 requests per minute    |
| `RL5` | `RateLimit_Generous`        | Rate limit exceeded: Maximum 300 requests per minute    |
| `RL6` | `RateLimit_Burst`           | Rate limit exceeded: Maximum 10 requests per 10 seconds |
| `RL7` | `RateLimit_Sensitive`       | Rate limit exceeded: Maximum 2 requests per 10 seconds  |
| `RL8` | `RateLimit_SearchMinute`    | Rate limit exceeded: Maximum 6 requests per minute      |
| `RL9` | `RateLimit_BlogFeedMinute`  | Rate limit exceeded: Maximum 16 requests per minute     |

### Subathon Errors (SB)

| Code  | Error                  | Description                                            |
| ----- | ---------------------- | ------------------------------------------------------ |
| `SB1` | `Sub_NoActiveSubathon` | No active subathon found                               |
| `SB2` | `Sub_NoParams`         | Year parameter is required                             |
| `SB3` | `Sub_InvalidParams`    | Invalid year parameter or year cannot be in the future |
| `SB4` | `Sub_NoSubathon`       | No subathon found for the specified year               |

### Blog Errors (BL)

| Code  | Error             | Description        |
| ----- | ----------------- | ------------------ |
| `BL1` | `Blog_NoBlogData` | No blog data found |

## Testing Endpoint

### Get Error Code

#### Endpoint

`GET https://neuro.appstun.net/api/test/geterror`

#### Description

Get a specific error response by providing an error code. This endpoint is useful for testing error handling in your application and understanding the error response format.

#### Parameters

| Parameter | Type   | Required | Description                                       |
| --------- | ------ | -------- | ------------------------------------------------- |
| `code`    | string | No       | Error code to retrieve (e.g., "AP1", "SC1", etc.) |

#### Request Examples

```http
GET https://neuro.appstun.net/api/test/geterror?code=AP1
GET https://neuro.appstun.net/api/test/geterror?code=SC1
GET https://neuro.appstun.net/api/test/geterror
```

#### Response Format

##### Success Response (418)

When a valid error code is provided:

```json
{
  "error": {
    "code": "AP1",
    "message": "Internal server error",
    "timestamp": 1717516800000,
    "path": "/api/test/geterror"
  }
}
```

##### Not Found Response (404)

When an invalid or missing error code is provided:

```json
{
  "error": "Not Found"
}
```

#### Notes

- This endpoint uses status code `418 I'm a teapot` for valid error codes as a testing convention
- Returns `404 Not Found` for invalid or missing error codes
- Rate limited using standard tier (100 requests per minute)
- No authentication required

## Common Error Scenarios

### Authentication Issues

- **Missing Token**: Returns `AU1` or `AU9` with detailed instructions
- **Invalid Token**: Returns `AU2` or `AU11` for expired/invalid tokens
- **Token Format**: Returns `AU10` for malformed authorization headers
- **Account Issues**: Returns `AU8` for blocked accounts

### Rate Limiting

The API implements multiple rate limiting tiers:

- **Burst Protection**: 10 requests per 10 seconds (`RL6`)
- **Sensitive Endpoint Burst**: 2 requests per 10 seconds (`RL7`)
- **Search Minute Tier**: 6 requests per minute (`RL8`)
- **Strict Tier**: 30 requests per minute (`RL3`)
- **Standard Tier**: 100 requests per minute (`RL4`)
- **Generous Tier**: 300 requests per minute (`RL5`)

### Parameter Validation

- **Schedule / Subathon / VOD**: invalid or missing query parameters return `AP4`; missing resources return domain codes (`SC1`, `SB4`, `VD1`, …)

### WebSocket Errors

The WebSocket API uses two different error formats:

- **Ticket endpoint** (`GET /api/v2/ws/ticket`): Standard JSON errors with API codes (`AU*`, `RL*`)
- **WebSocket handshake** (`WSS /api/v2/ws`): Plain text HTTP errors (non-JSON)
- **WebSocket message validation**: Structured WebSocket messages with `type: "invalid"`

#### WebSocket Handshake Errors (plain text)

- `404 Not Found` (invalid WebSocket path)
- `401 Missing authentication (ticket or token required)`
- `401 Invalid or expired ticket`
- `401 Invalid or expired token`
- `429 Connection limit reached (max 5)`
- `500 Authentication error`
- `500 Upgrade failed`

#### WebSocket Message Error Example

```json
{
  "type": "invalid",
  "data": {
    "reason": "malformed",
    "message": "Could not parse message."
  }
}
```

Possible `reason` values include malformed payloads and missing event type fields.

<br>

---

Encountering unexpected errors despite sending correct data?<br> [Open an issue](../../issues) or start a [discussion](../../discussions).
