**⤴️ Back to the [README](README.md)**

# Endpoints that require Authentication

> [!IMPORTANT]
> Authentication is done via a Authorization Header: `Authorization: Bearer YOUR_API_TOKEN`<br>
> To generate an API token, visit the [API Dashboard](https://neuro.appstun.net/api/dash/). Log in with your Twitch account and click the `Generate API Token` button.

## Schedule API

- **`GET /api/v2/schedule`** - Get specific weekly schedules
  - Parameters: `week` (required), `year` (optional)

## Twitch API

- **`GET /api/v2/twitch/vods`** - Get all VODs
- **`GET /api/v2/twitch/vod`** - Get specific VOD
  - Parameters: `id` (required, Twitch stream ID)

## Subathon API

- **`GET /api/v2/subathon`** - Get subathon data for specific year
  - Parameters: `year` (required)

## Blog API

- **`GET /api/v2/blog`** - Get the cached blog feed
  - Parameters: `raw` (optional)

## X Feed API

- **`GET /api/v2/x-feed`** - Get the cached X feed for a supported account
  - Parameters: `user` (required query parameter: `NeurosamaAI`, `EvilNeuroAI`, or `Vedal987`), `raw` (optional query parameter)

## WebSocket API

- **`GET /api/v2/ws/ticket`** - Get one-time WebSocket ticket
  - Parameters: None

> [!NOTE]
> `WSS /api/v2/ws` requires authentication during handshake:
> - Browser clients: use `?ticket=...` from `/api/v2/ws/ticket`
> - Server clients: use `Authorization: Bearer YOUR_API_TOKEN`

---

## Public Endpoints (no auth required)

- `GET /api/v2/schedule/latest` - Latest weekly schedule
- `GET /api/v2/schedule/image` - Weekly schedule image redirect
- `GET /api/v2/schedule/weeks` - Available schedule week numbers grouped by year
- `GET /api/v2/devstream/times` - Devstream timestamps
- `GET /api/v2/twitch/stream` - Current stream information
- `GET /api/v2/subathon` - Current active subathons (no `year` param)
- `GET /api/v2/subathon/years` - All subathon years with names
- `GET /api/info` - API version info
- `GET /api/test/geterror` - Test error endpoint

