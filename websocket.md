**⤴️ Back to the [README](README.md)**

# WebSocket API Documentation

## Endpoints

The v1 socket `/api/ws` and its ticket endpoint `/api/ws/ticket` were removed on **2026-11-01** and return HTTP `410 Gone` (`AP5`). Use the v2 endpoints below.

> [!IMPORTANT]
> Recommended authentication flow for browser clients:
> 1) Get one-time ticket via REST (`GET /api/v2/ws/ticket`) with Bearer token
> 2) Connect via WebSocket using `?ticket=...` on **`/api/v2/ws`**

### Ticket Endpoint

`GET https://neuroinfoapi.dev/api/v2/ws/ticket`

### WebSocket Connection

`WSS wss://neuroinfoapi.dev/api/v2/ws`

## Description

The WebSocket API provides real-time events for stream, feed, schedule, and subathon updates. Authentication is required. Browser clients should use ticket-based auth. Server-to-server clients can use direct `Authorization: Bearer` auth during handshake.

## Endpoints Details

### Ticket Endpoint

#### Endpoint

`GET https://neuroinfoapi.dev/api/v2/ws/ticket`

#### Description

Generates a one-time WebSocket connection ticket. The ticket is valid for 30 seconds and can only be used once.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

None

#### Request Example

```http
GET https://neuroinfoapi.dev/api/v2/ws/ticket
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "ticket": "f8c8e16a...",
    "expiresIn": 30,
    "usage": "Connect with wss://neuroinfoapi.dev/api/v2/ws?ticket=<ticket>"
  }
}
```

### WebSocket Connection

#### Endpoint

`WSS wss://neuroinfoapi.dev/api/v2/ws`

#### Description

Establishes an authenticated WebSocket session. After connecting, clients can subscribe/unsubscribe to event types and receive real-time updates.

#### Authentication

**Required** - Choose one method:

- **Ticket (recommended)**: `wss://neuroinfoapi.dev/api/v2/ws?ticket=YOUR_ONE_TIME_TICKET`
- **Authorization header** (server-to-server): `Authorization: Bearer YOUR_API_TOKEN`

#### Parameters

| Parameter | Type   | Required | Description                                     |
| --------- | ------ | -------- | ----------------------------------------------- |
| `ticket`  | string | No       | One-time ticket (required for browser clients). |

#### Request Examples

```http
GET wss://neuroinfoapi.dev/api/v2/ws?ticket=YOUR_ONE_TIME_TICKET
```

```http
GET wss://neuroinfoapi.dev/api/v2/ws
Authorization: Bearer YOUR_API_TOKEN
```

## WebSocket Message Protocol

This message protocol is used by `WSS /api/v2/ws`.

#### Client Message Format

##### Subscribe to Event

```json
{
  "type": "addEvent",
  "data": {
    "eventType": "streamOnline"
  }
}
```

##### Unsubscribe from Event

```json
{
  "type": "removeEvent",
  "data": {
    "eventType": "streamOnline"
  }
}
```

##### List Events

```json
{
  "type": "listEvents",
  "data": {}
}
```

##### Ping (Lightweight Keepalive for client)

```json
{
  "type": "ping"
}
```

#### Server Message Format

##### Welcome Message

```json
{
  "type": "welcome",
  "data": {
    "sessionId": "a1b2c3d4"
  }
}
```

##### Event Message (v2 `scheduleUpdate`)

```json
{
  "type": "event",
  "data": {
    "eventType": "scheduleUpdate",
    "eventData": {
      "year": 2026,
      "week": 8,
      "schedule": [],
      "status": "confirmed",
      "imageUrl": "https://orqd3anhk8.ufs.sh/f/bmdmWPQm3hYTFClut4aKTq0eL82y73cDPkUrwznbpau9fiCI"
    },
    "timestamp": 1766924114000
  }
}
```

