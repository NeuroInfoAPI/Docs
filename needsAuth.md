**⤴️ Back to the [README](README.md)**

# Endpoints that require Authentication

> [!IMPORTANT]
> Authentication is done via a Authorization Header: `Authorization: Bearer YOUR_API_TOKEN`<br>
> To generate an API token, visit the [API Dashboard](https://neuro.appstun.net/api/dash/). Log in with your Twitch account and click the `Generate API Token` button.

## Schedule API

- **`GET /api/v1/schedule`** - Get specific weekly schedules
  - Parameters: `week` (required), `year` (optional)

## Twitch API

- **`GET /api/v1/twitch/vods`** - Get all VODs
- **`GET /api/v1/twitch/vod`** - Get specific VOD
  - Parameters: `streamId` (required)

## Subathon API

- **`GET /api/v1/subathon`** - Get subathon data for specific year
  - Parameters: `year` (required)

## WebSocket API

- **`GET /api/ws/ticket`** - Get one-time WebSocket ticket
  - Parameters: None

> [!NOTE]
> `WSS /api/ws` also requires authentication during handshake:
> - Browser clients: use `?ticket=...` from `/api/ws/ticket`
> - Server clients: use `Authorization: Bearer YOUR_API_TOKEN`

---

## Public Endpoints (no auth required)

- `GET /api/v1/schedule/latest` - Latest weekly schedule
- `GET /api/v1/schedule/devstreamtimes` - Devstream timestamps
- `GET /api/v1/twitch/stream` - Current stream information
- `GET /api/v1/subathon/current` - Current active subathon
- `GET /api/v1/subathon/years` - List of all subathon years (`?detailed` for year-to-name map)
- `GET /api/test/geterror` - Test error endpoint
