**⤴️ Back to the [README](README.md)**

# API Error Documentation

## Response Format

Error responses follow a consistent JSON format. Success responses can differ by endpoint and are shown in each endpoint's documentation.

**Success Response (example):**

```json
{
  "year": 2026,
  "week": 11,
  "schedule": []
}
```

**Error Response:**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## Error Codes Reference

### General API Errors (AP)

| Code  | Error               | Description           |
| ----- | ------------------- | --------------------- |
| `AP1` | `Api_InternalError` | Internal server error |
| `AP3` | `Api_NotFound`      | 404 Not Found         |

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

### Subathon Errors (SB)

| Code  | Error                       | Description                                            |
| ----- | --------------------------- | ------------------------------------------------------ |
| `SB1` | `Subathon_NoActiveSubathon` | No active subathon found                               |
| `SB2` | `Subathon_NoParams`         | Year parameter is required                             |
| `SB3` | `Subathon_InvalidParams`    | Invalid year parameter or year cannot be in the future |
| `SB4` | `Subathon_NoSubathon`       | No subathon found for the specified year               |

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
    "message": "Internal server error"
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

- **Schedule**: Requires valid year and week parameters (`SC2`)
- **Subathon**: Requires year parameter, cannot be future date (`SB3`)
- **VOD**: Requires valid stream ID (`VD1`)

### WebSocket Errors

The WebSocket API uses two different error formats:

- **Ticket endpoint** (`GET /api/ws/ticket`): Standard JSON errors with API codes (`AU*`, `RL*`)
- **WebSocket handshake** (`WSS /api/ws`): Plain text HTTP errors (non-JSON)
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
