**⤴️ Back to the [README](README.md)**

# WebSocket API Documentation

## Endpoints

> [!IMPORTANT]
> Recommended authentication flow for browser clients:
> 1) Get one-time ticket via REST (`GET /api/ws/ticket`) with Bearer token
> 2) Connect via WebSocket using `?ticket=...`

### Ticket Endpoint

`GET https://neuro.appstun.net/api/ws/ticket`

### WebSocket Connection

`WSS wss://neuro.appstun.net/api/ws`

## Description

The WebSocket API provides real-time events for stream, schedule, and subathon updates. Authentication is required. Browser clients should use ticket-based auth. Server-to-server clients can use direct `Authorization: Bearer` auth during handshake.

## Endpoints Details

### Ticket Endpoint

#### Endpoint

`GET https://neuro.appstun.net/api/ws/ticket`

#### Description

Generates a one-time WebSocket connection ticket. The ticket is valid for 30 seconds and can only be used once.

#### Authentication

**Required** - Valid API token must be provided in Authorization header.

#### Parameters

None

#### Request Example

```http
GET https://neuro.appstun.net/api/ws/ticket
Authorization: Bearer YOUR_API_TOKEN
```

#### Response Format

##### Success Response (200)

```json
{
  "data": {
    "ticket": "f8c8e16a...",
    "expiresIn": 30,
    "usage": "Connect with wss://neuro.appstun.net/api/ws?ticket=<ticket>"
  }
}
```

### WebSocket Connection

#### Endpoint

`WSS wss://neuro.appstun.net/api/ws`

#### Description

Establishes an authenticated WebSocket session. After connecting, clients can subscribe/unsubscribe to event types and receive real-time updates.

#### Authentication

**Required** - Choose one method:

- **Ticket (recommended)**: `wss://neuro.appstun.net/api/ws?ticket=YOUR_ONE_TIME_TICKET`
- **Authorization header** (server-to-server): `Authorization: Bearer YOUR_API_TOKEN`

#### Parameters

| Parameter | Type   | Required | Description                                     |
| --------- | ------ | -------- | ----------------------------------------------- |
| `ticket`  | string | No       | One-time ticket (required for browser clients). |

#### Request Examples

```http
GET wss://neuro.appstun.net/api/ws?ticket=YOUR_ONE_TIME_TICKET
```

```http
GET wss://neuro.appstun.net/api/ws
Authorization: Bearer YOUR_API_TOKEN
```

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

##### Event Message

```json
{
  "type": "event",
  "data": {
    "eventType": "scheduleUpdate",
    "eventData": {
      "year": 2026,
      "week": 8,
      "schedule": [],
      "isFinal": true
    },
    "timestamp": 1766924114000
  }
}
```

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

#### Available Event Types

| Event Type                 | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `blogFeedUpdate`           | Blog feed changed; payload contains only changed/new entries  |
| `scheduleUpdate`           | Weekly schedule was updated                                   |
| `subathonUpdate`           | Subathon state changed                                        |
| `subathonGoalUpdate`       | Subathon goal status changed                                  |
| `streamOnline`             | Stream started                                                |
| `streamUpdate`             | Stream metadata changed (throttled)                           |
| `streamOffline`            | Stream ended                                                  |
| `secretneuroaccountOnline` | secretneuroaccount went live (same payload as `streamOnline`) |
| `streamRaidIncoming`       | Raid incoming event                                           |
| `streamRaidOutgoing`       | Raid outgoing event                                           |

## Error Responses

### Ticket Endpoint: Authentication Required (401)

```json
{
  "error": {
    "code": "AU1",
    "message": "Missing or invalid authorization header"
  }
}
```

### Ticket Endpoint: Invalid Token (401)

```json
{
  "error": {
    "code": "AU2",
    "message": "Invalid or expired API token"
  }
}
```

### Ticket Endpoint: Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RL4",
    "message": "Rate limit exceeded: Maximum 100 requests per minute"
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
- Keepalive pings are enabled; idle timeout is 60 seconds
- WebSocket uses the next port after the HTTP API server (typically API port + 1)
