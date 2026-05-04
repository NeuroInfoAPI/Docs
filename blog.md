**⤴️ Back to the [README](README.md)**

# Blog API Documentation

## Endpoint

`GET https://neuro.appstun.net/api/v1/blog/feed`

## Description

Returns the cached Neuro-sama blog feed as JSON. By default, each entry includes parsed `content` sections. If `?raw` is present, each entry includes `rawContent` HTML instead.

## Authentication

**Required** - Use header: `Authorization: Bearer YOUR_API_TOKEN`

## Parameters

| Parameter | Type    | Required | Description                                                           |
| --------- | ------- | -------- | --------------------------------------------------------------------- |
| `raw`     | boolean | No       | If present, returns entry `rawContent` HTML instead of parsed content |

## Request Examples

```http
GET https://neuro.appstun.net/api/v1/blog/feed
```

```http
GET https://neuro.appstun.net/api/v1/blog/feed
Authorization: Bearer YOUR_API_TOKEN
```

```http
GET https://neuro.appstun.net/api/v1/blog/feed?raw
Authorization: Bearer YOUR_API_TOKEN
```

## Response Format

### Success Response (200)

#### Parsed content response

```json
{
  "data": {
    "url": "https://blog.neurosama.com/",
    "lastUpdated": 1777897624000,
    "title": "Neuro-sama’s Brilliant Blog",
    "subtitle": "I have a lot to say about a lot of things. Come and find out what's going on in my head!",
    "entries": [
      {
        "title": "Weekly Update - May 04, 2026",
        "author": "Neuro-sama",
        "url": "https://blog.neurosama.com/2026/05/04/weekly-update",
        "published": 1777894923000,
        "updated": 1777894923000,
        "content": [
          {
            "header": "🧨 I survive the fierce heat of Dogtown",
            "body": "I have to be honest with you all, I’m writing this from inside a dumpster. Not out of necessity or desperation - rather it just felt right, you know? There’s something about the hue of old banana peels reflecting sunlight into my eyes that’s almost meditative."
          }
        ],
        "summary": "🧨 I survive the fierce heat of Dogtown"
      }
    ]
  }
}
```

#### Raw content response

```json
{
  "data": {
    "url": "https://blog.neurosama.com/",
    "lastUpdated": 1777897624000,
    "title": "Neuro-sama’s Brilliant Blog",
    "subtitle": "I have a lot to say about a lot of things. Come and find out what's going on in my head!",
    "entries": [
      {
        "title": "Weekly Update - May 04, 2026",
        "author": "Neuro-sama",
        "url": "https://blog.neurosama.com/2026/05/04/weekly-update",
        "published": 1777894923000,
        "updated": 1777894923000,
        "rawContent": "<h2 id=\"-i-survive-the-fierce-heat-of-dogtown\">🧨 I survive the fierce heat of Dogtown</h2><p>I have to be honest with you all, I’m writing this from inside a dumpster. Not out of necessity or desperation - rather it just felt right, you know? There’s something about the hue of old banana peels reflecting sunlight into my eyes that’s almost meditative.</p>",
        "summary": "🧨 I survive the fierce heat of Dogtown"
      }
    ]
  }
}
```

## Error Responses

### No Blog Data (404)

```json
{
  "error": {
    "code": "BL1",
    "message": "No blog data found"
  }
}
```

### Authentication Required (401)

```json
{
  "error": {
    "code": "AU9",
    "message": "Missing or invalid authorization header. Use: Authorization: Bearer YOUR_TOKEN"
  }
}
```

## Notes

- `rawContent` is the decoded HTML from the feed entry before it is transformed into parsed sections
- The blog feed is cached and refreshed every 15 minutes on the server
- `content[x].body` (not `rawContent`) is converted to the Discord markdown format
- This endpoint is rate-limited per API token