**⤴️ Back to the [README](README.md)**

# Schedule API Documentation

## Endpoints

> [!IMPORTANT]
> "Latest" updates only on new official releases; otherwise it returns the last published schedule.

### Specific Weekly Schedule

`GET https://neuro.appstun.net/api/v1/schedule`

### Latest Weekly Schedule

`GET https://neuro.appstun.net/api/v1/schedule/latest`

### Search Weekly Schedules

`GET https://neuro.appstun.net/api/v1/schedule/search`

### Devstream Times

`GET https://neuro.appstun.net/api/v1/schedule/devstreamtimes`

### Schedule Weeks Index

`GET https://neuro.appstun.net/api/v1/schedule/weeks`

## Description

Access weekly schedule data from the database. Use the specific-week endpoint for exact calendar weeks, the latest endpoint for the most recent published schedule, the search endpoint for message-based lookups with cursor pagination, the weeks endpoint to list available weeks per year, and the devstream endpoint for historical devstream timestamps.

## Endpoints Details

### Specific Weekly Schedule

#### Endpoint

`GET https://neuro.appstun.net/api/v1/schedule`

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
GET https://neuro.appstun.net/api/v1/schedule?week=25&year=2024
Authorization: Bearer YOUR_API_TOKEN

GET https://neuro.appstun.net/api/v1/schedule?week=25
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "year": 2024,
  "week": 25,
  "schedule": [
    {
      "day": 0,
      "time": 1719475200000,
      "message": "Neuro-sama Stream",
      "type": "normal"
    },
    {
      "day": 1,
      "time": 1719561600000,
      "message": "Evil-sama Stream",
      "type": "normal"
    },
    {
      "day": 2,
      "time": 1719648000000,
      "message": "Offline Day",
      "type": "offline"
    },
    {
      "day": 3,
      "time": 1719734400000,
      "message": "TBD Stream",
      "type": "TBD"
    }
  ],
  "isFinal": true
}
```

### Latest Weekly Schedule

#### Endpoint

`GET https://neuro.appstun.net/api/v1/schedule/latest`

#### Description

Get the most recent weekly schedule available in the database. Also indicates whether there is an active subathon running.

#### Authentication

**Not required** - This is a public endpoint.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v1/schedule/latest
```

#### Response Format

##### Success Response (200)

```json
{
  "year": 2025,
  "week": 42,
  "schedule": [
    { "day": 2, "time": 1760464800000, "message": "Neuro Stream", "type": "normal" },
    { "day": 3, "time": 1760551200000, "message": "Neuro Karaoke", "type": "canceled" },
    { "day": 4, "time": 1760637600000, "message": "Evil Stream", "type": "normal" },
    { "day": 5, "time": 1760724000000, "message": "Neuro Fishing 2", "type": "TBD" },
    { "day": 6, "time": 1760810400000, "message": "Offline", "type": "offline" },
    { "day": 0, "time": 1760896800000, "message": "Offline", "type": "offline" },
    { "day": 1, "time": 1760983200000, "message": "Offline", "type": "offline" }
  ],
  "isFinal": true,
  "hasActiveSubathon": false
}
```

### Search Weekly Schedules

#### Endpoint

`GET https://neuro.appstun.net/api/v1/schedule/search`

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
| `cursorYear` | integer | No       | Cursor year from previous response `nextCursor.year` (must be used with week).       |
| `cursorWeek` | integer | No       | Cursor week from previous response `nextCursor.week` (must be used with year).       |

> [!NOTE]
> This endpoint uses two limiters: `6 requests / minute` and `2 requests / 10 seconds` per token.

#### Request Examples

```http
GET https://neuro.appstun.net/api/v1/schedule/search?query=karaoke&limit=5&sort=desc
Authorization: Bearer YOUR_API_TOKEN

GET https://neuro.appstun.net/api/v1/schedule/search?query=stream&type=normal&limit=10
Authorization: Bearer YOUR_API_TOKEN

GET https://neuro.appstun.net/api/v1/schedule/search?query=karaoke&limit=5&sort=desc&cursorYear=2026&cursorWeek=9
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
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
        "isFinal": true
      }
    }
  ]
}
```

