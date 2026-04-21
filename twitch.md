**⤴️ Back to the [README](README.md)**

# Twitch API Documentation

## Endpoints

> [!NOTE]
> Video on Demand (VOD) and stream informations are fetched straight from the Twitch API but is stored in a cache. <br>
> The stream info updates every 30 seconds and the VOD list in the database every 2 hours.

### Current Stream Status

`GET https://neuro.appstun.net/api/v1/twitch/stream`

### All VODs

`GET https://neuro.appstun.net/api/v1/twitch/vods`

### Specific VOD

`GET https://neuro.appstun.net/api/v1/twitch/vod`

## Description

Access Twitch stream data and VOD information. Stream data is publicly available, while VOD endpoints require authentication.

## Endpoints Details

### Current Stream Status

#### Endpoint

`GET https://neuro.appstun.net/api/v1/twitch/stream`

#### Description

Get current Twitch stream information. This is a public endpoint with generous rate limiting.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v1/twitch/stream
```

#### Response Format

##### Success Response (200)

```json
{
  "isLive": true,
	"id": "331913732989",
	"title": "NEUROSLOP EVIL WASN'T BASED ENOUGH TO DO IT",
	"game": {
		"id": "509658",
		"name": "Just Chatting"
	},
	"language": "en",
	"tags": [
		"English",
		"Programming",
		"Chatting",
		"Singing",
		"Vtuber"
	],
	"isMature": false,
	"viewerCount": 5799,
	"startedAt": 1273638393734,
	"thumbnailUrl": "https://static-cdn.jtvnw.net/previews-ttv/live_user_vedal987-{width}x{height}.jpg",
}
```

### All VODs

#### Endpoint

`GET https://neuro.appstun.net/api/v1/twitch/vods`

#### Description

Get all cached VODs from the database.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v1/twitch/vods
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
[
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
  },
  {
    "id": "2534657392",
    "streamId": "324276445817",
    "title": "OUTER WILDS w/ VEDAL AND NEURO",
    "url": "https://www.twitch.tv/videos/2534657392",
    "viewable": "public",
    "type": "archive",
    "language": "en",
    "duration": "4h27m10s",
    "viewCount": 112395,
    "createdAt": 1754676005000,
    "publishedAt": 1754676005000,
    "thumbnailUrl": "https://static-cdn.jtvnw.net/cf_vods/d3fi1amfgojobc/5f171bfa046b419abede_vedal987_324276445817_1754675999//thumb/thumb0-%{width}x%{height}.jpg"
  }
]
```

### Specific VOD

#### Endpoint

`GET https://neuro.appstun.net/api/v1/twitch/vod`

#### Description

Get a specific VOD by stream ID.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

| Parameter  | Type   | Required | Description                |
| ---------- | ------ | -------- | -------------------------- |
| `streamId` | string | Yes      | Twitch stream (not VOD ID) |

#### Request Examples

```http
GET https://neuro.appstun.net/api/v1/twitch/vod?streamId=123456789
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
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
```

## Error Responses

### No VODs Found (404)

```json
{
  "error": {
    "code": "VD2",
    "message": "No vods found in the database."
  }
}
```

### No Specific VOD Found (404)

```json
{
  "error": {
    "code": "VD1",
    "message": "No vod found with the given stream id."
  }
}
```

### Missing streamId Parameter (400)

```json
{
  "error": {
    "code": "VD1",
    "message": "No vod found with the given stream id."
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

- Stream data is cached for 30 seconds
- VOD data is cached for 15 minutes (all VODs) to 1 hour (specific VOD)
- All Twitch endpoints have rate limiting applied, VOD endpoints require valid API authentication
