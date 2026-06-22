**⤴️ Back to the [README](README.md)**

# Subathon API Documentation

## Endpoints

> [!IMPORTANT]
> It's possible that the subcount doesn't match the subcount on stream. <br>
> Also it may be that achieved goals are not directly set to completed (`{ [...], completed: true }`) in the database, as these are set manually.

### Current Subathon

`GET https://neuro.appstun.net/api/v2/subathon`

### Subathon Years

`GET https://neuro.appstun.net/api/v2/subathon/years`

### Subathon Data (Specific Year)

`GET https://neuro.appstun.net/api/v2/subathon`

## Description

Access subathon data and goal information. The current subathon endpoint is publicly available with generous rate limiting, the years endpoint returns year-to-name mappings, and specific year data requires authentication.

## Endpoints Details

### Current Subathon

#### Endpoint

`GET https://neuro.appstun.net/api/v2/subathon`

#### Description

Get all currently active subathons, sorted by year (newest first), including goals and subscriber counts.

#### Authentication

**Not required** - This is a public endpoint.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v2/subathon
```

#### Response Format

##### Success Response (200)

```json
{
  "data": [
    {
      "year": 2025,
      "name": "Neuro-sama Subathon 3",
      "subcount": 132450,
      "goals": {
        "1000": { "name": "Goal A", "completed": true, "reached": true },
        "100000": { "name": "Goal B", "completed": false, "reached": true }
      },
      "subcountMilestones": {
        "1000": { "timestamp": 1767068070351 },
        "2000": { "timestamp": 1767069090452 }
      },
      "isActive": true,
      "startTimestamp": 1764500000000,
      "endTimestamp": null
    }
  ]
}
```

### Subathon Years

#### Endpoint

`GET https://neuro.appstun.net/api/v2/subathon/years`

#### Description

Get all years where a subathon took place, mapped to their name.

#### Authentication

**Not required** - This is a public endpoint.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v2/subathon/years
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "2023": "Neuro-sama Subathon",
    "2024": "Neuro-sama Subathon 2",
    "2025": "Neuro-sama Subathon 3"
  }
}
```

### Subathon Data (Specific Year)

#### Endpoint

`GET https://neuro.appstun.net/api/v2/subathon`

#### Description

Get subathon data for a specific year.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

| Parameter | Type    | Required | Description                      |
| --------- | ------- | -------- | -------------------------------- |
| `year`    | integer | Yes      | Year of the subathon (e.g. 2025) |

> [!NOTE]
> Year cannot be greater than the current year and must be a valid year when a subathon occurred.

#### Request Example

```http
GET https://neuro.appstun.net/api/v2/subathon?year=2025
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "year": 2023,
    "name": "Neuro-sama Subathon",
    "subcount": 41224,
    "goals": {
      "9000": { "name": "Swap models with Neuro", "completed": true, "reached": true },
      "20000": { "name": "Neuro original song", "completed": true, "reached": true }
    },
    "subcountMilestones": {
      "41000": { "timestamp": 1703123456789 }
    },
    "isActive": false,
    "startTimestamp": 1703012400000,
    "endTimestamp": null
  }
}
```

#### Subathon Properties

| Property         | Type    | Description                                          | Always included |
| ---------------- | ------- | ---------------------------------------------------- | --------------- |
| `year`           | number  | Year of the subathon                                 | Yes             |
| `name`           | string  | Name of the subathon                                 | Yes             |
| `subcount`       | number  | Current subscriber count                             | Yes             |
| `goals`          | object  | Dictionary of goals with subscriber thresholds       | Yes             |
| `subcountMilestones` | object  | Subscriber milestones (every 1000 subs) with timestamps | No           |
| `isActive`       | boolean | Whether the subathon is currently active and running | Yes             |
| `startTimestamp` | number  | Start of subathon in milliseconds                    | Should          |
| `endTimestamp`   | number  | End of subathon in milliseconds                      | No              |

#### Goal Properties

| Property    | Type    | Description                         | Always included |
| ----------- | ------- | ----------------------------------- | --------------- |
| `reached`   | boolean | Whether the goal has been reached   | Yes             |
| `completed` | boolean | Whether the goal has been completed | Yes             |

#### Subcount Milestone Properties

`subcountMilestones` keys are subscriber counts (every 1000 subs). Values contain the Unix timestamp (ms) when that milestone was first reached.

| Property    | Type   | Description                              |
| ----------- | ------ | ---------------------------------------- |
| `timestamp` | number | Unix timestamp in milliseconds           |

## Error Responses

### No Active Subathon (404)

```json
{
  "error": {
    "code": "SB1",
    "message": "No active subathon found",
    "timestamp": 1717516800000,
    "path": "/api/v2/subathon"
  }
}
```

### Invalid Query Parameters (400)

```json
{
  "error": {
    "code": "AP4",
    "message": "Invalid query parameters",
    "timestamp": 1717516800000,
    "path": "/api/v2/subathon"
  }
}
```

### No Subathon Found (404)

```json
{
  "error": {
    "code": "SB4",
    "message": "No subathon found for the specified year",
    "timestamp": 1717516800000,
    "path": "/api/v2/subathon"
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
    "path": "/api/v2/subathon"
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
    "path": "/api/v2/subathon"
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
    "path": "/api/v2/subathon"
  }
}
```

## Other Notes

- Current subathon endpoint is public with the default anonymous v2 rate limit
- Specific year data requires authentication with standard rate limiting
- `/subathon/years` always returns `{ "year": "subathon name" }`
- Goals are automatically marked as `reached: true` if the current subscriber count meets or exceeds the goal threshold
- Subathon data is cached and refreshed periodically
- Multiple active subathons can exist; `/subathon` without `year` returns an array sorted by year (descending)
- Goal thresholds are defined as integer subscriber counts in the goals object keys
- `subcountMilestones` are recorded automatically every 1000 subscribers during an active subathon

