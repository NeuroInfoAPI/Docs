**⤴️ Back to the [README](README.md)**

It's definitely time to write a changelog for "important" changes to the docs. <br>
*<small>Date format: [DD.MM.YYYY]</small>*

## [26.08.2026]

### Changed

- Clarified that `scheduleUpdate` WebSocket events can contain past schedules and consumers must filter them by `year` and `week` ([websocket.md](websocket.md)).

## [22.07.2026]

### Added

- Added weekly schedule `imageUrl` values to API v2 REST responses, searches, and `scheduleUpdate` WebSocket events ([schedule.md](schedule.md), [websocket.md](websocket.md), [NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).
- Added the public `GET /schedule/image` endpoint, which always redirects to the currently active image URL for a week ([schedule.md](schedule.md), [quickInfo.md](quickInfo.md), [needsAuth.md](needsAuth.md)).
- Grouped schedule helper functions under the exported `Utils` namespace in the TypeScript/JavaScript client ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts), [client README](clients/TypeScript-JavaScript/README.md), [client migration guide](clients/TypeScript-JavaScript/migrate.md)).
- Consolidated duplicate REST and WebSocket payload definitions into shared client data types while retaining the previous names as deprecated aliases ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts), [client migration guide](clients/TypeScript-JavaScript/migrate.md)).

## [22.06.2026]

### Added

- Documented `subcountMilestones` on subathon REST responses and WebSocket `subathonUpdate` events ([subathon.md](subathon.md)).
- Added `subcountMilestones` and `SubathonSubcountMilestone` types to the TypeScript/JavaScript client ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).

## [18.06.2026]

### Added

- Added schedule `status` field documentation (`auto_twitch`, `auto_discord`, `confirmed`) with overwrite rules ([schedule.md](schedule.md)).
- Added public documentation for API endpoints and the consistent `{ "data": ... }` response envelope ([README.md](README.md), [quickInfo.md](quickInfo.md), all endpoint docs).
- Added documentation for `GET /devstream/times` and `GET /api/info` ([schedule.md](schedule.md), [quickInfo.md](quickInfo.md)).
- Added v1 to v2 migration guide ([migrate.md](migrate.md)) and TypeScript/JavaScript client migration guide ([clients/TypeScript-JavaScript/migrate.md](clients/TypeScript-JavaScript/migrate.md)).
- Documented v1 sunset date (**2026-11-01**), `GET /api/info` version boot endpoint, and v1 REST deprecation headers (`Deprecation`, `Sunset`, `Link`) on `/api/v1/*` ([README.md](README.md), [migration guide](migrate.md), [errors.md](errors.md)).
- Added `AP2` method-not-allowed and `AP4` invalid query parameter error documentation ([errors.md](errors.md)).
- Documented unified REST error envelope with `code`, `message`, `timestamp`, and `path` ([errors.md](errors.md)).
- Added WebSocket ticket endpoint documentation for `GET /api/v2/ws/ticket` ([websocket.md](websocket.md), [quickInfo.md](quickInfo.md), [needsAuth.md](needsAuth.md)).

### Changed

