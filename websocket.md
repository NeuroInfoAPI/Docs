**⤴️ Back to the [README](README.md)**

# WebSocket API Documentation

## Endpoints

> [!IMPORTANT]
> Recommended authentication flow for browser clients:
> 1) Get one-time ticket via REST (`GET /api/v2/ws/ticket`) with Bearer token
> 2) Connect via WebSocket using `?ticket=...` on **`/api/v2/ws`**

### Ticket Endpoint

`GET https://neuro.appstun.net/api/v2/ws/ticket`

### WebSocket Connection

`WSS wss://neuro.appstun.net/api/v2/ws`

## Description

The WebSocket API provides real-time events for stream, feed, schedule, and subathon updates. Authentication is required. Browser clients should use ticket-based auth. Server-to-server clients can use direct `Authorization: Bearer` auth during handshake.

## Endpoints Details

### Ticket Endpoint

#### Endpoint

`GET https://neuro.appstun.net/api/v2/ws/ticket`

#### Description

Generates a one-time WebSocket connection ticket. The ticket is valid for 30 seconds and can only be used once.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/v2/ws/ticket
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "ticket": "f8c8e16a...",
    "expiresIn": 30,
    "usage": "Connect with wss://neuro.appstun.net/api/v2/ws?ticket=<ticket>"
  }
}
```

### WebSocket Connection

#### Endpoint

`WSS wss://neuro.appstun.net/api/v2/ws`

#### Description

Establishes an authenticated WebSocket session. After connecting, clients can subscribe/unsubscribe to event types and receive real-time updates.

#### Authentication

**Required** - Choose one method:

- **Ticket (recommended)**: `wss://neuro.appstun.net/api/v2/ws?ticket=YOUR_ONE_TIME_TICKET`
- **Authorization header** (server-to-server): `Authorization: Bearer YOUR_API_TOKEN`

#### Parameters

| Parameter | Type   | Required | Description                                     |
| --------- | ------ | -------- | ----------------------------------------------- |
| `ticket`  | string | No       | One-time ticket (required for browser clients). |

#### Request Examples

```http
GET wss://neuro.appstun.net/api/v2/ws?ticket=YOUR_ONE_TIME_TICKET
```

```http
GET wss://neuro.appstun.net/api/v2/ws
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

| Event Type                 | Description                                                            |
| -------------------------- | ---------------------------------------------------------------------- |
| `blogFeedUpdate`           | Blog feed changed; payload contains only changed/new entries           |
| `xFeedNewEntries`          | Newly published X posts, replies, and retweets                         |
| `xFeedUpdate`              | Deprecated alias emitted together with `xFeedNewEntries`               |
| `scheduleUpdate`           | Weekly schedule was updated                                            |
| `subathonUpdate`           | Subathon state changed                                                 |
| `subathonGoalUpdate`       | Subathon goal status changed                                           |
| `streamOnline`             | Stream started                                                         |
| `streamUpdate`             | Stream metadata changed (throttled)                                    |
| `streamOffline`            | Stream ended                                                           |
| `secretneuroaccountOnline` | secretneuroaccount went live (same payload as `streamOnline`)          |
| `streamRaidIncoming`       | Raid incoming event                                                    |
| `streamRaidOutgoing`       | Raid outgoing event                                                    |

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
- `401 Invalid or expired ticket`
- `401 Invalid or expired token`
- `429 Connection limit reached (max 5)`
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

Possible `reason` values:

- `malformed`
- `unauthenticated`
- `missingEventtype`
- `invalidEventtype`
- `missingToken`
- `invalidToken`
- `authError`

## Other Notes

- Ticket validity is 30 seconds and each ticket is one-time use
- Maximum 5 active WebSocket connections per user (unlimited tokens excluded)
- `streamUpdate` events are throttled to at most one broadcast every 2 seconds
- `blogFeedUpdate` broadcasts only changed or newly added entries
- `xFeedNewEntries` broadcasts only entries newer than the newest previously seen entry for each supported X account
- `xFeedUpdate` is a deprecated compatibility alias emitted with the same payload
- Keepalive pings are enabled; idle timeout is 60 seconds
- For lightweight client-side liveness checks, prefer `ping`/`pong` over `listEvents`
