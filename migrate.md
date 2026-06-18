**⤴️ Back to the [README](README.md)**

# Migrating from API v1 to v2

> [!IMPORTANT]
> **v1 will be turned off on 2026-11-01.** Migrate to `/api/v2/` before that date.  
> Check `GET https://neuro.appstun.net/api/info` for the latest version status and sunset date.

This guide summarizes every breaking and behavioral change between v1 and v2. Use it together with the updated endpoint docs and the [TypeScript/JavaScript client migration guide](clients/TypeScript-JavaScript/migrate.md) if you use the official client.

## Quick checklist

1. Replace `/api/v1/` with `/api/v2/` in all REST URLs.
2. Wrap success handling in a `data` envelope: `const payload = json.data`.
3. Update renamed endpoints (see [Endpoint path changes](#endpoint-path-changes)).
4. Replace schedule `isFinal` with `status` (see [Schedule `status`](#schedule-status)).
5. Switch WebSocket clients to `wss://neuro.appstun.net/api/v2/ws`.
6. Update query parameters where they changed (`/twitch/vod`, subathon years).
7. Error top-level shape stays `{ error: { code, message, ... } }`; v2 REST errors also include `timestamp` and `path` (see [Errors](#errors)).

## Base URL

|              | v1 (deprecated)                     | v2 (current)                        |
| ------------ | ----------------------------------- | ----------------------------------- |
| REST         | `https://neuro.appstun.net/api/v1/` | `https://neuro.appstun.net/api/v2/` |
| WebSocket    | `wss://neuro.appstun.net/api/ws`    | `wss://neuro.appstun.net/api/v2/ws` |
| WS ticket    | `GET /api/ws/ticket`                | `GET /api/v2/ws/ticket`             |
| Version info | -                                   | `GET /api/info`                     |

`/api/auth` and dashboard routes are not versioned under `/api/v2`.

## Response envelope

### v1

Most v1 endpoints returned the payload directly:

```json
{
  "isLive": true,
  "id": "331913732989",
  "title": "..."
}
```

### v2

Every successful REST response is wrapped:

```json
{
  "data": {
    "isLive": true,
    "id": "331913732989",
    "title": "..."
  }
}
```

## Errors

Errors keep the same top-level `{ "error": ... }` wrapper on both versions.

|                      | v1                      | v2                                           |
| -------------------- | ----------------------- | -------------------------------------------- |
| Typical body         | `{ "code", "message" }` | `{ "code", "message", "timestamp", "path" }` |
| Invalid query params | Route-specific codes    | Often `AP4` via v2 query validation          |

```json
{
  "error": {
    "code": "SC1",
    "message": "No schedule found in the database for the given week & year.",
    "timestamp": 1717516800000,
    "path": "/api/v2/schedule"
  }
}
```

## Endpoint path changes

| Purpose           | v1                             | v2                        |
| ----------------- | ------------------------------ | ------------------------- |
| Current subathons | `GET /subathon/current`        | `GET /subathon`           |
| Subathon by year  | `GET /subathon?year=2024`      | `GET /subathon?year=2024` |
| Blog feed         | `GET /blog/feed`               | `GET /blog`               |
| Devstream times   | `GET /schedule/devstreamtimes` | `GET /devstream/times`    |
| Specific VOD      | `GET /twitch/vod?streamId=...` | `GET /twitch/vod?id=...`  |

Unchanged paths apart from the `/api/v2` prefix: `/schedule`, `/schedule/latest`, `/schedule/search`, `/schedule/weeks`, `/twitch/stream`, `/twitch/vods`, `/subathon/years`.

## Schedule `status`

v1 used a boolean `isFinal`.

v2 replaces this with:

| `status`       | Meaning                               |
| -------------- | ------------------------------------- |
| `confirmed`    | Final, manually confirmed             |
| `auto_discord` | Auto-collected from Discord           |
| `auto_twitch`  | Auto-collected or fetched from Twitch |

```javascript
// v1
if (schedule.isFinal) { /* ... */ }

// v2
if (schedule.status === "confirmed") { /* ... */ }
```

Schedule search results in v2 also use `status` instead of `isFinal`.

## Subathon `/subathon/years`

|                  | v1                                 | v2                          |
| ---------------- | ---------------------------------- | --------------------------- |
| Default response | Array of years: `["2023", "2024"]` | Object mapping year -> name |
| `?detailed`      | Required for year-to-name mapping  | Removed                     |

If you relied on the plain year list, use `Object.keys(json.data)` on the v2 response.

## Blog feed

|             | v1                    | v2                    |
| ----------- | --------------------- | --------------------- |
| Path        | `/blog/feed`          | `/blog`               |
| Server body | `{ "data": { ... } }` | `{ "data": { ... } }` |

The main change is the path and the consistent outer envelope across all endpoints.

## WebSocket

|                          | v1 (deprecated)                                    | v2 (recommended)                                      |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------- |
| URL                      | `wss://neuro.appstun.net/api/ws`                   | `wss://neuro.appstun.net/api/v2/ws`                   |
| Ticket flow              | `GET /api/ws/ticket` -> connect with `?ticket=...` | `GET /api/v2/ws/ticket` -> connect with `?ticket=...` |
| `scheduleUpdate` payload | includes `isFinal: boolean`                        | includes `status: ScheduleStatus`                     |

Event types are otherwise the same.

## v1 deprecation signals

While v1 remains available during the transition, every `/api/v1/*` response includes:

| Header        | Value                                                     |
| ------------- | --------------------------------------------------------- |
| `Deprecation` | `true`                                                    |
| `Sunset`      | `2026-11-01T00:00:00.000Z`                                |
| `Link`        | `<https://neuro.appstun.net/api/docs>; rel="deprecation"` |

Use `GET /api/info` for programmatic version and sunset checks.

## Raw `fetch` migration example

```javascript
// v1
const res = await fetch("https://neuro.appstun.net/api/v1/twitch/stream");
const stream = await res.json();
console.log(stream.isLive);

// v2
const res = await fetch("https://neuro.appstun.net/api/v2/twitch/stream");
const json = await res.json();
if (json.error) throw new Error(json.error.message);
const stream = json.data;
console.log(stream.isLive);
```

## Official client

The TypeScript/JavaScript client is v2 too, unwraps `{ data: ... }` automatically, and exposes updated method signatures. See [clients/TypeScript-JavaScript/migrate.md](clients/TypeScript-JavaScript/migrate.md).

## What did not change

- Authentication: `Authorization: Bearer YOUR_API_TOKEN`
- HTTP methods: GET only on public API routes
- Timestamp format: Unix milliseconds
- Error codes: same `AP*`, `SC*`, `VD*`, etc.
- Payload field names inside resources except `isFinal` -> `status`

## Further reading

- [Quick Reference](quickInfo.md)
- [CHANGELOG](CHANGELOG.md)
- [errors.md](errors.md)
- [websocket.md](websocket.md)
