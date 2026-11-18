**⤴️ Back to the [README](README.md)**

# Twitch API Documentation

## Endpoints

> [!NOTE]
> Video on Demand (VOD) and stream informations are fetched straight from the Twitch API but is stored in a cache. <br>
> The stream info updates every 10 seconds and the VOD list in the database on every stream end (with delay of 1 minute).

### Current Stream Status

`GET https://neuroinfoapi.dev/api/v2/twitch/stream`

### Schedule-Linked Streams

`GET https://neuroinfoapi.dev/api/v2/twitch/scheduleLinkedStreams`

### All VODs

`GET https://neuroinfoapi.dev/api/v2/twitch/vods`

### Specific VOD

`GET https://neuroinfoapi.dev/api/v2/twitch/vod`

## Description

Access Twitch stream data and VOD information. Stream data is publicly available, while VOD endpoints require authentication.

## Endpoints Details

### Current Stream Status

#### Endpoint

`GET https://neuroinfoapi.dev/api/v2/twitch/stream`

#### Description

Get current Twitch stream information. This is a public endpoint with the default anonymous v2 rate limit.

The response always contains the channel and its current settings. Stream-specific fields are only included while the channel is live.

| Field                                            | Live | Offline | Description                                                                                 |
| ------------------------------------------------ | :--: | :-----: | ------------------------------------------------------------------------------------------- |
| `isLive`                                         |  ✅  |   ✅    | Whether the channel is currently live                                                       |
| `channel`                                        |  ✅  |   ✅    | Main channel identity (see [Channel Object](#channel-object)), or `null`                    |
| `title`, `game`, `language`, `tags`, `isMature`  |  ✅  |   ✅    | Current channel settings, also updated while offline; `null` until fetched for the first time |
| `id`, `viewerCount`, `startedAt`, `thumbnailUrl` |  ✅  |   ❌    | Live stream data; omitted while offline                                                     |

`isMature` is `true` if any content classification labels are set, the same as in channel updates.

##### Channel Object

| Field             | Type             | Description                    |
| ----------------- | ---------------- | ------------------------------ |
| `id`              | `string`         | Twitch user ID                 |
| `name`            | `string`         | Login name                     |
| `displayName`     | `string`         | Display name                   |
| `profileImageUrl` | `string \| null` | Twitch avatar URL, if available |

> [!NOTE]
> `channel` is `null` until the first successful user lookup. User information is refreshed every 5 minutes. If a refresh of the user information or channel settings fails, the last known values are kept.

#### Parameters

None

#### Request Example

```http
GET https://neuroinfoapi.dev/api/v2/twitch/stream
```

#### Response Format

##### Success Response (200, live)

```json
{
  "data": {
    "isLive": true,
    "channel": {
      "id": "123456789",
      "name": "vedal987",
      "displayName": "Vedal987",
      "profileImageUrl": "https://static-cdn.jtvnw.net/jtv_user_pictures/example-profile_image-300x300.png"
    },
    "id": "331913732989",
    "title": "NEUROSLOP EVIL WASN'T BASED ENOUGH TO DO IT",
    "game": { "id": "509658", "name": "Just Chatting" },
    "language": "en",
    "tags": ["English", "Programming", "Chatting", "Singing", "Vtuber"],
    "isMature": false,
    "viewerCount": 5799,
    "startedAt": 1273638393734,
    "thumbnailUrl": "https://static-cdn.jtvnw.net/previews-ttv/live_user_vedal987-{width}x{height}.jpg"
  }
}
```

##### Success Response (200, offline)

```json
{
  "data": {
    "isLive": false,
    "channel": {
      "id": "123456789",
      "name": "vedal987",
      "displayName": "Vedal987",
      "profileImageUrl": "https://static-cdn.jtvnw.net/jtv_user_pictures/example-profile_image-300x300.png"
    },
    "title": "Next stream title",
    "game": { "id": "509658", "name": "Just Chatting" },
    "language": "en",
    "tags": ["English", "Vtuber"],
    "isMature": false
  }
}
```

### Schedule-Linked Streams

#### Endpoint

`GET https://neuroinfoapi.dev/api/v2/twitch/scheduleLinkedStreams`

#### Description

Lists the Twitch channels that are watched right now because a schedule entry links them, either explicitly (`(on [secretneuroaccount](<https://twitch.tv/secretneuroaccount>)) Evil Stream`, `linkType: "on"`) or as a collab partner (`w/ [Filian](<https://twitch.tv/filian>)`, `linkType: "collab"`). A channel is watched from 3 hours before the scheduled time until its stream has ended. This is a public endpoint with the default anonymous v2 rate limit. Changes are sent as `scheduleLinkedStream*` [WebSocket events](websocket.md#schedule-linked-stream-events).

Each entry contains:

| Field           | Description                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `status`        | `live` or `waiting`                                                                                          |
| `channel`       | Identity of the linked channel                                                                               |
| `linkType`      | `on` or `collab`                                                                                             |
| `scheduleEntry` | The schedule entry that links the channel                                                                    |
| `stream`        | Live stream fields from [Current Stream Status](#current-stream-status), or `{ "isLive": false }` while waiting |

The list is empty when no linked entry is near.

#### Parameters

None

#### Request Example

```http
GET https://neuroinfoapi.dev/api/v2/twitch/scheduleLinkedStreams
```

#### Response Format

##### Success Response (200)

```json
{
  "data": [
    {
      "status": "live",
      "channel": { "id": "1234567890", "name": "secretneuroaccount", "displayName": "secretneuroaccount" },
      "linkType": "on",
      "scheduleEntry": {
        "day": 3,
        "time": 1793210400000,
        "message": "(on [secretneuroaccount](<https://twitch.tv/secretneuroaccount>)) Evil Stream",
        "type": "normal"
      },
      "stream": {
        "isLive": true,
        "id": "331913732989",
        "title": "Evil Stream",
        "game": { "id": "509658", "name": "Just Chatting" },
        "language": "en",
        "tags": ["English", "Vtuber"],
        "isMature": false,
        "viewerCount": 5799,
        "startedAt": 1793210412000,
        "thumbnailUrl": "https://static-cdn.jtvnw.net/previews-ttv/live_user_secretneuroaccount-{width}x{height}.jpg"
      }
    }
  ]
}
```

### All VODs

#### Endpoint

`GET https://neuroinfoapi.dev/api/v2/twitch/vods`

#### Description

Get all cached VODs from the database.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

None

#### Request Example

```http
GET https://neuroinfoapi.dev/api/v2/twitch/vods
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "data": [
    {
      "id": "2525705075",
      "streamId": "323888365817",
      "title": "My First Livestream - Neuro-sama",
      "url": "https://www.twitch.tv/videos/2525705075",
      "viewable": "public",
      "type": "archive",
      "language": "en",
      "duration": "2h21m20s",
      "viewCount": 80346,
      "createdAt": 1753812006000,
      "publishedAt": 1753812006000,
      "thumbnailUrl": "https://static-cdn.jtvnw.net/cf_vods/d3fi1amfgojobc/392eb4c5d5a13379e26f_vedal987_323888365817_1753812000//thumb/thumb0-%{width}x%{height}.jpg"
    }
  ]
}
```

### Specific VOD

#### Endpoint

`GET https://neuroinfoapi.dev/api/v2/twitch/vod`

#### Description

Get a specific VOD by stream ID.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

| Parameter | Type   | Required | Description                   |
| --------- | ------ | -------- | ----------------------------- |
| `id`      | string | Yes      | Twitch stream ID (not VOD ID) |

#### Request Example

```http
GET https://neuroinfoapi.dev/api/v2/twitch/vod?id=123456789
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "id": "2540872425",
    "streamId": "331632543357",
    "title": "neuro saves the life of a fellow AI surely #ad #WhispersfromtheStar",
    "url": "https://www.twitch.tv/videos/2540872425",
    "viewable": "public",
    "type": "archive",
    "language": "en",
    "duration": "2h42m10s",
    "viewCount": 80127,
    "createdAt": 1755280804000,
    "publishedAt": 1755280804000,
    "thumbnailUrl": "https://static-cdn.jtvnw.net/cf_vods/d1m7jfoe9zdc1j/9e7139b8218481657297_vedal987_331632543357_1755280798//thumb/thumb0-%{width}x%{height}.jpg"
  }
}
```

## Error Responses

### No VODs Found (404)

```json
{
  "error": {
    "code": "VD2",
    "message": "No vods found in the database.",
    "timestamp": 1717516800000,
    "path": "/api/v2/twitch/vods"
  }
}
```

### No Specific VOD Found (404)

```json
{
  "error": {
    "code": "VD1",
    "message": "No vod found with the given stream id.",
    "timestamp": 1717516800000,
    "path": "/api/v2/twitch/vod"
  }
}
```

### Missing id Parameter (400)

```json
{
  "error": {
    "code": "AP4",
    "message": "Invalid query parameters",
    "timestamp": 1717516800000,
    "path": "/api/v2/twitch/vod"
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
    "path": "/api/v2/twitch/vods"
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
    "path": "/api/v2/twitch/vods"
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
    "path": "/api/v2/twitch/vods"
  }
}
```

## Other Notes

- Stream responses use `Cache-Control: public, max-age=5`; the underlying stream state is normally refreshed every 10 seconds
- VOD data is cached for 15 minutes (all VODs) to 1 hour (specific VOD)
- All Twitch endpoints have rate limiting applied; VOD endpoints require valid API authentication

