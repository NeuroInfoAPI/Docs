# NeuroInfoApi Documentation

> [!IMPORTANT]
> **v2 is now available.** v1 will be turned off on **2026-11-01**. <br>
> If you're still using `/api/v1/`, please update/migrate to `/api/v2/`. 
> See the **[v1 -> v2 migration guide](migrate.md)** for endpoint, response, and WebSocket changes. <br>
> If you still need the v1 docs ... i guess they are [here](https://github.com/NeuroInfoAPI/Docs/tree/v1).

Welcome to the **NeuroInfoApi** documentation repository! This API provides comprehensive access to Neuro-sama stream data, including schedules, VODs, Twitch information, and subathon details.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Appstun/NeuroInfoAPI-Docs)

## 📚 Documentation Overview

This repository contains documentation for all public API areas:

- **[Quick Reference](quickInfo.md)** - Quick overview of all endpoints
- **[Authentication Guide](needsAuth.md)** - Endpoints requiring API tokens
- **[Error Documentation](errors.md)** - Error codes and troubleshooting
- **[Schedule API](schedule.md)** - Weekly stream schedules
- **[Twitch API](twitch.md)** - Stream status and VOD data
- **[Subathon API](subathon.md)** - Subathon goals and progress
- **[Blog API](blog.md)** - Neuro-sama blog feed and entry content
- **[X Feed API](x-feed.md)** - Cached X posts, replies, retweets, and media links
- **[WebSocket API](websocket.md)** - Real-time events and WebSocket authentication
- **[Prebuild Clients](clients/README.md)** - ready-to-use clients for your project
- **[v1 → v2 Migration Guide](migrate.md)** - upgrade paths for REST, WebSocket, and responses

## 📊 API Features

### Schedule Management

- Access weekly stream schedules
- Get the latest schedule without authentication
- Query specific weeks and years
- Calendar week support (ISO 8601)

### Twitch Integration

- Real-time stream status updates
- Complete VOD archive access
- Cached data for optimal performance
- Direct Twitch API integration

### WebSocket Events

- Real-time event stream via WebSocket
- Secure browser auth via one-time ticket endpoint
- Event subscriptions for stream, schedule, subathon, blog, and X feed updates
- Automatic reconnect support in the TypeScript client

### Subathon Tracking

- Current subathon progress
- Goal tracking and completion status
- Historical subathon data
- Real-time subscriber counts

### Blog Feed

- Cached Neuro-sama blog feed access (refreshes every 15 minutes)
- Parsed entry content or raw HTML content
- Authentication required for JSON endpoint
- Real-time update event for changed feed entries

### X Feed

- Cached feeds for `NeurosamaAI`, `EvilNeuroAI`, and `Vedal987`
- Structured tweet, reply, and retweet entries
- Plain-text content and structured media
- Direct X post and public media URLs

## 📖 Getting Started

1. **Browse the documentation** - Start with [quickInfo.md](quickInfo.md) for a quick overview
2. **Get an API token** - Visit the [API Dashboard](https://neuro.appstun.net/api/dash/) if you need access to protected endpoints
3. **Test endpoints** - Use the examples in each documentation file
4. **Check authentication** - Review [needsAuth.md](needsAuth.md) to see which endpoints require tokens
5. **Handle errors** - Read [errors.md](errors.md) for error codes and troubleshooting

## 🔧 API Technical Details

- **Base URL**: `https://neuro.appstun.net/api/v2/`
- **WebSocket URL**: `wss://neuro.appstun.net/api/v2/ws`
- **WebSocket Ticket URL**: `https://neuro.appstun.net/api/v2/ws/ticket`
- **HTTP Methods**: GET only
- **Response Format**: JSON — v2 REST success always includes `{"data": ...}` and may include endpoint-specific metadata; v2 REST errors use `{"error": {"code": "...", "message": "...", "timestamp": ..., "path": "..."}}`
- **Content-Type**: `application/json`
- **Authentication**: Bearer token in Authorization header

## ⚡ Rate Limiting

- **Default public/anonymous v2 endpoints**: 30 requests per minute
- **Authenticated v2 endpoints**: 100 requests per minute per API token
- **Generous endpoints**: 300 requests per minute where explicitly documented (for example `GET /api/info`)
- **Endpoint-specific limits**: Some routes have stricter limits, such as schedule search (`6/min` plus `2/10s`), blog feed (`16/min`), and X feed (`16/min`)
- Rate limits are applied per API token when authenticated, otherwise per client IP

## 📝 Notes

- All timestamps are in Unix milliseconds
- Data is cached for optimal performance
- Manual updates may cause slight delays in data availability
- The API uses calendar week numbers (ISO 8601 standard)
- All v2 REST success responses include `{"data": ...}` and may include documented metadata; all v2 REST error responses follow `{"error": {"code": "...", "message": "...", "timestamp": ..., "path": "..."}}`

<br>

---

**📝 Contributing:** Found an error in the docs or the API? Want to improve something?<br>
Feel free to [open an issue](../../issues) or start a [discussion](../../discussions)!