- **API v2** is now the documented public API version. v1 has its own branch ([README.md](README.md), [quickInfo.md](quickInfo.md)).
- Documented schedule response `status` on REST endpoints and schedule search results ([schedule.md](schedule.md)).
- Added WebSocket endpoint `WSS /api/v2/ws` with `scheduleUpdate.status` ([websocket.md](websocket.md)).
- Updated public docs to use the v2 base URL `https://neuro.appstun.net/api/v2/` ([README.md](README.md), [quickInfo.md](quickInfo.md), [schedule.md](schedule.md), [twitch.md](twitch.md), [subathon.md](subathon.md), [blog.md](blog.md), [websocket.md](websocket.md)).
- Updated endpoint paths: `/subathon/current` → `/subathon`, `/blog/feed` → `/blog`, `/schedule/devstreamtimes` → `/devstream/times` ([subathon.md](subathon.md), [blog.md](blog.md), [schedule.md](schedule.md), [quickInfo.md](quickInfo.md)).
- Updated Twitch docs: `/twitch/vod` query parameter `streamId` → `id` ([twitch.md](twitch.md), [quickInfo.md](quickInfo.md)).
- Updated Subathon docs: `/subathon/years` always returns year-to-name mappings (`?detailed` removed) ([subathon.md](subathon.md), [quickInfo.md](quickInfo.md)).
- Updated all success response examples to use `{ "data": ... }` ([README.md](README.md), [schedule.md](schedule.md), [twitch.md](twitch.md), [subathon.md](subathon.md), [blog.md](blog.md)).
- REST errors include `timestamp` and `path` ([errors.md](errors.md)).
- TS-Client: default REST base URL `/api/v2`; `request()` unwraps `{ data: ... }` server responses ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).
- TS-Client: WebSocket default URL `/api/v2/ws`; `scheduleUpdate` uses `status` ([NeuroInfoAPI-Client](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts)).
- TS-Client: `getSchedule(week, year?)` argument order (week first); added `getDevstreamTimes()`; exported `isScheduleFinal()` helper ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).
- TS-Client: `BlogFeedData` typing fix — use `result.data.entries`, not `result.data.data.entries` ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts), [client migration guide](clients/TypeScript-JavaScript/migrate.md)).
- TS-Client: `getSubathonYears()` always returns year→name map; removed `detailed` parameter ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).
- TS-Client: `NeuroApiError` exposes optional `timestamp` and `path` from v2 error responses ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).
- TS-Client: replaced the external `ofetch` request dependency with the built-in fetch-based `HttpClient` ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).
- Updated TS/JS client docs and generated artifacts for v2 defaults and envelope unwrapping ([client README](clients/TypeScript-JavaScript/README.md), [NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).

## [29.05.2026]

### Changed

- Changed and removed nonsensical texts/info ([blog.md](blog.md), [schedule.md](schedule.md), [websocket.md](websocket.md))
- Updated `/twitch/stream check interval / cache from 20 econds to 10 seconds ([twitch.md](twitch.md))


## [28.05.2026]

### Added

- Added api version check on boot up to TS/JS client ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))


## [10.05.2026]

### Changed

- Updated TypeScript/JavaScript client and restored WebSocket heartbeat support ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).


## [06.05.2026]

### Changed

- Switched the TypeScript/JavaScript client request layer to `ofetch` ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).
- Updated TypeScript/JavaScript client README for the new request dependency ([client README](clients/TypeScript-JavaScript/README.md)).


## [04.05.2026]

### Added

- Added Neuro-sama blog feed documentation ([blog.md](blog.md)).
- Added blog feed endpoint references to README, quick reference, authentication overview, and error docs ([README.md](README.md), [quickInfo.md](quickInfo.md), [needsAuth.md](needsAuth.md), [errors.md](errors.md)).
- Added blog feed support to the TypeScript/JavaScript client ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts), [NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts)).
- Added WebSocket blog feed update documentation ([websocket.md](websocket.md)).

### Changed

- Updated schedule, quick reference, and WebSocket docs for blog feed integration ([schedule.md](schedule.md), [quickInfo.md](quickInfo.md), [websocket.md](websocket.md)).


## [21.04.2026]

### Changed

- Documented lightweight WebSocket `ping`/`pong` keepalive messages ([websocket.md](websocket.md), [quickInfo.md](quickInfo.md))
- Added client-side WebSocket heartbeat (`ping`/`pong`) to TS/JS client ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))
- Fixed Twitch stream `startedAt` timestamp format in docs and TS/JS client type ([twitch.md](twitch.md); [NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))


## [19.04.2026]

### Changed

- Corrected `/api/v1/twitch/vod` quick reference wording to clearly describe streamId-based lookup ([quickInfo.md](quickInfo.md))
- Updated error code of WebSocket handshake ([errors.md](errors.md))


## [13.04.2026]

### Changed

- Added `/schedule/weeks` documentation([schedule.md](schedule.md); [quickInfo.md](quickInfo.md); [needsAuth.md](needsAuth.md))
- Updated schedule cache note for `/schedule/latest` to 1 minute ([schedule.md](schedule.md))
- Updated `/subathon/years` docs for optional `?detailed` mode including response examples ([subathon.md](subathon.md); [quickInfo.md](quickInfo.md); [needsAuth.md](needsAuth.md))
- Updated TypeScript client signatures/types for `/schedule/weeks` and `/subathon/years` detailed mode ([clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))


## [29.03.2026]

### Added

- Added deepwiki badge to README ([README.md](README.md)) 

## [19.03.2026]

## Added

- Added deepwiki steer config ([.devin/wiki.json](.devin/wiki.json))

### Changed

- Fixed npm package name mispelling ([clients/README.md](clients/README.md); [clients/TypeScript-JavaScript/README.md](clients/TypeScript-JavaScript/README.md))

## [16.03.2026]

### Changed

- Corrected `/twitch/vod` docs: `streamId` is required; updated error status sections ([twitch.md](twitch.md); [quickInfo.md](quickInfo.md))
- Corrected `/subathon/current` success response to array format and clarified behavior ([subathon.md](subathon.md))
- Clarified effective page size behavior for `/schedule/search` `limit` parameter ([schedule.md](schedule.md))
- Added missing schedule search error codes `SC3` and `SC4` to error code reference ([errors.md](errors.md))
- Updated response format wording to reflect endpoint-specific success payloads ([README.md](README.md); [errors.md](errors.md))
- Added full WebSocket `invalid.reason` value list ([websocket.md](websocket.md))
- Synced TypeScript client VOD method to current API (`streamId` required, removed latest-VOD shortcut) ([clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [08.03.2026]

### Added

- Added `/schedule/search` endpoint docs & JS/TS client method ([schedule.md](schedule.md); [clients/README.md](clients/TypeScript-JavaScript/README.md); [NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))
- Added new NPM package info to clients docs ([clients/README.md](clients/TypeScript-JavaScript/README.md))

### Changed

- Updated calendar week of oldest schedule in schedule docs ([schedule.md](schedule.md))

## [04.03.2026]

### Added

- Added WebSocket API docs for ticket flow, handshake auth, events, message format, and errors ([websocket.md](websocket.md))

### Changed

- Updated quick reference with WebSocket endpoints and event overview ([quickInfo.md](quickInfo.md))
- Updated authentication overview with WebSocket ticket/auth requirements ([needsAuth.md](needsAuth.md))
- Updated docs index with WebSocket API section ([README.md](README.md))
- Updated error documentation with WebSocket handshake/message error behavior ([errors.md](errors.md))
- TS-Client docs: Added WebSocket client usage and event list ([clients/README.md](clients/README.md))
- TS-Client: Moved client files to new "TypeScript-JavaScript" subfolder (changed structure) ([clients/README.md](clients/README.md); [NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))
- Clients: Added Client as JS with type definitions and WebSocket support ([NeuroInfoAPI-Client.js](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.js), [NeuroInfoAPI-Client.d.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.d.ts))


## [19.02.2026]

### Changed

- Updated some descriptions & comments in the TS client ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [27.12.2025]

### Changed

- TS-Client: Fixed type of startedAt in TwitchStreamData interface ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [26.12.2025]

### Added

- TS-Client: Added forgotten method for subathon years endpoint([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## Changed

- TS-Client: Updated method descriptions ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [24.12.2025]

### Added

- TS-Client: Added better error handling ([clients/README.md](clients/README.md); [NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))
- TS-Client: Added event system ([clients/README.md](clients/README.md); [NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [08.12.2025]

### Added

- Added 'hasActiveSubathon' as an get latest schedule property ([schedule.md](schedule.md))
- TS-Client: Added 'hasActiveSubathon' ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [07.12.2025]

### Added

- Added subathon year list endpoint docs ([subathon.md](subathon.md))

## [20.10.2025]

### Added

- Added 'canceled' as an day type value  ([schedule.md](schedule.md))
- TS-Client: Added 'canceled' to type ScheduleEntry ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [22.09.2025]

### Added

- Added Schedule response properties + isFinal property ([schedule.md](schedule.md))
- TS-Client: Added isFinal property to ScheduleResponse interface ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [17.09.2025]

### Added

- Added Changelog file ([CHANGELOG.md](CHANGELOG.md))

## [03.09.2025]

### Added

- Added Missing endpoint infos ([needsAuth.md](needsAuth.md); [schedule.md](schedule.md))
- Added Error testing docs ([errors.md](errors.md))

### Changed

- Updated schedule docs ([schedule.md](schedule.md))

## [20.08.2025]

### Added

- Added docs for new endpoint for devstream times ([quickInfo.md](quickInfo.md); [schedule.md](schedule.md))

### Removed

- Removed redundant text ([schedule.md](schedule.md); [subathon.md](subathon.md); [twitch.md](twitch.md))

## [18.08.2025]

### Changed

- Fixed examples ([twitch.md](twitch.md))
- TS-Client: Fixed typo ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [17.08.2025]

### Changed

- TS-Client: Made Axios Instance public ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts))

## [15.08.2025]

### Added

- Added TS client & docs ([NeuroInfoAPI-Client.ts](clients/TypeScript-JavaScript/NeuroInfoAPI-Client.ts); [clients/README.md](clients/README.md); [README.md](README.md))

