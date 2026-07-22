**⤴️ Back to the [TypeScript/JavaScript Client README](README.md)** · [Full API migration guide](../../migrate.md)

# TypeScript/JavaScript Client — v1 to v2 Migration

> [!IMPORTANT]
> New client versions default to `https://neuro.appstun.net/api/v2`. v1 (`/api/v1`) is deprecated and will be turned off on **2026-11-01**.

This guide covers changes in `NeuroInfoAPI-Client.ts` / `.js` when upgrading from the v1-default client to the v2-default client. For raw HTTP migration (envelopes, endpoint renames), see the [full API migration guide](../../migrate.md).

## Quick checklist

1. Update to the latest client files or `neuroinfoapi-client` npm package.
2. Remove manual `baseUrl: ".../api/v1"` unless you intentionally stay on v1 during transition.
3. Replace `schedule.isFinal` checks with `status` or `isScheduleFinal(status)`.
4. Update `getVod` call sites: parameter renamed from `streamId` to `id`.
5. Update `getSchedule` call sites: argument order is now `(week, year?)`.
6. Replace `getCurrentSubathons()` path expectation: server route is now `/subathon`.
7. Stop using `getSubathonYears(true)` / `?detailed`.
8. Use `getDevstreamTimes()` for devstream timestamps.
9. Blog: use `result.data.entries`, not `result.data.data.entries`.
10. WebSocket: default URL is `/api/v2/ws`; handle `scheduleUpdate.status` instead of `isFinal`.

## Default configuration

| Option              | v1 client                          | v2 client                                        |
| ------------------- | ---------------------------------- | ------------------------------------------------ |
| REST `baseUrl`      | `https://neuro.appstun.net/api/v1` | `https://neuro.appstun.net/api/v2`               |
| WS `baseUrl`        | `wss://neuro.appstun.net/api/ws`   | `wss://neuro.appstun.net/api/v2/ws`              |
| Response unwrapping | None                               | Unwraps `{ data: T }`                            |
| HTTP dependency     | Older external helper              | Built-in `HttpClient` on top of standard `fetch` |

## `request()` and `ApiResult<T>`

The client still returns `{ data, error }` — that is the client result type, not the HTTP envelope.

### v1 behavior

```typescript
private async request<T>(url: string, params?: Record<string, any>): Promise<ApiResult<T>> {
  const response = await this.apiInstance.request<T>(url, { query: params });
  return { data: response, error: null };
}
```

### v2 behavior

```typescript
private async request<T>(url: string, params?: Record<string, any>): Promise<ApiResult<T>> {
  const response = await this.apiInstance.request<any>(url, { query: params });
  const data =
    response && typeof response === "object" && "data" in response ? response.data : response;
  return { data: data as T, error: null };
}
```

## Method and path changes

| Method                        | v1                              | v2                                |
| ----------------------------- | ------------------------------- | --------------------------------- |
| `getVod(id)`                  | `GET /twitch/vod?streamId=`     | `GET /twitch/vod?id=`             |
| `getSchedule(week, year?)`    | was `getSchedule(year?, week?)` | `week` is required first argument |
| `getCurrentSubathons()`       | `GET /subathon/current`         | `GET /subathon`                   |
| `getBlogFeed(raw?)`           | `GET /blog/feed`                | `GET /blog`                       |
| `getSubathonYears(detailed?)` | `?detailed` overload            | always year -> name map           |
| `getDevstreamTimes()`         | not available                   | `GET /devstream/times`            |

## Blog feed typing fix

Older client typings could force:

```typescript
const { data } = await client.getBlogFeed();
const entries = data?.data?.entries;
```

Now use:

```typescript
const { data } = await client.getBlogFeed();
const entries = data?.entries;
```

## Schedule `isFinal` -> `status`

### REST types

```typescript
// v1
interface ScheduleResponse {
  year: number;
  week: number;
  schedule: ScheduleEntry[];
  isFinal: boolean;
}

// v2
type ScheduleStatus = "confirmed" | "auto_discord" | "auto_twitch";

interface ScheduleData {
  year: number;
  week: number;
  schedule: ScheduleEntry[];
  status: ScheduleStatus;
}
```

### Helper

v2 exposes `isScheduleFinal(status)` through `Utils`:

```typescript
import { Utils } from "./NeuroInfoAPI-Client";

const { data } = await client.getLatestSchedule();
if (data && !Utils.isScheduleFinal(data.status)) {
  console.log("Schedule may still change");
}
```

## `NeuroApiError`

v2 adds optional fields from the REST error envelope:

```typescript
class NeuroApiError {
  code: string;
  message: string;
  status?: number;
  timestamp?: number;
  path?: string;
}
```

## WebSocket client

|                       | v1 default                       | v2 default                          |
| --------------------- | -------------------------------- | ----------------------------------- |
| URL                   | `wss://neuro.appstun.net/api/ws` | `wss://neuro.appstun.net/api/v2/ws` |
| `scheduleUpdate` type | `isFinal`                        | `status`                            |

Ticket auth now defaults to `GET /api/v2/ws/ticket` when the WebSocket URL is `/api/v2/ws`.

## `NeuroInfoApiEventer` (deprecated)

The polling-based eventer still works, but prefer `NeuroInfoApiWebsocketClient` for new work.

## NPM package

```bash
npm install neuroinfoapi-client@latest
```

## Migration examples

### Before

```typescript
import { NeuroInfoApiClient } from "neuroinfoapi-client";

const client = new NeuroInfoApiClient("token");
const schedule = await client.getLatestSchedule();
if (schedule.data?.isFinal) console.log("Final schedule");
```

### After

```typescript
import { NeuroInfoApiClient, Utils } from "neuroinfoapi-client";

const client = new NeuroInfoApiClient("token");
const schedule = await client.getLatestSchedule();
if (schedule.data && Utils.isScheduleFinal(schedule.data.status)) {
  console.log("Final schedule");
}
```

## What did not change

- `ApiResult<T>` pattern: `{ data: T | null, error: NeuroApiError | null }`
- `setApiToken()` / Bearer auth
- 10s timeout default
- WebSocket event names except the `scheduleUpdate` payload shape

## See also

- [Full API migration guide](../../migrate.md)
- [Client README](README.md)
- [CHANGELOG](../../CHANGELOG.md)
