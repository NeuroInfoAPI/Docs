**⤴️ Back to the [README](README.md)**

# Schedule API Documentation

## Endpoints

> [!IMPORTANT]
> "Latest" updates only on new official releases; otherwise it returns the last published schedule.

### Specific Weekly Schedule

`GET https://neuro.appstun.net/api/v2/schedule`

### Latest Weekly Schedule

`GET https://neuro.appstun.net/api/v2/schedule/latest`

### Schedule Image

`GET https://neuro.appstun.net/api/v2/schedule/image`

### Search Weekly Schedules

`GET https://neuro.appstun.net/api/v2/schedule/search`

### Devstream Times

`GET https://neuro.appstun.net/api/v2/devstream/times`

### Schedule Weeks Index

`GET https://neuro.appstun.net/api/v2/schedule/weeks`

## Description

Access weekly schedule data from the database. Use the specific-week endpoint for exact calendar weeks, the latest endpoint for the most recent published schedule, the image endpoint to display a weekly schedule image, the search endpoint for message-based lookups with cursor pagination, and the weeks endpoint to list available weeks per year. For devstream timestamps, see [Devstream Times](#devstream-times) below.

## Endpoints Details

### Specific Weekly Schedule

#### Endpoint

`GET https://neuro.appstun.net/api/v2/schedule`

#### Description

Get a weekly schedule from the database for a given week and year.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

| Parameter | Type    | Required | Description                                     |
| --------- | ------- | -------- | ----------------------------------------------- |
| `week`    | integer | Yes      | Calendar week number (1-53)                     |
| `year`    | integer | No       | Year (defaults to current year if not provided) |

> [!NOTE]
> The oldest weekly schedule is week 11 2023. (it's also the oldest schedule in the schedule channel on the Neurosama Discord server)

#### Request Examples

```http
GET https://neuro.appstun.net/api/v2/schedule?week=25&year=2024
Authorization: Bearer YOUR_API_TOKEN

GET https://neuro.appstun.net/api/v2/schedule?week=25
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "year": 2024,
    "week": 25,
    "schedule": [
      {
        "day": 0,
        "time": 1719475200000,
        "message": "Neuro-sama Stream",
        "type": "normal"
      }
    ],
    "status": "confirmed",
    "imageUrl": "https://orqd3anhk8.ufs.sh/f/bmdmWPQm3hYTnCxdeYWWFYQZEmD9yiJ1NU8PwMe2B7oGjuLO"
  }
}
```

### Latest Weekly Schedule

#### Endpoint

`GET https://neuro.appstun.net/api/v2/schedule/latest`

#### Description

Get the most recent weekly schedule available in the database. Also indicates whether there is an active subathon running.

#### Authentication

**Not required** - This is a public endpoint.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v2/schedule/latest
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "year": 2025,
    "week": 42,
    "schedule": [
      { "day": 2, "time": 1760464800000, "message": "Neuro Stream", "type": "normal" }
    ],
    "status": "confirmed",
    "imageUrl": "https://orqd3anhk8.ufs.sh/f/bmdmWPQm3hYTFClut4aKTq0eL82y73cDPkUrwznbpau9fiCI",
    "hasActiveSubathon": false
  }
}
```

### Schedule Image

#### Endpoint

`GET https://neuro.appstun.net/api/v2/schedule/image`

#### Description

Redirects to the currently active image URL for a given schedule week. This endpoint is intended for image consumers such as `<img>` elements and embeds.

#### Authentication

**Not required** - This is a public endpoint.

#### Parameters

| Parameter | Type    | Required | Description                                     |
| --------- | ------- | -------- | ----------------------------------------------- |
| `week`    | integer | Yes      | Calendar week number (1-53)                     |
| `year`    | integer | No       | Year (defaults to current year if not provided) |

#### Request Example

```http
GET https://neuro.appstun.net/api/v2/schedule/image?week=25&year=2024
```

#### Responses

- `302 Found`: Redirects to the current image URL for the requested week.
- `404 Not Found`: No image is available for the requested week.
- `400 Bad Request`: The query parameters are missing or invalid.