##### Success Response (200, Last Page)

```json
{
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
        "isFinal": true
      }
    }
  ]
}
```

### Devstream Times

#### Endpoint

`GET https://neuro.appstun.net/api/v1/schedule/devstreamtimes`

#### Description

Returns the timestamps where a devstream happened.

#### Authentication

**Not required** – This is a public endpoint.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v1/schedule/devstreamtimes
```

#### Response Format

##### Success Response (200)

```json
[1723680000000, 1723939200000, 1724198400000]
```

### Schedule Weeks Index

#### Endpoint

`GET https://neuro.appstun.net/api/v1/schedule/weeks`

#### Description

Returns available schedule week numbers grouped by year.

#### Authentication

**Not required** - This is a public endpoint.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v1/schedule/weeks
```

#### Response Format

##### Success Response (200)

```json
{
  "2023": [11, 12, 13, 14],
  "2024": [1, 2, 3, 4, 5],
  "2025": [38, 39, 40, 41, 42]
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

| Property            | Type    | Description                                        | Always included   |
| ------------------- | ------- | -------------------------------------------------- | ----------------- |
| `year`              | number  | Year of the schedule                               | Yes               |
| `week`              | number  | Calendar week number (1-53)                        | Yes               |
| `schedule`          | array   | Array of schedule entries (see above)              | Yes               |
| `isFinal`           | boolean | Whether this schedule is considered final/complete | Yes               |
| `hasActiveSubathon` | boolean | Whether there is an active subathon running        | Only on `/latest` |

> [!NOTE]
> Schedule collection & finalization:
>
> - Fetched from Twitch Schedule fetching and a announcements channel\* on the Neuro-sama Discord server.
> - Twitch fetching stops on first detected change and also stops when a announcement gets posted; results may be incomplete.
> - Auto-fetched schedules: `"isFinal": false`. Then after manual confirmation: `"isFinal": true`. <br>

<small>\* The schedules are fetched from a private channel that follows the announcement channel on the Neuro-sama Discord server (messages are forwarded from the latter to the private channel).</small>

## Error Responses

### Invalid Parameters (400)

```json
{
  "error": {
    "code": "SC2",
    "message": "Invalid year or week parameter"
  }
}
```

### Missing Search Query (400)

```json
{
  "error": {
    "code": "SC3",
    "message": "Missing search query parameter"
  }
}
```

### Search Query Too Short (400)

```json
{
  "error": {
    "code": "SC4",
    "message": "Search query must be at least 3 characters long"
  }
}
```

### No Schedule Found (404)

```json
{
  "error": {
    "code": "SC1",
    "message": "No schedule found in the database for the given week & year."
  }
}
```

### Authentication Required (401)

```json
{
  "error": {
    "code": "AU1",
    "message": "Missing or invalid authorization header"
  }
}
```

### Invalid Token (403)

```json
{
  "error": {
    "code": "AU2",
    "message": "Invalid or expired API token"
  }
}
```

### Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RL4",
    "message": "Rate limit exceeded: Maximum 100 requests per minute"
  }
}
```

### Search Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RL7",
    "message": "Rate limit exceeded: Maximum 2 requests per 10 seconds"
  }
}
```

### Search Minute Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RL8",
    "message": "Rate limit exceeded: Maximum 6 requests per minute"
  }
}
```

## Other Notes

- The API uses calendar week numbers (ISO 8601)
- Specific week requests require authentication and use standard rate limiting
- Latest schedule endpoint is public with generous rate limiting
- Search endpoint requires authentication and uses `6/min` + `2/10s` rate limits
- If only `week` is provided without `year`, the current year is used
- Valid years range from 2023 to the current year
- Specific week schedules are cached for 30 minutes
- Latest schedule is cached for 5 minutes
- Search responses are cached for 30 seconds
- `/schedule/weeks` is public and returns available week numbers grouped by year
- Schedule data is globally cached for a minimum of 6 hours, so changed schedules are not immediately available
