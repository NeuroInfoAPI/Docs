**⤴️ Back to the [Clients README](../README.md)**

# TypeScript/JavaScript Client

A comprehensive TypeScript client that provides full access to all NeuroInfoAPI endpoints with proper type definitions.

**The client is also available as an NPM package: [`neuroinfoapi-client`](https://www.npmjs.com/package/neuroinfoapi-client)** 

**File:** [`NeuroInfoAPI-Client.ts`](NeuroInfoAPI-Client.ts)

<br>

> [!NOTE]
> JavaScript is already prebuilt in this folder (`NeuroInfoAPI-Client.js`). You do not need to convert the TypeScript file yourself. 

### Features

- 🔒 **Authentication Support** - Automatic Bearer token handling
- 📝 **Full TypeScript Support** - Complete type definitions for all API responses
- ⏱️ **Timeout Protection** - 10-second request timeout by default
- ✅ **Type-Safe Error Handling** - Result pattern with `{ data, error }` return type
- 📰 **Blog Feed Support** - Fetch parsed or raw blog feed data
- ~~📡 **Event System** - `NeuroInfoApiEventer` for "real-time" updates~~ (deprecated)
- ⚡ **WebSocket Client** - `NeuroInfoApiWebsocketClient` for true real-time updates with auto reconnect

### Requirements

This file uses the npm package [Axios](https://www.npmjs.com/package/axios) to do the request.<br>
Install the package with `npm install axios`.

Works in browser projects too (Vite/Webpack/Rollup/etc.), as long as `axios` is installed.

If you don't want to use Axios and prefer `fetch()`, you can ask your favorite local AI to make this change with the following prompt:
```
Remove the Axios dependency from NeuroInfoAPI-Client.js and replace it with the standard fetch() API. Ensure performance remains comparable.
```  

### Quick Start

Use the file that matches your project setup:

- TypeScript: `NeuroInfoAPI-Client.ts`
- JavaScript: `NeuroInfoAPI-Client.js`

```typescript
import { NeuroInfoApiClient } from "./NeuroInfoAPI-Client";

const client = new NeuroInfoApiClient();

// For endpoints requiring authentication
client.setApiToken("your-api-token-here");
```

### Browser Usage

```typescript
import { NeuroInfoApiClient, NeuroInfoApiWebsocketClient } from "./NeuroInfoAPI-Client";

const client = new NeuroInfoApiClient();
client.setApiToken("your-api-token-here");

// Browser-safe default uses ticket auth (no token in WS URL)
const wsClient = new NeuroInfoApiWebsocketClient("your-api-token-here");
await wsClient.connect();
```

> [!NOTE]
> For browsers, keep `authMethod` as the default (`"ticket"`). `"header"` auth is runtime-dependent and mainly intended for Node.js environments.

### Error Handling

All client methods return a result object with either `data` or `error`:

```typescript
const { data, error } = await client.getCurrentStream();

if (error) {
  // error is NeuroApiError with code, message, and status
  console.log(`Error ${error.code}: ${error.message}`);
  return;
}

// TypeScript knows data is TwitchStreamData here
console.log(data.title);
```

### Blog Feed

`getBlogFeed()` requires an API token. Use `getBlogFeed()` for parsed sections or `getBlogFeed(true)` for raw HTML content.

```typescript
client.setApiToken("your-api-token-here");

const parsedFeed = await client.getBlogFeed();
const rawFeed = await client.getBlogFeed(true);

if (parsedFeed.data) {
  console.log(parsedFeed.data.data.entries[0]?.content);
}

if (rawFeed.data) {
  console.log(rawFeed.data.data.entries[0]?.rawContent);
}
```

### Schedule Search Pagination

Use `getScheduleSearch` to search schedule entries and continue with `nextCursor`.
Optional filter: `type` (`normal`, `offline`, `canceled`, `TBD`, `unknown`).

> [!IMPORTANT]
> `/schedule/search` uses two limits: `6 requests/minute` and `2 requests/10 seconds` per token.
> Pagination can continue immediately, but avoid tight loops.

```typescript
const firstPage = await client.getScheduleSearch("karaoke", { limit: 5, sort: "desc", type: "normal" });
if (firstPage.error) {
  console.error(firstPage.error.code, firstPage.error.message);
} else {
  console.log("matches:", firstPage.data.results.length);

  if (firstPage.data.nextCursor) {
    const secondPage = await client.getScheduleSearch("karaoke", {
      limit: 5,
      sort: "desc",
      cursor: firstPage.data.nextCursor,
    });
    console.log("next page:", secondPage.data?.results.length ?? 0);
  }
}
```

### Event System (deprecated)

> [!IMPORTANT]
> The `NeuroInfoApiEventer` is now deprecated in favor of the more robust `NeuroInfoApiWebsocketClient`.<br>
> The WebSocket client provides true real-time updates with lower latency and better reliability. However, the eventer is still available for use if you prefer a simpler polling-based approach.

Use `NeuroInfoApiEventer` to listen for "real-time" updates:

```typescript
import { NeuroInfoApiEventer } from "./NeuroInfoAPI-Client";

const eventer = new NeuroInfoApiEventer();
eventer.setApiToken("your-api-token-here");

// Listen for stream going live
eventer.on("streamOnline", (stream) => {
  console.log(`${stream.title} is now live!`);
});

// With optional error handler
eventer.on(
  "scheduleUpdate",
  (schedule) => console.log(`New schedule for week ${schedule.week}`),
  (error) => console.log(`Failed to fetch schedule: ${error.code}`)
);

// Start polling (default: every 60 seconds, minimum: 10 seconds)
eventer.fetchInterval = 30000; // 30 seconds
eventer.startEventLoop();
```

**Available Events:**
| Event                | Description                         |
| -------------------- | ----------------------------------- |
| `streamOnline`       | Stream went live                    |
| `streamOffline`      | Stream went offline                 |
| `streamUpdate`       | Any stream data changed             |
| `scheduleUpdate`     | Schedule was updated                |
| `subathonUpdate`     | Subathon data changed               |
| `subathonGoalUpdate` | A subathon goal was reached/updated |

### WebSocket Client

Use `NeuroInfoApiWebsocketClient` for low-latency, push-based updates:

```typescript
import { NeuroInfoApiWebsocketClient } from "./NeuroInfoAPI-Client";

const wsClient = new NeuroInfoApiWebsocketClient("your-api-token-here");

wsClient.on("_connected", (sessionId) => {
  console.log("Connected with session:", sessionId);
});

wsClient.on("_eventAdded", (eventType) => {
  console.log("Subscribed:", eventType);
});

wsClient.on("_eventRemoved", (eventType) => {
  console.log("Unsubscribed:", eventType);
});

wsClient.on("streamOnline", (stream) => {
  console.log("Stream online:", stream.title);
});

await wsClient.connect();
```

**Available WebSocket Events:**

| Event                      | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `streamOnline`             | Stream went live                                     |
| `streamOffline`            | Stream went offline                                  |
| `streamUpdate`             | Stream metadata changed                              |
| `secretneuroaccountOnline` | Special alert: secretneuroaccount is live            |
| `streamRaidIncoming`       | Incoming raid event                                  |
| `streamRaidOutgoing`       | Outgoing raid event                                  |
| `blogFeedUpdate`           | Blog feed changed; includes changed/new entries only |
| `scheduleUpdate`           | Weekly schedule changed                              |
| `subathonUpdate`           | Subathon state changed                               |
| `subathonGoalUpdate`       | Subathon goal changed                                |

`secretneuroaccountOnline` sends the same payload shape as `streamOnline`, but it is emitted specifically when the Twitch account `secretneuroaccount` goes live. This is the only event for this account.

> [!NOTE]
> By default, the WebSocket client uses ticket-based authentication (`GET /api/ws/ticket`) before connecting. This avoids putting API tokens into URL query parameters.

---

Need help or found a bug? Feel free to [open an issue](../../../issues) or start a [discussion](../../../discussions)!
