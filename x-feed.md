**⤴️ Back to the [README](README.md)**

# X Feed API Documentation


> [!WARNING]
> Due to [legal troubles of Nitter](https://github.com/zedeus/nitter/issues/1442#issuecomment-5413651441), this endpoint may stop working at any time. It is not guaranteed to be maintained or supported. Use at your own risk.

## Endpoint

`GET https://neuro.appstun.net/api/v2/x-feed`

Supported `user` values:

- `NeurosamaAI`
- `EvilNeuroAI`
- `Vedal987`

## Description

Returns cached X posts, replies, and retweets for one supported account. By default, each entry includes plain-text `content`. If `?raw` is present, each entry includes `rawContent` HTML instead.

## Authentication

**Required** - Use header: `Authorization: Bearer YOUR_API_TOKEN`

## Parameters

| Parameter | Location | Type    | Required | Description                                                       |
| --------- | -------- | ------- | -------- | ----------------------------------------------------------------- |
| `user`    | Query    | string  | Yes      | `NeurosamaAI`, `EvilNeuroAI`, or `Vedal987`                       |
| `raw`     | Query    | boolean | No       | If present, returns `rawContent` HTML instead of parsed `content` |

## Request Examples

```http
GET https://neuro.appstun.net/api/v2/x-feed?user=NeurosamaAI
Authorization: Bearer YOUR_API_TOKEN
```

```http
GET https://neuro.appstun.net/api/v2/x-feed?user=EvilNeuroAI&raw
Authorization: Bearer YOUR_API_TOKEN
```

## Response Format

### Success Response (200)

#### Parsed content response

```json
{
  "data": [
    {
      "id": "2082074178815983970",
      "type": "reply",
      "replyTo": {
        "username": "nyalra",
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
      "url": "<some-public-nitter-instance-host>/NeurosamaAI/status/2082074178815983970#m",
      "createdTimestamp": 1785240141000,
      "content": "help me too.",
      "media": []
    }
  ],
  "metadata": {
    "placeholders": {
      "nitterHost": "<some-public-nitter-instance-host>"
    }
  }
}
```

#### Raw content response

```json
{
  "data": [
    {
      "id": "2089666074224546277",
      "type": "tweet",
      "author": {
        "username": "NeurosamaAI"
      },
      "url": "<some-public-nitter-instance-host>/NeurosamaAI/status/2089666074224546277#m",
      "createdTimestamp": 1787050190000,
      "rawContent": "<p>Example post</p><img src=\"<some-public-nitter-instance-host>/pic/media%2Fexample.jpg\" />",
      "media": [
        {
          "type": "image",
          "url": "<some-public-nitter-instance-host>/pic/media%2Fexample.jpg"
        }
      ]
    }
  ],
  "metadata": {
    "placeholders": {
      "nitterHost": "<some-public-nitter-instance-host>"
    }
  }
}
```

## Entry Properties

| Property           | Type                                | Description                                                        |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| `id`               | string                              | Exact X/Twitter post ID. Kept as a string to avoid integer loss.   |
| `type`             | `tweet`, `reply`, or `retweet`      | Entry type parsed from the feed.                                   |
| `replyTo`          | object                              | Reply target with `username` and optional `post`; replies only.    |
| `retweetedBy`      | object                              | Retweet account with `username`; only included for retweets.       |
| `author`           | object                              | Original entry author with `username`.                             |
| `url`              | string                              | Post URL containing the Nitter host placeholder.                   |
| `createdTimestamp` | number                              | Post creation time as a Unix timestamp in milliseconds.            |
| `content`          | string                              | Plain-text content; included unless `?raw` is present.              |
| `rawContent`       | string                              | Feed HTML; included only when `?raw` is present.                    |
| `media`            | object[]                            | Structured image and video attachments.                           |

### Media Properties

Image attachment:

```json
{
  "type": "image",
  "url": "<some-public-nitter-instance-host>/pic/media%2Fexample.jpg"
}
```

Video attachment:

```json
{
  "type": "video",
  "url": "<some-public-nitter-instance-host>/pic/video.twimg.com%2Ftweet_video%2Fexample.mp4",
  "posterUrl": "<some-public-nitter-instance-host>/pic/tweet_video_thumb%2Fexample.jpg",
  "mimeType": "video/mp4"
}
```

`posterUrl` and `mimeType` are included when the feed provides them.

### Reply Post

When FxTwitter can resolve the parent post, replies additionally include it under `replyTo.post`:

```json
{
  "replyTo": {
    "username": "nyalra",
    "post": {
      "id": "2080484493006434440",
      "content": "Help me neuro-sama",
      "createdTimestamp": 1784861131000,
      "media": []
    }
  }
}
```

`replyTo.post` is optional because the parent may be deleted, private, unavailable, or temporarily not resolvable through FxTwitter. Its `media` uses the same structured image/video schema documented above, but contains direct public X CDN URLs rather than the Nitter placeholder. The RSS-provided `replyTo.username` remains available independently.

| Property           | Type     | Description                                             |
| ------------------ | -------- | ------------------------------------------------------- |
| `id`               | string   | Exact ID of the parent X post.                          |
| `content`          | string   | Plain-text parent post content returned by FxTwitter.   |
| `createdTimestamp` | number   | Parent post creation time in Unix milliseconds.        |
| `media`            | object[] | Parent post image/video attachments returned by FxTwitter. |

## URL Placeholder

The source Nitter instance is private. URLs served by this endpoint therefore use the value from `metadata.placeholders.nitterHost` instead of exposing its origin.

Replace every occurrence of `<some-public-nitter-instance-host>` in entry `url`, `media[].url`, `media[].posterUrl`, and `rawContent` with the origin of a public Nitter instance before using those values. Do not add a trailing slash to the replacement origin.

```typescript
const placeholder = response.metadata.placeholders.nitterHost;
const publicNitterHost = "https://your-public-nitter.example";
const postUrl = response.data[0].url.replaceAll(placeholder, publicNitterHost);
```

The TypeScript/JavaScript client can perform this replacement automatically through the optional third argument of `getXFeed()`:

```typescript
const feed = await client.getXFeed("NeurosamaAI", false, "https://your-public-nitter.example");
console.log(feed.data?.entries[0]?.url);
```

## Error Responses

### No Feed Data (404)

```json
{
  "error": {
    "code": "NF1",
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

- The feed is cached and refreshed every minute on the server
- HTTP responses use `Cache-Control: private, max-age=120`
- The endpoint requires authentication and is rate-limited to `16/min` per API token
- The RSS feed only exposes the username targeted by a reply, not the ID of the replied-to post
- Parent post data under `replyTo.post` is best-effort FxTwitter enrichment and may be absent
- RSS data is cached immediately; parent enrichment runs afterwards and never delays an API request or the core feed refresh
- New or changed replies can therefore produce one update without `replyTo.post` and another changed-entry update after enrichment completes
- Temporarily failed FxTwitter requests are retried after a one-minute cooldown, with limited concurrency
- FxTwitter `404` responses are treated as unavailable parent posts and held in a bounded runtime negative cache without error logging
- Missing or unsupported `user` values return the general `AP4` invalid-query error
- `xFeedUpdate` WebSocket events contain the account name and only changed or newly added entries; see [websocket.md](websocket.md#x-feed-update-event)