> [!NOTE]
> The direct `imageUrl` can change. Use this endpoint when you always need the currently active URL: its address stays the same for a week while its redirect target is resolved on every request. The endpoint itself is intentionally not returned as the `imageUrl` value in schedule responses.

### Search Weekly Schedules

#### Endpoint

`GET https://neuro.appstun.net/api/v2/schedule/search`

#### Description

Searches schedule messages (for example: "karaoke", "offline", or game names) and returns matching weeks.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

| Parameter    | Type    | Required | Description                                                                          |
| ------------ | ------- | -------- | ------------------------------------------------------------------------------------ |
| `query`      | string  | Yes      | Search text. Minimum length is 3 characters.                                         |
| `year`       | integer | No       | Filter results to one year (must be `>= 2023`).                                      |
| `limit`      | integer | No       | Number of results per page (`1-100`, effective max currently `25`). Default is `25`. |
| `sort`       | string  | No       | Sort order by `year/week`: `asc` or `desc` (default: `desc`).                        |
| `type`       | string  | No       | Filter by schedule day type: `normal`, `offline`, `canceled`, `TBD`, `unknown`.      |
| `cursorYear` | integer | No       | Cursor year from previous response `nextCursor.year` (`>= 2023`, not in the future, and used with week). |
| `cursorWeek` | integer | No       | Cursor week from previous response `nextCursor.week` (must be used with year).       |

> [!NOTE]
> This endpoint uses two limiters: `6 requests / minute` and `2 requests / 10 seconds` per authenticated Twitch account.

#### Request Examples

```http
GET https://neuro.appstun.net/api/v2/schedule/search?query=karaoke&limit=5&sort=desc
Authorization: Bearer YOUR_API_TOKEN

GET https://neuro.appstun.net/api/v2/schedule/search?query=stream&type=normal&limit=10
Authorization: Bearer YOUR_API_TOKEN

GET https://neuro.appstun.net/api/v2/schedule/search?query=karaoke&limit=5&sort=desc&cursorYear=2026&cursorWeek=9
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "nextCursor": {
      "year": 2026,
      "week": 8
    },
    "results": [
      {
        "foundDays": [1, 4],
        "data": {
          "year": 2026,
          "week": 9,
          "schedule": [
            {
              "day": 1,
              "time": 1772294400000,
              "message": "Neuro Karaoke",
              "type": "normal"
            }
          ],
          "status": "confirmed",
          "imageUrl": "https://orqd3anhk8.ufs.sh/f/bmdmWPQm3hYTEWiE7FoIH31bXmfDn0hwFuzeOyrE9d8Vqi45"
        }
      }
    ]
  }
}
```

##### Success Response (200, Last Page)

```json
{
  "data": {
    "nextCursor": null,
    "results": [
      {
        "foundDays": [2],
        "data": {
          "year": 2024,
          "week": 43,
          "schedule": [
            {
              "day": 2,
              "time": 1729641600000,
              "message": "Karaoke stream",
              "type": "normal"
            }
          ],
          "status": "confirmed",
          "imageUrl": null
        }
      }
    ]
  }
}
```

### Devstream Times

#### Endpoint

`GET https://neuro.appstun.net/api/v2/devstream/times`

#### Description

Returns the timestamps where a devstream happened.

#### Authentication

**Not required** – This is a public endpoint.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v2/devstream/times
```

#### Response Format

##### Success Response (200)

```json
{
  "data": [1723680000000, 1723939200000, 1724198400000]
}
```

### Schedule Weeks Index

#### Endpoint

`GET https://neuro.appstun.net/api/v2/schedule/weeks`

#### Description

Returns available schedule week numbers grouped by year.

#### Authentication

