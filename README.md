# NeuroInfoApi Documentation

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
- **[WebSocket API](websocket.md)** - Real-time events and WebSocket authentication
- **[Prebuild Clients](clients/README.md)** - ready-to-use clients for your project

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
- Event subscriptions for stream, schedule, subathon, and blog updates
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

## 📖 Getting Started

1. **Browse the documentation** - Start with [quickInfo.md](quickInfo.md) for a quick overview
2. **Get an API token** - Visit the [API Dashboard](https://neuro.appstun.net/api/dash/) if you need access to protected endpoints
3. **Test endpoints** - Use the examples in each documentation file
4. **Check authentication** - Review [needsAuth.md](needsAuth.md) to see which endpoints require tokens
5. **Handle errors** - Read [errors.md](errors.md) for error codes and troubleshooting

## 🔧 API Technical Details

- **Base URL**: `https://neuro.appstun.net/api/v1/`
- **WebSocket URL**: `wss://neuro.appstun.net/api/ws`
- **HTTP Methods**: GET only
- **Response Format**: JSON
- **Content-Type**: `application/json`
- **Authentication**: Bearer token in Authorization header

## ⚡ Rate Limiting

- **Public endpoints**: 300 requests per minute (generous)
- **Protected endpoints**: 100 requests per minute (standard)
- **Burst protection**: 10 requests per 10 seconds
- Rate limits are applied per API token

## 📝 Notes

- All timestamps are in Unix milliseconds
- Data is cached for optimal performance
- Manual updates may cause slight delays in data availability
- The API uses calendar week numbers (ISO 8601 standard)
- Error responses follow `{error: {...}}`; success responses are endpoint-specific (object, array, or `{data: {...}}`)

<br>

---

**📝 Contributing:** Found an error in the docs or the API? Want to improve something?<br>
Feel free to [open an issue](../../issues) or start a [discussion](../../discussions)!
