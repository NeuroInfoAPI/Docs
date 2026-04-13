**⤴️ Back to the [README](README.md)**

# Subathon API Documentation

## Endpoints

> [!IMPORTANT]
> It's possible that the subcount doesn't match the subcount on stream. <br>
> Also it may be that achieved goals are not directly set to completed (`{ [...], completed: true }`) in the database, as these are set manually.

### Current Subathon

`GET https://neuro.appstun.net/api/v1/subathon/current`

### Subathon Years

`GET https://neuro.appstun.net/api/v1/subathon/years`

### Subathon Data (Specific Year)

`GET https://neuro.appstun.net/api/v1/subathon`

## Description

Access subathon data and goal information. The current subathon endpoint is publicly available with generous rate limiting, the years endpoint can also return names in detailed mode, and specific year data requires authentication.

## Endpoints Details

### Current Subathon

#### Endpoint

`GET https://neuro.appstun.net/api/v1/subathon/current`

#### Description

Get all currently active subathons, sorted by year (newest first), including goals and subscriber counts.

#### Authentication

**Not required** - This is a public endpoint.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v1/subathon/current
```

#### Response Format

##### Success Response (200)

```json
[
  {
    "year": 2025,
    "name": "Neuro-sama Subathon 3",
    "subcount": 132450,
    "goals": {
      "1000": { "name": "Goal A", "completed": true, "reached": true },
      "100000": { "name": "Goal B", "completed": false, "reached": true }
    },
    "isActive": true,
    "startTimestamp": 1764500000000,
    "endTimestamp": null
  }
]
```

### Subathon Years

#### Endpoint

`GET https://neuro.appstun.net/api/v1/subathon/years`

#### Description

Get all years where a subathon took place. Use `?detailed` to include the subathon name for each year.

#### Authentication

**Not required** - This is a public endpoint.

#### Parameters

| Parameter  | Type    | Required | Description                                                    |
| ---------- | ------- | -------- | -------------------------------------------------------------- |
| `detailed` | boolean | No       | If present, returns an object mapping `year -> subathon name`. |

#### Request Examples

```http
GET https://neuro.appstun.net/api/v1/subathon/years

GET https://neuro.appstun.net/api/v1/subathon/years?detailed
```

#### Response Format

##### Success Response (200)

```json
[2023, 2024, 2025]
```

##### Success Response (200, Detailed)

```json
{
  "2023": "Neuro-sama Subathon",
  "2024": "Neuro-sama Subathon 2",
  "2025": "Neuro-sama Subathon 3"
}
```

### Subathon Data (Specific Year)

#### Endpoint

`GET https://neuro.appstun.net/api/v1/subathon`

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
GET https://neuro.appstun.net/api/v1/subathon?year=2025
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "year": 2023,
  "name": "Neuro-sama Subathon",
  "subcount": 41224,
  "goals": {
    "9000": { "name": "Swap models with Neuro", "completed": true, "reached": true },
    "20000": { "name": "Neuro original song", "completed": true, "reached": true }
  },
  "isActive": false,
  "startTimestamp": 1703012400000,
  "endTimestamp": null
}
```

#### Subathon Properties

| Property         | Type    | Description                                          | Always included |
| ---------------- | ------- | ---------------------------------------------------- | --------------- |
| `year`           | number  | Year of the subathon                                 | Yes             |
| `name`           | string  | Name of the subathon                                 | Yes             |
| `subcount`       | number  | Current subscriber count                             | Yes             |
| `goals`          | object  | Dictionary of goals with subscriber thresholds       | Yes             |
| `isActive`       | boolean | Whether the subathon is currently active and running | Yes             |
| `startTimestamp` | number  | Start of subathon in milliseconds                    | Should          |
| `endTimestamp`   | number  | End of subathon in milliseconds                      | No              |

#### Goal Properties

| Property    | Type    | Description                         | Always included |
| ----------- | ------- | ----------------------------------- | --------------- |
| `reached`   | boolean | Whether the goal has been reached   | Yes             |
| `completed` | boolean | Whether the goal has been completed | Yes             |

## Error Responses

### No Active Subathon (404)

```json
{
  "error": {
    "code": "SB1",
    "message": "No active subathon found"
  }
}
```

### Missing Parameters (400)

```json
{
  "error": {
    "code": "SB2",
    "message": "Year parameter is required"
  }
}
```

### Invalid Parameters (400)

```json
{
  "error": {
    "code": "SB3",
    "message": "Invalid year parameter or year cannot be in the future"
  }
}
```

### No Subathon Found (404)

```json
{
  "error": {
    "code": "SB4",
    "message": "No subathon found for the specified year"
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

### Invalid Token (401)

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

## Other Notes

- Current subathon endpoint is public with generous rate limiting
- Specific year data requires authentication with standard rate limiting
- `/subathon/years` supports `?detailed` to return `{ "year": "subathon name" }`
- Goals are automatically marked as `reached: true` if the current subscriber count meets or exceeds the goal threshold
- Subathon data is cached and refreshed periodically
- Multiple active subathons can exist; `/current` returns an array sorted by year (descending)
- Goal thresholds are defined as integer subscriber counts in the goals object keys