**Not required** - This is a public endpoint.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v2/schedule/weeks
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "2023": [11, 12, 13, 14],
    "2024": [1, 2, 3, 4, 5],
    "2025": [38, 39, 40, 41, 42]
  }
}
```

#### Schedule Entry Properties

| Property  | Type   | Description                                                      | Always included |
| --------- | ------ | ---------------------------------------------------------------- | --------------- |
| `day`     | number | Day of the week (0-6, Sunday-Saturday)                           | Yes             |
| `time`    | number | Unix timestamp in milliseconds                                   | Yes             |
| `message` | string | Schedule message/description                                     | Yes             |
| `type`    | string | Schedule type: "normal", "offline", "canceled", "TBD", "unknown" | Yes             |

#### Response Properties

| Property            | Type             | Description                                                      | Always included   |
| ------------------- | ---------------- | ---------------------------------------------------------------- | ----------------- |
| `year`              | number           | Year of the schedule                                             | Yes               |
| `week`              | number           | Calendar week number (1-53)                                      | Yes               |
| `schedule`          | array            | Array of schedule entries (see above)                            | Yes               |
| `status`            | string           | Schedule status: `auto_twitch`, `auto_discord`, or `confirmed`   | Yes               |
| `imageUrl`          | string or `null` | Current weekly schedule image URL, or `null` if none is available | Yes               |
| `hasActiveSubathon` | boolean          | Whether there is an active subathon running                      | Only on `/latest` |

#### Schedule Status Values

| Value          | Meaning                                                   | Considered final? |
| -------------- | --------------------------------------------------------- | ----------------- |
| `confirmed`    | Manually confirmed as final (for example via JSON import) | Yes               |
| `auto_discord` | Auto-collected from the official Discord schedule channel | No                |
| `auto_twitch`  | Auto-collected or fetched from Twitch (may be incomplete) | No                |

> [!NOTE]
> `confirmed` is the only final status. `auto_discord` can replace an `auto_twitch` schedule, but not a `confirmed` one. `auto_twitch` only overwrites an existing `auto_twitch` schedule (or fills an empty week).

> [!TIP]
> To always display the current image, use the public [Schedule Image](#schedule-image) redirect endpoint. It resolves the latest `imageUrl` for that week on every request.

## Error Responses

### Invalid Query Parameters (400)

```json
{
  "error": {
    "code": "AP4",
    "message": "Invalid query parameters",
    "timestamp": 1717516800000,
    "path": "/api/v2/schedule"
  }
}
```

### No Schedule Found (404)

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

### Authentication Required (401)

```json
{
  "error": {
    "code": "AU9",
    "message": "Missing or invalid authorization header. Use: Authorization: Bearer YOUR_TOKEN",
    "timestamp": 1717516800000,
    "path": "/api/v2/schedule"
  }
}
```

### Invalid Token (401)

```json
{
  "error": {
    "code": "AU11",
    "message": "Invalid or expired API token",
    "timestamp": 1717516800000,
    "path": "/api/v2/schedule"
  }
}
```

### Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RL4",
    "message": "Rate limit exceeded: Maximum 100 requests per minute",
    "timestamp": 1717516800000,
    "path": "/api/v2/schedule"
  }
}
```

### Search Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RL7",
    "message": "Rate limit exceeded: Maximum 2 requests per 10 seconds",
    "timestamp": 1717516800000,
    "path": "/api/v2/schedule/search"
  }
}
```

### Search Minute Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RL8",
    "message": "Rate limit exceeded: Maximum 6 requests per minute",
    "timestamp": 1717516800000,
    "path": "/api/v2/schedule/search"
  }
}
```

## Other Notes

- The API uses calendar week numbers (ISO 8601)
- Specific week requests require authentication and use standard rate limiting
- Latest schedule endpoint is public with the default anonymous v2 rate limit
- Search endpoint requires authentication and uses `6/min` + `2/10s` rate limits
- If only `week` is provided without `year`, the current year is used
- Valid years range from 2023 to the current year
- Specific week responses use `Cache-Control: private, max-age=300` (5 minutes)
- Latest schedule is cached for 1 minute
- Search responses use `Cache-Control: private, max-age=60` (1 minute)
- `/schedule/weeks` is public and returns available week numbers grouped by year
- Schedule records use a one-hour sliding server-side cache; updates made through the server invalidate the affected cache entries
- Messages of schedule day can include Discord markdowns
