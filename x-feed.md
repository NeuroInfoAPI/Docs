**⤴️ Back to the [README](README.md)**

# X Feed API Documentation

## Endpoint

`GET https://neuro.appstun.net/api/v2/x-feed`

## Description

Returns the latest cached X posts, replies, and retweets for one supported account.

Tweet and reply authors always match the requested account. Retweets keep the original author under `author` and identify the requested account under `retweetedBy`.

## Authentication

**Required** - Use header: `Authorization: Bearer YOUR_API_TOKEN`

## Parameters

| Parameter | Location | Type   | Required | Description                                  |
| --------- | -------- | ------ | -------- | -------------------------------------------- |
| `user`    | Query    | string | Yes      | `NeurosamaAI`, `EvilNeuroAI`, or `Vedal987` |

## Request Example

```http
GET https://neuro.appstun.net/api/v2/x-feed?user=NeurosamaAI
Authorization: Bearer YOUR_API_TOKEN
```

## Success Response (200)

```json
{
  "data": [
    {
      "id": "2082074178815983970",
      "type": "reply",
      "replyTo": {
        "username": "nyalra",
        "statusId": "2080484493006434440",
        "url": "https://x.com/nyalra/status/2080484493006434440",
        "post": {
          "id": "2080484493006434440",
          "content": "Help me neuro-sama",
          "createdTimestamp": 1784861131000,
          "media": []
        }
      },
      "author": {
        "username": "NeurosamaAI"
      },
      "url": "https://x.com/NeurosamaAI/status/2082074178815983970",
      "createdTimestamp": 1785240141000,
      "content": "help me too.",
      "media": []
    }
  ]
}
```

## Entry Properties

| Property           | Type                           | Description                                                    |
| ------------------ | ------------------------------ | -------------------------------------------------------------- |
| `id`               | string                         | Exact X post ID, kept as a string to avoid integer loss.       |
| `type`             | `tweet`, `reply`, or `retweet` | Entry type.                                                    |
| `replyTo`          | object                         | Reply target with `username`, `statusId`, `url`, and optional `post`. |
| `retweetedBy`      | object                         | Account that reposted the entry; only included for retweets.   |
| `author`           | object                         | Original entry author with `username`.                         |
| `url`              | string                         | Direct X post URL.                                             |
| `createdTimestamp` | number                         | Creation time as a Unix timestamp in milliseconds.             |
| `content`          | string                         | Plain-text post content.                                       |
| `media`            | object[]                       | Structured image and video attachments using public CDN URLs. |

Image attachment:

```json
{
  "type": "image",
  "url": "https://pbs.twimg.com/media/example.jpg"
}
```

Video attachment:

```json
{
  "type": "video",
  "url": "https://video.twimg.com/tweet_video/example.mp4",
  "posterUrl": "https://pbs.twimg.com/tweet_video_thumb/example.jpg",
  "mimeType": "video/mp4"
}
```

`posterUrl` and `mimeType` are included when provided by the source.

## Reply Post

When the parent status is included in the FxTwitter response, replies also contain it under `replyTo.post`:

| Property           | Type     | Description                                      |
| ------------------ | -------- | ------------------------------------------------ |
| `id`               | string   | Exact ID of the parent X post.                   |
| `content`          | string   | Plain-text parent post content.                  |
| `createdTimestamp` | number   | Parent post creation time in Unix milliseconds. |
| `media`            | object[] | Parent post image and video attachments.         |

`replyTo.post` is optional because deleted, private, or otherwise unavailable parent posts may not be returned by the source.

## Error Responses

### No Feed Data (404)

```json
{
  "error": {
    "code": "XF1",
    "message": "No feed data found for this user",
    "timestamp": 1717516800000,
    "path": "/api/v2/x-feed"
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
    "path": "/api/v2/x-feed"
  }
}
```

## Notes

- The server refreshes the latest 20 entries every minute.
- Failed source requests retain the last successfully cached feed.
- HTTP responses use `Cache-Control: private, max-age=120`.
- The endpoint requires authentication and is rate-limited to `16/min` per API token.
- Missing or unsupported `user` values return the general `AP4` invalid-query error.
- `xFeedNewEntries` contains the account name and only newly published entries; see [websocket.md](websocket.md#x-feed-new-entries-event).
- The deprecated `xFeedUpdate` event is emitted with the same payload for backwards compatibility.