> [!NOTE]
> `scheduleUpdate` uses `status` (`auto_twitch`, `auto_discord`, `confirmed`) and includes the current weekly `imageUrl` (or `null`). Image-only changes also emit a v2 update. To always resolve the currently active image URL, use the [Schedule Image redirect](schedule.md#schedule-image).

> [!IMPORTANT]
> A `scheduleUpdate` can refer to any weekly schedule, including a past week. The WebSocket server and client library forward these events unchanged. Use `eventData.year` and `eventData.week` to filter events for the schedules relevant to your application.

##### Blog Feed Update Event

```json
{
  "type": "event",
  "data": {
    "eventType": "blogFeedUpdate",
    "eventData": {
      "url": "https://blog.neurosama.com/",
      "lastUpdated": 1774872600000,
      "title": "Neuro-sama Blog",
      "subtitle": "Official updates and announcements",
      "entries": [
        {
          "title": "Weekly Update",
          "author": "Vedal",
          "url": "https://blog.neurosama.com/posts/weekly-update",
          "published": 1774872000000,
          "updated": 1774872600000,
          "content": [
            {
              "header": "Highlights",
              "body": "Neuro will be live more often this week."
            }
          ],
          "summary": "Neuro will be live more often this week."
        }
      ]
    },
    "timestamp": 1774872605000
  }
}
```

##### X Feed New Entries Event

Only entries published after the newest previously seen entry are included. Changes to existing entries and old entries that re-enter the rolling feed cache do not trigger this event.

```json
{
  "type": "event",
  "data": {
    "eventType": "xFeedNewEntries",
    "eventData": {
      "user": "NeurosamaAI",
      "entries": [
        {
          "id": "2089666074224546277",
          "type": "reply",
          "replyTo": {
            "username": "EvilNeuroAI",
            "statusId": "2089660000000000000",
            "url": "https://x.com/EvilNeuroAI/status/2089660000000000000",
            "post": {
              "id": "2089660000000000000",
              "content": "Example parent post",
              "createdTimestamp": 1787040000000,
              "media": []
            }
          },
          "author": {
            "username": "NeurosamaAI"
          },
          "url": "https://x.com/NeurosamaAI/status/2089666074224546277",
          "createdTimestamp": 1787050190000,
          "content": "Example reply",
          "media": []
        }
      ]
    },
    "timestamp": 1787050195000
  }
}
```

`xFeedUpdate` is deprecated. It is currently emitted at the same time with the same payload so existing consumers keep working. New consumers should only subscribe to `xFeedNewEntries`; subscribing to both produces duplicate notifications.

##### Shop Products Update Event

Sends the full current catalog when products change, including additions and removals. Product fields match the [Shop API](shop.md#product-properties), with original shop currencies. Replace your previous catalog with `products`; removed products are no longer included.

```json
{
  "type": "event",
  "data": {
    "eventType": "shopProductsUpdate",
    "eventData": {
      "products": [
        {
          "id": "1234567890123",
          "title": "Neuro-sama Plush",
          "handle": "neuro-sama-plush",
          "url": "https://neurosama.shop/p/1234567890123",
          "description": "Neuro-sama plush.",
          "descriptionHtml": "<p>Neuro-sama plush.</p>",
          "vendor": "Neuro-sama",
          "productType": "Plush",
          "tags": [],
          "availableForSale": true,
          "createdAt": 1793491200000,
          "updatedAt": 1793577600000,
          "publishedAt": 1793491200000,
          "seo": {
            "title": null,
            "description": null
          },
          "options": [
            {
              "name": "Size",
              "values": [
                "One size"
              ]
            }
          ],
          "images": [],
          "variants": [
            {
              "id": "1234567890456",
              "title": "One size",
              "sku": null,
              "availableForSale": true,
              "price": {
                "amount": "29.99",
                "currencyCode": "USD"
              },
              "compareAtPrice": null,
              "selectedOptions": [
                {
                  "name": "Size",
                  "value": "One size"
                }
              ],
              "image": null
            }
          ],
          "collections": [
            {
              "id": "123456789",
              "title": "Neuro-sama"
            }
          ],
          "metafields": []
        }
      ]
    },
    "timestamp": 1794182400123
  }
}
```

`timestamp` is the event send time in Unix milliseconds. Product timestamps describe changes in the shop. Initial loads, unchanged results, and failed updates do not emit this event. Use REST for the initial catalog and after reconnecting.

##### Schedule-Linked Stream Events

Every Twitch channel linked in a schedule entry (except the main channel `vedal987`) is watched. `linkType` says how it is linked:

| `linkType` | Meaning                                                    | Example                                                                         |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `on`       | The entry explicitly takes place on that channel           | `(on [secretneuroaccount](<https://twitch.tv/secretneuroaccount>)) Evil Stream` |
| `collab`   | Any other Twitch link, usually a collab partner            | `Geoguessr w/ [Filian](<https://twitch.tv/filian>) & Neuro`                     |

A collab entry with several Twitch links sends separate events for each channel. Only Twitch links count (no YouTube or plain names), and canceled or offline entries are ignored.

A linked channel is watched from 3 hours before the scheduled time until its stream has ended (plus 15 minutes for restarts). If the channel never goes live, watching stops 4 hours after the scheduled time. `collab` links are coupled to the main stream when it is live at or after the scheduled time: a partner that is not live is watched while the main stream runs and until 15 minutes after it ended, and a partner that is still live 6 hours after the main stream ended gets an offline event with reason `timeout`. `on` links are independent of the main channel. `scheduleEntry` is the matching entry of the weekly schedule, and `channel` is the linked Twitch channel (same shape as `channel` in the raid events).

`scheduleLinkedStreamOnline` uses `trigger` to say why it was sent:

| `trigger`      | Sent when                                                                              | `stream`                                         |
| -------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `streamStart`  | The channel went live while it was watched                                             | Same as `streamOnline`                           |
| `fetch`        | The channel was already live when watching started (early start or server restart)    | Same as `streamOnline`                           |
| `scheduleTime` | The scheduled time was reached. Always sent once per entry, whether live or not       | Same as `streamOnline`, or `{ "isLive": false }` |

Use `streamStart`/`fetch` if you care about the actual stream start, or only `scheduleTime` if you want to react when the stream is planned. Collab partners often stream their own content before a collab, so `fetch` can come from an earlier stream; `scheduleTime` is the more reliable signal for collabs.

```json
{
  "type": "event",
  "data": {
    "eventType": "scheduleLinkedStreamOnline",
    "eventData": {
      "trigger": "streamStart",
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
    },
    "timestamp": 1793210415000
  }
}
```

`scheduleLinkedStreamUpdate` has the same `channel`, `linkType` and `scheduleEntry`, and `stream` has the same shape as `streamUpdate`. It is throttled to at most one broadcast every 2 seconds per channel.

```json
{
  "eventType": "scheduleLinkedStreamUpdate",
  "eventData": {
    "channel": { "id": "1234567890", "name": "secretneuroaccount", "displayName": "secretneuroaccount" },
    "linkType": "on",
    "scheduleEntry": { "day": 3, "time": 1793210400000, "message": "(on [secretneuroaccount](<https://twitch.tv/secretneuroaccount>)) Evil Stream", "type": "normal" },
    "stream": { "title": "Evil Stream (new title)", "game": { "id": "509658", "name": "Just Chatting" }, "language": "en", "isMature": false }
  }
}
```

`scheduleLinkedStreamOffline` has `stream: { "isLive": false }` like `streamOffline`, plus `reason`:

| `reason`          | Sent when                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `streamEnd`       | The channel's stream ended                                                                                 |
| `noShow`          | `scheduleTime` was sent while the channel was offline, and it never went live: within 4 hours, or for `collab` links until 15 minutes after the main stream ended |
| `scheduleRemoved` | `scheduleTime` was sent while the channel was offline, and the entry was then removed from the schedule  |
| `timeout`         | The stream was still live at the maximum watch time: 3 days after the scheduled time for `on` links, 24 hours for `collab` links, or for `collab` links 6 hours after the main stream ended. The channel is no longer watched |

If a channel is still live when the watch window of its next entry opens (e.g. a marathon on consecutive days), the running stream continues with the new `scheduleEntry`: no offline event and no new `fetch`, but `scheduleTime` is sent again at the new entry's time.

```json
{
  "eventType": "scheduleLinkedStreamOffline",
  "eventData": {
    "reason": "streamEnd",
    "channel": { "id": "1234567890", "name": "secretneuroaccount", "displayName": "secretneuroaccount" },
    "linkType": "on",
    "scheduleEntry": { "day": 3, "time": 1793210400000, "message": "(on [secretneuroaccount](<https://twitch.tv/secretneuroaccount>)) Evil Stream", "type": "normal" },
    "stream": { "isLive": false }
  }
}
```

After the last online event of an entry, exactly one offline event follows (online events can repeat, e.g. `fetch` and then `scheduleTime`). The current state is available via [`GET /api/v2/twitch/scheduleLinkedStreams`](twitch.md#schedule-linked-streams).

##### Subscription Responses

```json
{
  "type": "addSuccess",
  "data": {
    "eventType": "streamOnline",
    "subscribed": true
  }
}
```

```json
{
  "type": "removeSuccess",
  "data": {
    "eventType": "streamOnline",
    "unsubscribed": true
  }
}
```

```json
{
  "type": "listEvents",
  "data": {
    "subscribedEvents": ["streamOnline"],
    "availableEvents": [
      "shopProductsUpdate",
      "blogFeedUpdate",
      "xFeedNewEntries",
      "xFeedUpdate",
      "scheduleUpdate",
      "subathonUpdate",
      "subathonGoalUpdate",
      "streamOnline",
      "streamUpdate",
      "streamOffline",
      "secretneuroaccountOnline",
      "scheduleLinkedStreamOnline",
      "scheduleLinkedStreamUpdate",
      "scheduleLinkedStreamOffline",
      "streamRaidIncoming",
      "streamRaidOutgoing"
    ]
  }
}
```

```json
{
  "type": "pong",
  "data": {}
}
```

#### Available Event Types

| Event Type                 | Description                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| `shopProductsUpdate`       | Shop products changed; payload contains the full current catalog |
| `blogFeedUpdate`           | Blog feed changed; payload contains only changed/new entries     |
| `xFeedNewEntries`          | Newly published X posts, replies, and retweets                   |
| `xFeedUpdate`              | Deprecated alias emitted together with `xFeedNewEntries`         |
| `scheduleUpdate`           | Weekly schedule was updated                                      |
| `subathonUpdate`           | Subathon state changed                                           |
| `subathonGoalUpdate`       | Subathon goal status changed                                     |
| `streamOnline`             | Stream started                                                   |
| `streamUpdate`             | Stream metadata changed (throttled)                              |
| `streamOffline`            | Stream ended                                                     |
| `secretneuroaccountOnline` | secretneuroaccount went live (same payload as `streamOnline`)    |
| `scheduleLinkedStreamOnline`  | A channel linked in the schedule started or its time came (see `trigger`) |
| `scheduleLinkedStreamUpdate`  | Metadata of a schedule-linked stream changed (throttled)      |
| `scheduleLinkedStreamOffline` | A schedule-linked stream ended (see `reason`)                 |
| `streamRaidIncoming`       | Raid incoming event                                              |
| `streamRaidOutgoing`       | Raid outgoing event                                              |

## Error Responses

### Ticket Endpoint: Authentication Required (401)

```json
{
  "error": {
    "code": "AU9",
    "message": "Missing or invalid authorization header. Use: Authorization: Bearer YOUR_TOKEN",
    "timestamp": 1717516800000,
    "path": "/api/v2/ws/ticket"
  }
}
```

### Ticket Endpoint: Invalid Token (401)

```json
{
  "error": {
    "code": "AU11",
    "message": "Invalid or expired API token",
    "timestamp": 1717516800000,
    "path": "/api/v2/ws/ticket"
  }
}
```

### Ticket Endpoint: Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RL6",
    "message": "Rate limit exceeded: Maximum 10 requests per 10 seconds",
    "timestamp": 1717516800000,
    "path": "/api/v2/ws/ticket"
  }
}
```

### WebSocket Handshake Errors

Handshake errors return plain text responses (not JSON):

- `404 Not Found` (invalid WebSocket path)
- `401 Missing authentication (ticket or token required)`
- `401 Invalid token format`
- `401 Invalid or expired ticket`
- `401 Invalid or expired token`
- `429 Too many connection attempts` (more than 20 attempts per IP in 10 seconds)
- `429 Connection limit reached (max 5)` (`max 20` for an unlimited token)
- `503 Server is at connection capacity`
- `500 Authentication error`
- `500 Upgrade failed`

### WebSocket Invalid Message

```json
{
  "type": "invalid",
  "data": {
    "reason": "malformed",
    "message": "Could not parse message."
  }
}
```

The current v2 message protocol emits these `reason` values:

- `malformed`
- `missingEventtype`
- `invalidEventtype`

The following values are retained in the protocol types for legacy compatibility but are not emitted after the authenticated v2 handshake:

- `unauthenticated`
- `missingToken`
- `invalidToken`
- `authError`

## Other Notes

- Ticket validity is 30 seconds and each ticket is one-time use
- Maximum 5 active WebSocket connections per user; unlimited tokens have a separate limit of 20
- The server accepts at most 20 WebSocket connection attempts per IP in 10 seconds and has a total capacity of 1500 active connections
- `streamUpdate` events are throttled to at most one broadcast every 2 seconds
- `scheduleLinkedStreamUpdate` events are throttled to at most one broadcast every 2 seconds per channel
- `blogFeedUpdate` broadcasts only changed or newly added entries
- `xFeedNewEntries` broadcasts only entries newer than the newest previously seen entry for each supported X account
- `xFeedUpdate` is a deprecated compatibility alias emitted with the same payload
- Keepalive pings are enabled; idle timeout is 60 seconds
- For lightweight client-side liveness checks, prefer `ping`/`pong` over `listEvents`
