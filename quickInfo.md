**⤴️ Back to the [README](README.md)**

# NeuroInfoApi - Quick Reference

## Base URL

`https://neuro.appstun.net/api/v2/`

## Schedule API

_Full docs of endpoint: [schedule.md](schedule.md)_

### Specific Weekly Schedule

`GET /schedule`

- **Purpose**: Weekly schedule for Neuro-sama streams (includes `status`: `auto_twitch`, `auto_discord`, or `confirmed`)
- **Parameters**: `week` (required), `year` (optional)
- **Public**: No (Auth required)
- **Example**: `/schedule?week=25&year=2024`

### Latest Weekly Schedule

`GET /schedule/latest`

- **Purpose**: Latest weekly schedule in database
- **Parameters**: None
- **Public**: Yes

### Search Weekly Schedules

`GET /schedule/search`

- **Purpose**: Search schedule messages with cursor-based pagination
- **Parameters**: `query` (required), `year` (optional), `limit` (optional), `sort` (optional), `type` (optional), `cursorYear` + `cursorWeek` (optional pair)
- **Public**: No (Auth required)
- **Example**: `/schedule/search?query=karaoke&limit=10&sort=desc`

### Schedule Weeks Index

`GET /schedule/weeks`

- **Purpose**: Available schedule week numbers grouped by year
- **Parameters**: None
- **Public**: Yes

## Twitch API

_Full docs of endpoint: [twitch.md](twitch.md)_

### Current Stream Status

`GET /twitch/stream`

- **Purpose**: Current stream information
- **Parameters**: None
- **Public**: Yes

### All VODs

`GET /twitch/vods`

- **Purpose**: All VODs
- **Parameters**: None
- **Public**: No (Auth required)

### Specific VOD

`GET /twitch/vod`

- **Purpose**: Specific VOD by stream ID
- **Parameters**: `id` (required, Twitch stream ID)
- **Public**: No (Auth required)
- **Example**: `/twitch/vod?id=324052648700`

## Subathon API

_Full docs of endpoint: [subathon.md](subathon.md)_

### Current Subathon

`GET /subathon`

- **Purpose**: Current active subathon data with goals
- **Parameters**: None
- **Public**: Yes

### Subathon Data (Specific Year)

`GET /subathon`

- **Purpose**: Subathon data for specific year
- **Parameters**: `year` (required)
- **Public**: No (Auth required)
- **Example**: `/subathon?year=2024`

### Subathon Years

`GET /subathon/years`

- **Purpose**: All subathon years mapped to names (`{ "2024": "Subathon Name" }`)
- **Parameters**: None
- **Public**: Yes

## Blog API

_Full docs of endpoint: [blog.md](blog.md)_

### Blog Feed

`GET /blog`

- **Purpose**: Cached Neuro-sama blog feed with parsed entry content
- **Parameters**: `raw` (optional, if present returns `rawContent` HTML instead of parsed `content`)
- **Public**: No (Auth required)
- **Example**: `/blog?raw`

## Devstream API

_Full docs of endpoint: [schedule.md](schedule.md#devstream-times)_

### Devstream Times

`GET /devstream/times`

- **Purpose**: Timestamps of past devstreams
- **Parameters**: None
- **Public**: Yes

## API Info

`GET /api/info`

- **Purpose**: API version and status information
- **Parameters**: None
- **Public**: Yes
- **Rate limit**: Generous (`300/min`)

## WebSocket API

_Full docs of endpoint: [websocket.md](websocket.md)_

### WebSocket Ticket

`GET /api/v2/ws/ticket`

- **Purpose**: Generate one-time ticket for secure WebSocket authentication
- **Parameters**: None
- **Public**: No (Auth required)

### WebSocket Connection

`WSS /api/v2/ws`

- **Purpose**: Receive real-time stream/schedule/subathon events
- **Authentication**: Required (ticket query param or Authorization header)
- **Event Types**: `blogFeedUpdate`, `scheduleUpdate`, `subathonUpdate`, `subathonGoalUpdate`, `streamOnline`, `streamUpdate`, `streamOffline`, `secretneuroaccountOnline`, `streamRaidIncoming`, `streamRaidOutgoing`
- **Heartbeat Tip**: For custom clients, use lightweight `ping`/`pong` for liveness checks
- **Example**: `/api/v2/ws?ticket=YOUR_ONE_TIME_TICKET`

## Authentication

In Header: `Authorization: Bearer YOUR_API_TOKEN`

> [!NOTE]
> To access non-public API endpoints, you need an API token.  
> Visit the [API Dashboard](https://neuro.appstun.net/api/dash/), connect with your Twitch account, and click the `Generate API Token` button to create one.

_For a quick overview of endpoints requiring authentication, refer to [needsAuth.md](needsAuth.md)._

