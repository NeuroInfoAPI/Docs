const apiVersion = "v2";
const defaultApiBaseUrl = `neuro.appstun.net/api/${apiVersion}`;
function invokeSafely(callback, ...args) {
    try {
        const result = callback(...args);
        if (result && typeof result.then === "function")
            void Promise.resolve(result).catch(() => { });
    }
    catch { }
}
function clearTimeoutHandle(handle) {
    if (handle != null)
        clearTimeout(handle);
    return null;
}
function clearIntervalHandle(handle) {
    if (handle != null)
        clearInterval(handle);
    return null;
}
function createClientUrls(apiBaseUrl = defaultApiBaseUrl, useTls) {
    const protocol = apiBaseUrl.match(/^(https?|wss?):\/\//i)?.[1]?.toLowerCase();
    if (protocol)
        console.warn("[NeuroInfoAPI] Protocols in apiBaseUrl are deprecated and will stop being supported in a future major version. Remove the protocol and use useTls instead.");
    const base = apiBaseUrl.replace(/^(?:https?|wss?):\/\//i, "").replace(/^\/+|\/+$/g, "");
    if (!base || /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(base) || /[?#]/.test(base))
        throw new TypeError("apiBaseUrl must contain a host and API path without query or hash");
    const tls = useTls ?? (protocol ? protocol.endsWith("s") : true);
    return { api: `${tls ? "https" : "http"}://${base}`, websocket: `${tls ? "wss" : "ws"}://${base}/ws` };
}
function deriveApiUrl(websocketUrl) {
    const url = new URL(websocketUrl);
    url.protocol = url.protocol === "ws:" ? "http:" : "https:";
    url.pathname = url.pathname.replace(/\/ws(?:\/.*)?$/, "");
    url.search = url.hash = "";
    return url.toString().replace(/\/+$/, "");
}
// Boot check: fires once and warns when this client no longer targets the current public API version.
let bootCheckFired = false;
async function bootCheck(baseUrlOrApiBase, clientApiVer = apiVersion) {
    if (bootCheckFired)
        return;
    bootCheckFired = true;
    try {
        const infoUrl = `${baseUrlOrApiBase.replace(/\/api\/v\d+.*$/, "/api")}/info`;
        const resp = await fetch(infoUrl);
        if (!resp.ok)
            return;
        const json = await resp.json();
        const latestVersion = typeof json?.data?.latestVersion === "string" ? json.data.latestVersion : null;
        const currentVersionInfo = json?.data?.versions?.[clientApiVer];
        const latestVersionInfo = latestVersion ? json?.data?.versions?.[latestVersion] : undefined;
        const currentStatus = currentVersionInfo?.status;
        if (latestVersion && latestVersion !== clientApiVer) {
            switch (currentStatus) {
                case "deprecated":
                    const parsedSunsetDate = currentVersionInfo?.sunset ? new Date(currentVersionInfo.sunset) : null;
                    const sunsetDate = parsedSunsetDate && Number.isFinite(parsedSunsetDate.getTime()) ? parsedSunsetDate : null;
                    console.warn(`\x1b[33m[NeuroInfoAPI] API ${clientApiVer} is deprecated and will be turned off${sunsetDate ? ` on ${sunsetDate.toISOString()}` : ""}.\x1b[0m`);
                    break;
                case "removed":
                    console.warn(`\x1b[31m[NeuroInfoAPI] API ${clientApiVer} is no longer available. Please update to the latest version.${latestVersionInfo?.docsUrl ? ` See ${latestVersionInfo.docsUrl}` : ""}\x1b[0m`);
                    break;
                default:
                    console.warn(`\x1b[33m[NeuroInfoAPI] API ${clientApiVer} is not the latest version. The latest version is ${latestVersion}.\x1b[0m`);
                    break;
            }
        }
    }
    catch {
        // Silently ignore — boot check is non-critical
    }
}
export class HttpRequestError extends Error {
    constructor(message, status, data) {
        super(message);
        this.status = status;
        this.data = data;
        this.name = "HttpRequestError";
    }
}
/**
 * Lightweight fetch wrapper with configurable defaults.
 */
export class HttpClient {
    constructor(options = {}) {
        const timeout = options.timeout == null || !Number.isFinite(options.timeout) || options.timeout < 0 ? 10000 : options.timeout;
        this.config = { baseURL: options.baseURL ?? "", timeout, headers: options.headers ?? {} };
    }
    /** @deprecated Use `new HttpClient(options)` instead. */
    static create(options = {}) {
        return new HttpClient(options);
    }
    async request(url, options = {}) {
        const fullUrl = this.buildUrl(url, options.query);
        const controller = options.signal ? null : new AbortController();
        const signal = options.signal ?? controller.signal;
        const timeoutId = controller ? setTimeout(() => controller.abort(), this.config.timeout) : null;
        const method = options.method ?? "GET";
        try {
            const response = await fetch(fullUrl, { method, headers: { ...this.config.headers, ...options.headers }, signal });
            let data;
            try {
                data = await response.json();
            }
            catch (error) {
                if (signal.aborted || (error instanceof Error && error.name === "AbortError"))
                    throw new HttpRequestError(options.signal ? "Request aborted" : "Request timeout");
                if (response.ok && method.toUpperCase() !== "HEAD" && response.status !== 204 && response.status !== 205)
                    throw new HttpRequestError("Invalid JSON response", response.status);
                data = undefined;
            }
            if (!response.ok)
                throw new HttpRequestError(`Request failed with status ${response.status}`, response.status, data);
            return data;
        }
        catch (error) {
            if (error instanceof HttpRequestError)
                throw error;
            if (error instanceof Error && error.name === "AbortError")
                throw new HttpRequestError(options.signal ? "Request aborted" : "Request timeout");
            throw new HttpRequestError(error instanceof Error ? error.message : "Network error");
        }
        finally {
            clearTimeoutHandle(timeoutId);
        }
    }
    buildUrl(path, query) {
        const isAbsoluteUrl = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path);
        let url;
        try {
            if (isAbsoluteUrl)
                url = new URL(path);
            else {
                const base = this.config.baseURL.replace(/\/+$/, "");
                if (base) {
                    const relativePath = path.startsWith("/") ? path : `/${path}`;
                    url = new URL(`${base}${relativePath}`);
                }
                else if (typeof location !== "undefined")
                    url = new URL(path, location.origin);
                else
                    throw new HttpRequestError("A baseURL is required for relative request URLs");
            }
        }
        catch (error) {
            if (error instanceof HttpRequestError)
                throw error;
            throw new HttpRequestError(`Invalid request URL: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (query)
            for (const [key, value] of Object.entries(query))
                if (value !== undefined && value !== null)
                    url.searchParams.set(key, String(value));
        return url.toString();
    }
}
/**
 * Custom error class for API errors with code and status information.
 */
export class NeuroApiError extends Error {
    constructor(code, message, status, timestamp, path) {
        super(message);
        this.code = code;
        this.status = status;
        this.timestamp = timestamp;
        this.path = path;
        this.name = "NeuroApiError";
    }
}
/**
 * Client for interacting with the NeuroInfo API.
 * Provides methods to fetch stream data, VODs, schedules, and subathon information.
 */
export class NeuroInfoApiClient {
    /**
     * Creates a new API client instance.
     * @param token - Optional authentication token
     * @param options - Optional configuration options
     */
    constructor(token = undefined, options = {}) {
        this.apiToken = null;
        /**
         * Fetches the current stream data.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#current-stream-status-1
         */
        this.getCurrentStream = () => this.request("/twitch/stream");
        /**
         * Fetches all VODs (Video on Demand).
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#all-vods-1
         */
        this.getAllVods = () => this.request("/twitch/vods");
        /**
         * Fetches a specific VOD by stream ID.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#specific-vod-1
         */
        this.getVod = (id) => this.request("/twitch/vod", { id });
        /**
         * Fetches the schedule for a specific week and year.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#specific-weekly-schedule-1
         */
        this.getSchedule = (week, year) => this.request("/schedule", { week, ...(year !== undefined ? { year } : {}) });
        /**
         * Fetches the latest weekly schedule.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#latest-weekly-schedule-1
         */
        this.getLatestSchedule = () => this.request("/schedule/latest");
        /**
         * Fetches available schedule week numbers grouped by year.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#schedule-weeks-index-1
         */
        this.getScheduleWeeks = () => this.request("/schedule/weeks");
        /**
         * Fetches the devstream schedule times.
         */
        this.getDevstreamTimes = () => this.request("/devstream/times");
        /**
         * Searches schedule entries by message text with optional filters and cursor pagination.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#search-weekly-schedules
         */
        this.getScheduleSearch = (query, options) => {
            const params = { query, limit: options?.limit, year: options?.year, sort: options?.sort, type: options?.type };
            if (options?.cursor) {
                params.cursorYear = options.cursor.year;
                params.cursorWeek = options.cursor.week;
            }
            return this.request("/schedule/search", params);
        };
        /**
         * Fetches the current active subathons.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#current-subathon-1
         */
        this.getCurrentSubathons = () => this.request("/subathon");
        /**
         * Fetches subathon data for a specific year.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#subathon-data-specific-year-1
         */
        this.getSubathon = (year) => this.request("/subathon", { year });
        /**
         * Fetches the years for which subathon data is available.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#subathon-years-1
         */
        this.getSubathonYears = () => this.request("/subathon/years");
        /**
         * Fetches the Neuro-sama blog feed. Requires an API token.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/blog.md#endpoint
         */
        this.getBlogFeed = (raw = false) => this.request("/blog", raw ? { raw: true } : undefined);
        /**
         * Fetches the cached X feed for one of the supported accounts. Requires an API token.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/x-feed.md#endpoint
         */
        this.getXFeed = (user) => this.request("/x-feed", { user });
        const apiUrl = options.apiBaseUrl != null ? createClientUrls(options.apiBaseUrl, options.useTls).api : (options.baseUrl ?? createClientUrls().api);
        this.apiInstance = new HttpClient({ baseURL: apiUrl, timeout: options.requestTimeoutMs, headers: { "Content-Type": "application/json" } });
        if (token != null)
            this.setApiToken(token);
        bootCheck(apiUrl);
    }
    /**
     * Parses an error into a NeuroApiError with proper code and message.
     */
    parseError(error) {
        if (error instanceof HttpRequestError) {
            const apiError = error.data?.error;
            if (apiError?.code && apiError?.message) {
                return new NeuroApiError(apiError.code, apiError.message, error.status, typeof apiError.timestamp === "number" ? apiError.timestamp : undefined, typeof apiError.path === "string" ? apiError.path : undefined);
            }
            if (error.status == null)
                return new NeuroApiError("NETWORK", error.message || "Network error");
            return new NeuroApiError("HTTP_ERROR", `Request failed with status ${error.status}`, error.status);
        }
        return new NeuroApiError("UNKNOWN", String(error));
    }
    /** Sets the API token for authentication. Pass `null` to remove the token. */
    setApiToken(token) {
        this.apiToken = token;
    }
    /** Generic request wrapper that handles errors consistently. */
    async request(url, params) {
        try {
            const response = await this.apiInstance.request(url, {
                ...(params !== undefined ? { query: params } : {}),
                ...(this.apiToken != null ? { headers: { Authorization: `Bearer ${this.apiToken}` } } : {}),
            });
            // Unwrap { data: T } response envelope
            const data = response && typeof response === "object" && "data" in response ? response.data : response;
            return { data: data, error: null };
        }
        catch (error) {
            return { data: null, error: this.parseError(error) };
        }
    }
}
/**
 * Event-based wrapper for the NeuroInfo API.
 * Automatically polls the API at regular intervals and emits events when data changes.
 * Supports events: streamOnline, streamOffline, streamUpdate, scheduleUpdate, subathonUpdate, subathonGoalUpdate.
 * @deprecated The WebSocket client provides a more efficient and real-time way to receive updates. Consider using NeuroInfoApiWebsocketClient instead for new implementations.
 */
export class NeuroInfoApiEventer {
    /** Interval in milliseconds between event fetches. Default is 60000 (60 seconds). Minimum is 10000 (10 seconds). */
    get fetchInterval() {
        return this.events.loop.intervalMs;
    }
    set fetchInterval(value) {
        if (!Number.isFinite(value))
            return;
        const interval = Math.max(value, 10000);
        if (this.events.loop.intervalMs === interval)
            return;
        this.events.loop.intervalMs = interval;
        if (this.events.loop.timer != null) {
            clearIntervalHandle(this.events.loop.timer);
            this.events.loop.timer = setInterval(() => void this.processEvents(), this.events.loop.intervalMs);
        }
    }
    constructor() {
        this.client = new NeuroInfoApiClient();
        this.events = { listeners: new Map(), cache: {}, loop: { timer: null, processing: false, intervalMs: 60000 } };
        console.warn("NeuroInfoApiEventer is deprecated. Please use NeuroInfoApiWebsocketClient for real-time updates instead.");
    }
    async processEvents() {
        if (this.events.loop.processing)
            return;
        this.events.loop.processing = true;
        try {
            const events = new Set(this.events.listeners.keys());
            const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            const needsStream = events.has("streamOnline") || events.has("streamOffline") || events.has("streamUpdate");
            const needsSchedule = events.has("scheduleUpdate");
            const needsSubathon = events.has("subathonUpdate") || events.has("subathonGoalUpdate");
            const strResult = needsStream ? await this.client.getCurrentStream() : null;
            if (needsSchedule && needsStream)
                await delay(100);
            const scheResult = needsSchedule ? await this.client.getLatestSchedule() : null;
            if (needsSubathon && (needsStream || needsSchedule))
                await delay(100);
            const subResult = needsSubathon ? await this.client.getCurrentSubathons() : null;
            // The REST endpoint reports an empty active-subathon set as SB1/404. For
            // polling transitions this is a valid empty state, not a fetch failure.
            const subData = subResult?.data ?? (subResult?.error.code === "SB1" ? [] : null);
            const emitError = (listeners, error) => listeners.forEach((entry) => {
                if (entry.onError)
                    invokeSafely(entry.onError, error);
            });
            const emit = (listeners, data) => listeners.forEach((entry) => invokeSafely(entry.callback, data));
            const hasChanged = (cached, current) => !cached || JSON.stringify(cached) !== JSON.stringify(current);
            for (const [event, listeners] of this.events.listeners) {
                switch (event) {
                    case "streamOnline":
                    case "streamOffline":
                    case "streamUpdate": {
                        if (!strResult?.data) {
                            if (strResult?.error)
                                emitError(listeners, strResult.error);
                            break;
                        }
                        const cached = this.events.cache.streamData;
                        let shouldEmit = false;
                        if (event === "streamOnline")
                            shouldEmit = cached?.isLive !== true && strResult.data.isLive;
                        else if (event === "streamOffline")
                            shouldEmit = cached?.isLive === true && !strResult.data.isLive;
                        else
                            shouldEmit = cached != null && cached.isLive === strResult.data.isLive && hasChanged(cached, strResult.data);
                        if (shouldEmit)
                            emit(listeners, strResult.data);
                        break;
                    }
                    case "scheduleUpdate": {
                        if (!scheResult?.data) {
                            if (scheResult?.error)
                                emitError(listeners, scheResult.error);
                            break;
                        }
                        if (hasChanged(this.events.cache.latestSchedule, scheResult.data))
                            emit(listeners, scheResult.data);
                        break;
                    }
                    case "subathonUpdate": {
                        if (!subData) {
                            if (subResult?.error)
                                emitError(listeners, subResult.error);
                            break;
                        }
                        const cached = this.events.cache.currentSubathons;
                        for (const sub of subData) {
                            const cachedSub = cached?.find((s) => s.year === sub.year);
                            if (hasChanged(cachedSub, sub))
                                emit(listeners, sub);
                        }
                        if (cached)
                            for (const cachedSub of cached)
                                if (!subData.find((s) => s.year === cachedSub.year))
                                    emit(listeners, { ...cachedSub, isActive: false });
                        break;
                    }
                    case "subathonGoalUpdate": {
                        if (!subData) {
                            if (subResult?.error)
                                emitError(listeners, subResult.error);
                            break;
                        }
                        const cached = this.events.cache.currentSubathons;
                        for (const sub of subData) {
                            const cachedSub = cached?.find((s) => s.year === sub.year);
                            for (const goalNumber in sub.goals) {
                                const goal = sub.goals[goalNumber];
                                if (hasChanged(cachedSub?.goals[goalNumber], goal))
                                    emit(listeners, { subathon: sub, goal, goalNumber: Number(goalNumber) });
                            }
                        }
                        break;
                    }
                }
            }
            if (strResult?.data != null)
                this.events.cache.streamData = strResult.data;
            if (scheResult?.data != null)
                this.events.cache.latestSchedule = scheResult.data;
            if (subData)
                this.events.cache.currentSubathons = subData;
        }
        finally {
            this.events.loop.processing = false;
        }
    }
    /** Starts the event loop that fetches events at regular intervals. */
    startEventLoop() {
        if (this.events.loop.timer != null)
            return;
        void this.processEvents();
        this.events.loop.timer = setInterval(() => void this.processEvents(), this.fetchInterval);
    }
    /** Stops the event loop that fetches events at regular intervals. */
    stopEventLoop() {
        this.events.loop.timer = clearIntervalHandle(this.events.loop.timer);
    }
    /** Returns the underlying NeuroInfoApiClient instance. */
    getClient() {
        return this.client;
    }
    /** Sets the API token for authentication. Pass `null` to remove the token. */
    setApiToken(token) {
        this.client.setApiToken(token);
    }
    /**
     * Registers an event listener for the specified event.
     *
     * @param event - The event name to listen for.
     * @param callback - The callback function to be invoked when the event is emitted.
     * @param onError - (Optional) The callback function to be invoked when an error occurs.
     * @returns A function to unsubscribe from the event.
     */
    on(event, callback, onError) {
        if (!this.events.listeners.has(event))
            this.events.listeners.set(event, new Set());
        const entry = { callback, ...(onError !== undefined ? { onError } : {}) };
        this.events.listeners.get(event).add(entry);
        return () => {
            const listeners = this.events.listeners.get(event);
            if (listeners?.delete(entry) && listeners.size === 0)
                this.events.listeners.delete(event);
        };
    }
    /**
     * Removes an event listener for the specified event.
     *
     * @param event - The event name to remove the listener from.
     * @param callback - The callback function to remove.
     */
    off(event, callback) {
        const listeners = this.events.listeners.get(event);
        if (listeners) {
            for (const entry of listeners) {
                if (entry.callback === callback) {
                    listeners.delete(entry);
                    if (listeners.size === 0)
                        this.events.listeners.delete(event);
                    break;
                }
            }
        }
    }
    /**
     * Registers a one-time event listener for the specified event.
     * The listener will be automatically removed after it is invoked once.
     *
     * @param event - The event name to listen for.
     * @param callback - The callback function to be invoked when the event is emitted.
     * @param onError - (Optional) The callback function to be invoked when an error occurs.
     * @returns A function to unsubscribe from the event.
     */
    once(event, callback, onError) {
        const unsubscribe = this.on(event, ((data) => {
            unsubscribe();
            return callback(data);
        }), onError
            ? (error) => {
                unsubscribe();
                return onError(error);
            }
            : undefined);
        return unsubscribe;
    }
    /**
     * Emits an event with the specified data to all registered listeners.
     *
     * @param event - The event name to emit.
     * @param data - The data to pass to the event listeners.
     */
    emit(event, data) {
        const listeners = this.events.listeners.get(event);
        if (!listeners)
            return;
        listeners.forEach((entry) => invokeSafely(entry.callback, data));
    }
    /**
     * Removes all event listeners for a specific event or all events.
     *
     * @param event - (Optional) The event name to remove all listeners from.
     *                If not provided, removes all listeners for all events.
     */
    removeAllListeners(event) {
        if (event) {
            this.events.listeners.delete(event);
        }
        else {
            this.events.listeners.clear();
        }
    }
}
/**
 * WebSocket client for the NeuroInfo API with automatic reconnection.
 * Provides real-time event subscriptions for stream, feed, schedule, and subathon updates.
 *
 * By default uses ticket-based authentication: the client fetches a one-time ticket via
 * REST API before connecting, so the token is never exposed in URL query parameters.
 */
export class NeuroInfoApiWebsocketClient {
    /** Whether to automatically reconnect on disconnect. Default is true. */
    get autoReconnect() {
        return this.settings.autoReconnect;
    }
    set autoReconnect(value) {
        this.settings.autoReconnect = value;
        if (!value) {
            this.clearReconnectTimeout();
            const connection = this.connection;
            if (connection?.isAutomaticReconnect && connection.sessionId == null)
                this.disconnect();
        }
    }
    /** Whether to automatically send heartbeat pings while connected. Default is true. */
    get autoHeartbeat() {
        return this.settings.autoHeartbeat;
    }
    set autoHeartbeat(value) {
        if (this.settings.autoHeartbeat === value)
            return;
        this.settings.autoHeartbeat = value;
        const connection = this.connection;
        if (!connection || !this.isConnected)
            return;
        if (value)
            this.startHeartbeat(connection);
        else
            this.stopHeartbeat(connection);
    }
    /** Maximum number of reconnect attempts. Default is 10. Set to 0 for unlimited. */
    get maxReconnectAttempts() {
        return this.settings.maxReconnectAttempts;
    }
    set maxReconnectAttempts(value) {
        if (Number.isFinite(value))
            this.settings.maxReconnectAttempts = Math.max(0, value);
    }
    /** Base delay in milliseconds for reconnection backoff. Default is 1000ms. */
    get reconnectBaseDelay() {
        return this.settings.reconnectBaseDelay;
    }
    set reconnectBaseDelay(value) {
        if (Number.isFinite(value))
            this.settings.reconnectBaseDelay = Math.max(100, value);
    }
    /** Interval in milliseconds for heartbeat pings. Default is 30000ms. Minimum is 5000ms. */
    get heartbeatIntervalMs() {
        return this.settings.heartbeatIntervalMs;
    }
    set heartbeatIntervalMs(value) {
        if (!Number.isFinite(value))
            return;
        const interval = Math.max(5000, value);
        if (this.settings.heartbeatIntervalMs === interval)
            return;
        this.settings.heartbeatIntervalMs = interval;
        const connection = this.connection;
        const heartbeat = connection?.heartbeat;
        if (connection && heartbeat)
            this.scheduleHeartbeatInterval(connection, heartbeat);
    }
    /** Timeout in milliseconds waiting for a heartbeat pong. Default is 10000ms. Minimum is 1000ms. */
    get heartbeatTimeoutMs() {
        return this.settings.heartbeatTimeoutMs;
    }
    set heartbeatTimeoutMs(value) {
        if (!Number.isFinite(value))
            return;
        const timeout = Math.max(1000, value);
        if (this.settings.heartbeatTimeoutMs === timeout)
            return;
        this.settings.heartbeatTimeoutMs = timeout;
        const connection = this.connection;
        const heartbeat = connection?.heartbeat;
        if (connection && heartbeat?.timeout != null)
            this.scheduleHeartbeatTimeout(connection, heartbeat);
    }
    /** Timeout in milliseconds for ticket fetching and the WebSocket welcome. Default is 15000ms. Minimum is 1000ms. */
    get connectTimeoutMs() {
        return this.settings.connectTimeoutMs;
    }
    set connectTimeoutMs(value) {
        if (Number.isFinite(value))
            this.settings.connectTimeoutMs = Math.max(1000, value);
    }
    /**
     * Creates a new WebSocket client instance.
     * @param token - Authentication token (required for connection)
     * @param options - Optional configuration options
     */
    constructor(token, options = {}) {
        this.connection = null;
        this.listeners = { events: new Map(), system: new Map() };
        this.reconnect = { attempts: 0, timeout: null };
        this.lifecycle = { intentionallyClosed: false, destroyGeneration: 0 };
        this.settings = { autoReconnect: true, autoHeartbeat: true, maxReconnectAttempts: 10, reconnectBaseDelay: 1000, heartbeatIntervalMs: 30000, heartbeatTimeoutMs: 10000, connectTimeoutMs: 15000 };
        this.auth = { token, method: options.authMethod ?? "ticket" };
        const legacyWebsocketUrl = options.websocketUrl ?? options.baseUrl;
        this.urls = legacyWebsocketUrl
            ? {
                api: options.apiBaseUrl != null ? createClientUrls(options.apiBaseUrl, options.useTls).api : deriveApiUrl(legacyWebsocketUrl),
                websocket: legacyWebsocketUrl,
            }
            : createClientUrls(options.apiBaseUrl, options.useTls);
        if (options.autoReconnect != null)
            this.autoReconnect = options.autoReconnect;
        if (options.autoHeartbeat != null)
            this.autoHeartbeat = options.autoHeartbeat;
        if (options.maxReconnectAttempts != null)
            this.maxReconnectAttempts = options.maxReconnectAttempts;
        if (options.reconnectBaseDelay != null)
            this.reconnectBaseDelay = options.reconnectBaseDelay;
        if (options.heartbeatIntervalMs != null)
            this.heartbeatIntervalMs = options.heartbeatIntervalMs;
        if (options.heartbeatTimeoutMs != null)
            this.heartbeatTimeoutMs = options.heartbeatTimeoutMs;
        if (options.connectTimeoutMs != null)
            this.connectTimeoutMs = options.connectTimeoutMs;
        bootCheck(this.urls.api);
    }
    /** Returns the current connection state. */
    get readyState() {
        return this.connection?.socket?.readyState ?? 3 /* WebSocketState.Closed */;
    }
    /** Returns true if the WebSocket is connected and ready. */
    get isConnected() {
        return this.connection?.socket?.readyState === 1 /* WebSocketState.Open */ && this.connection.sessionId != null;
    }
    /** Returns the current session ID (available after connection). */
    getSessionId() {
        return this.connection?.sessionId ?? null;
    }
    /** Updates the authentication token. Reconnects if currently connected. */
    setToken(token) {
        const shouldReconnect = this.connection?.socket != null || this.connection?.connect?.promise != null;
        const destroyGeneration = this.lifecycle.destroyGeneration;
        this.auth.token = token;
        if (shouldReconnect) {
            this.disconnect();
            if (this.lifecycle.destroyGeneration !== destroyGeneration)
                return;
            void this.connect().catch((error) => {
                const parsed = error instanceof NeuroApiError ? error : new NeuroApiError("WS_RECONNECT_ERROR", String(error));
                this.emitSystem("_error", parsed);
            });
        }
    }
    /** Alias matching the HTTP client token setter. */
    setApiToken(token) {
        this.setToken(token);
    }
    /**
     * Connects to the WebSocket server.
     * Uses the configured `authMethod` to authenticate.
     * @returns Promise that resolves when connected, rejects on error.
     */
    connect() {
        return this.connectWithContext(false);
    }
    /** Starts either a user-requested or automatic reconnect attempt. */
    connectWithContext(isAutomaticReconnect) {
        const currentConnection = this.connection;
        if (currentConnection?.socket?.readyState === 1 /* WebSocketState.Open */ ||
            currentConnection?.socket?.readyState === 0 /* WebSocketState.Connecting */)
            return currentConnection.connect?.promise || Promise.resolve();
        if (currentConnection?.connect?.promise)
            return currentConnection.connect.promise;
        if (!isAutomaticReconnect) {
            // A user-requested connection starts a fresh retry cycle after a previous exhaustion.
            this.reconnect.attempts = 0;
        }
        this.lifecycle.intentionallyClosed = false;
        this.clearReconnectTimeout();
        const connect = { promise: null, abortController: new AbortController(), timeout: null, abortError: new NeuroApiError("WS_CONNECT_CANCELLED", "WebSocket connection was cancelled"), onAbort: () => { } };
        const connection = { socket: null, sessionId: null, connect, heartbeat: null, isAutomaticReconnect };
        this.connection = connection;
        const cancelled = new Promise((_, reject) => {
            connect.onAbort = () => reject(connect.abortError);
        });
        connect.abortController.signal.addEventListener("abort", connect.onAbort, { once: true });
        connect.timeout = setTimeout(() => {
            connect.timeout = null;
            connect.abortError = new NeuroApiError("WS_CONNECT_TIMEOUT", "WebSocket connection timed out");
            connect.abortController.abort();
            if (this.connection !== connection || this.lifecycle.intentionallyClosed)
                return;
            this.connection = null;
            connection.connect = null;
            this.stopHeartbeat(connection);
            const socket = connection.socket;
            if (socket) {
                if (socket.readyState !== 2 /* WebSocketState.Closing */ && socket.readyState !== 3 /* WebSocketState.Closed */)
                    socket.close(4000, "Connection timeout");
                this.emitSystem("_disconnected", 4000, "Connection timeout");
                if (!this.lifecycle.intentionallyClosed && this.autoReconnect)
                    this.scheduleReconnect();
            }
        }, this.connectTimeoutMs);
        const promise = Promise.race([this.connectInternal(connection, connect), cancelled]);
        connect.promise = promise;
        promise.then(() => {
            connect.timeout = clearTimeoutHandle(connect.timeout);
            connect.abortController.signal.removeEventListener("abort", connect.onAbort);
            if (this.connection === connection)
                connection.connect = null;
        }, () => {
            connect.timeout = clearTimeoutHandle(connect.timeout);
            connect.abortController.signal.removeEventListener("abort", connect.onAbort);
            if (this.connection === connection) {
                connection.connect = null;
                if (!connection.socket)
                    this.connection = null;
            }
        });
        return promise;
    }
    async connectInternal(connection, connect) {
        const signal = connect.abortController.signal;
        if (this.auth.method === "header")
            // Send token via Authorization header (Node.js only, not supported in browsers)
            return this.connectWithUrl(this.urls.websocket, connection, connect, { Authorization: `Bearer ${this.auth.token}` });
        else {
            // Fetch one-time ticket via REST API (token never exposed in URL, works in browsers)
            const ticket = await this.fetchTicket(signal);
            if (signal.aborted || this.connection !== connection || this.lifecycle.intentionallyClosed)
                throw new NeuroApiError("WS_CONNECT_CANCELLED", "WebSocket connection was cancelled");
            const websocketUrl = new URL(this.urls.websocket);
            websocketUrl.searchParams.set("ticket", ticket);
            return this.connectWithUrl(websocketUrl.toString(), connection, connect);
        }
    }
    /** Fetches a one-time connection ticket from the API */
    async fetchTicket(signal) {
        try {
            const json = await new HttpClient({ baseURL: this.urls.api }).request("/ws/ticket", {
                headers: { Authorization: `Bearer ${this.auth.token}` },
                signal,
            });
            if (!json.data?.ticket)
                throw new NeuroApiError("TICKET_ERROR", "Invalid ticket response from server");
            return json.data.ticket;
        }
        catch (error) {
            if (signal.aborted)
                throw new NeuroApiError("WS_CONNECT_CANCELLED", "WebSocket connection was cancelled");
            if (error instanceof NeuroApiError)
                throw error;
            const detail = error instanceof HttpRequestError
                ? (error.data?.error?.message ?? error.message)
                : error instanceof Error
                    ? error.message
                    : "Unknown error";
            throw new NeuroApiError("TICKET_ERROR", `Failed to fetch connection ticket: ${detail}`, error instanceof HttpRequestError ? error.status : undefined);
        }
    }
    /** Internal: Connect to WebSocket with the given URL and optional headers */
    connectWithUrl(url, connection, connect, headers) {
        const signal = connect.abortController.signal;
        return new Promise((resolve, reject) => {
            if (signal.aborted || this.connection !== connection || this.lifecycle.intentionallyClosed) {
                reject(new NeuroApiError("WS_CONNECT_CANCELLED", "WebSocket connection was cancelled"));
                return;
            }
            // Pass headers using runtime-compatible constructor variants.
            let socket;
            try {
                const WS = WebSocket;
                if (headers) {
                    try {
                        socket = new WS(url, { headers });
                    }
                    catch {
                        socket = new WS(url, undefined, { headers });
                    }
                }
                else
                    socket = new WS(url);
            }
            catch (error) {
                reject(new NeuroApiError("WS_ERROR", `Failed to create WebSocket: ${error instanceof Error ? error.message : "Unknown error"}`));
                return;
            }
            if (signal.aborted || this.connection !== connection || this.lifecycle.intentionallyClosed) {
                socket.close(1000, "Connection cancelled");
                reject(new NeuroApiError("WS_CONNECT_CANCELLED", "WebSocket connection was cancelled"));
                return;
            }
            connection.socket = socket;
            let settled = false;
            const onMessage = (event) => {
                if (this.connection !== connection || connection.socket !== socket)
                    return;
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "welcome") {
                        this.reconnect.attempts = 0;
                        connection.sessionId = msg.data.sessionId;
                        signal.removeEventListener("abort", onAbort);
                        this.resubscribeEvents();
                        this.startHeartbeat(connection);
                        this.emitSystem("_connected", connection.sessionId);
                        if (this.connection !== connection || connection.socket !== socket)
                            return;
                        if (!settled) {
                            settled = true;
                            resolve();
                        }
                    }
                    this.handleParsedMessage(msg, connection);
                }
                catch {
                    this.emitSystem("_error", new NeuroApiError("WS_PARSE_ERROR", "Failed to parse message"));
                }
            };
            const onError = (error) => {
                if (this.connection !== connection || connection.socket !== socket)
                    return;
                this.emitSystem("_error", error);
                if (!settled) {
                    settled = true;
                    reject(new NeuroApiError("WS_ERROR", "WebSocket connection error"));
                    if (socket.readyState !== 2 /* WebSocketState.Closing */ && socket.readyState !== 3 /* WebSocketState.Closed */)
                        socket.close(1011, "WebSocket connection error");
                }
            };
            const onClose = (event) => {
                cleanup();
                if (!settled) {
                    settled = true;
                    reject(new NeuroApiError("WS_CLOSED", `Connection closed: ${event.reason || "Unknown reason"}`, event.code));
                }
                if (this.connection !== connection || connection.socket !== socket)
                    return;
                this.handleClose(connection, event);
            };
            const cleanup = () => {
                socket.removeEventListener("message", onMessage);
                socket.removeEventListener("error", onError);
                socket.removeEventListener("close", onClose);
                signal.removeEventListener("abort", onAbort);
            };
            const onAbort = () => {
                cleanup();
                if (!settled) {
                    settled = true;
                    reject(new NeuroApiError("WS_CONNECT_CANCELLED", "WebSocket connection was cancelled"));
                }
            };
            socket.addEventListener("message", onMessage);
            socket.addEventListener("error", onError);
            socket.addEventListener("close", onClose);
            signal.addEventListener("abort", onAbort, { once: true });
        });
    }
    /** Disconnects from the WebSocket server. */
    disconnect() {
        this.lifecycle.intentionallyClosed = true;
        this.clearReconnectTimeout();
        const connection = this.connection;
        this.connection = null;
        if (!connection)
            return;
        const connect = connection.connect;
        connection.connect = null;
        connect?.abortController.abort();
        const pendingConnect = connect?.promise;
        void pendingConnect?.catch(() => { });
        this.stopHeartbeat(connection);
        const socket = connection.socket;
        if (socket) {
            if (socket.readyState !== 2 /* WebSocketState.Closing */ && socket.readyState !== 3 /* WebSocketState.Closed */)
                socket.close(1000, "Client disconnect");
            this.emitSystem("_disconnected", 1000, "Client disconnect");
        }
    }
    handleParsedMessage(msg, connection) {
        switch (msg.type) {
            case "event":
                this.handleEventMessage(msg);
                break;
            case "addSuccess":
                {
                    const subscription = this.listeners.events.get(msg.data.eventType);
                    if (!subscription || subscription.state !== "subscribing" /* SubscriptionState.Subscribing */)
                        break;
                    // `false` means the server already had this subscription, which is still the desired state.
                    subscription.state = "subscribed" /* SubscriptionState.Subscribed */;
                    this.emitSystem("_eventAdded", msg.data.eventType);
                    this.syncSubscription(msg.data.eventType, subscription);
                }
                break;
            case "removeSuccess":
                {
                    const subscription = this.listeners.events.get(msg.data.eventType);
                    if (!subscription || subscription.state !== "unsubscribing" /* SubscriptionState.Unsubscribing */)
                        break;
                    // `false` means the server already removed this subscription, which is still the desired state.
                    subscription.state = "unsubscribed" /* SubscriptionState.Unsubscribed */;
                    this.emitSystem("_eventRemoved", msg.data.eventType);
                    this.syncSubscription(msg.data.eventType, subscription);
                }
                break;
            case "invalid":
                this.emitSystem("_error", new NeuroApiError("WS_INVALID", msg.data.message || msg.data.reason));
                break;
            case "pong":
                this.acknowledgeHeartbeat(connection);
                this.emitSystem("_pong");
                break;
        }
        this.emitSystem("_message", msg);
    }
    handleEventMessage(msg) {
        const eventType = msg.data.eventType;
        const subscription = this.listeners.events.get(eventType);
        if (!subscription)
            return;
        subscription.listeners.forEach((entry) => invokeSafely(entry.callback, msg.data.eventData, msg.data.timestamp));
    }
    handleClose(connection, event) {
        if (this.connection !== connection)
            return;
        this.connection = null;
        connection.connect = null;
        this.stopHeartbeat(connection);
        this.emitSystem("_disconnected", event.code, event.reason);
        if (!this.lifecycle.intentionallyClosed && this.autoReconnect)
            this.scheduleReconnect();
    }
    scheduleReconnect() {
        if (this.connection != null)
            return;
        if (this.reconnect.timeout || this.lifecycle.intentionallyClosed || !this.autoReconnect)
            return;
        if (this.reconnect.attempts < 0)
            return; // Negative means the final failure was already emitted.
        if (this.maxReconnectAttempts > 0 && this.reconnect.attempts >= this.maxReconnectAttempts) {
            this.reconnect.attempts = -this.reconnect.attempts;
            this.emitSystem("_reconnectFailed");
            return;
        }
        // Exponential backoff with jitter: baseDelay * 2^attempts + random(0-1000ms)
        const delay = Math.min(this.reconnectBaseDelay * Math.pow(2, this.reconnect.attempts) + Math.random() * 1000, 30000);
        this.reconnect.attempts++;
        const reconnectTimeout = setTimeout(async () => {
            if (this.reconnect.timeout !== reconnectTimeout)
                return;
            this.reconnect.timeout = null;
            if (this.connection != null || this.lifecycle.intentionallyClosed || !this.autoReconnect)
                return;
            try {
                await this.connectWithContext(true);
            }
            catch {
                if (!this.lifecycle.intentionallyClosed && this.autoReconnect)
                    this.scheduleReconnect();
            }
        }, delay);
        this.reconnect.timeout = reconnectTimeout;
        this.emitSystem("_reconnecting", this.reconnect.attempts, delay);
        if (this.connection != null || this.lifecycle.intentionallyClosed || !this.autoReconnect)
            this.clearReconnectTimeout();
    }
    clearReconnectTimeout() {
        this.reconnect.timeout = clearTimeoutHandle(this.reconnect.timeout);
    }
    startHeartbeat(connection) {
        this.stopHeartbeat(connection);
        if (!this.autoHeartbeat || this.connection !== connection)
            return;
        const heartbeat = { interval: null, timeout: null };
        connection.heartbeat = heartbeat;
        this.sendHeartbeatPing(connection, heartbeat);
        this.scheduleHeartbeatInterval(connection, heartbeat);
    }
    scheduleHeartbeatInterval(connection, heartbeat) {
        heartbeat.interval = clearIntervalHandle(heartbeat.interval);
        if (this.connection !== connection || connection.heartbeat !== heartbeat || !this.autoHeartbeat)
            return;
        heartbeat.interval = setInterval(() => this.sendHeartbeatPing(connection, heartbeat), this.heartbeatIntervalMs);
    }
    stopHeartbeat(connection) {
        const heartbeat = connection.heartbeat;
        if (!heartbeat)
            return;
        connection.heartbeat = null;
        heartbeat.interval = clearIntervalHandle(heartbeat.interval);
        heartbeat.timeout = clearTimeoutHandle(heartbeat.timeout);
    }
    sendHeartbeatPing(connection, heartbeat) {
        const socket = connection.socket;
        if (this.connection !== connection || connection.heartbeat !== heartbeat || socket?.readyState !== 1 /* WebSocketState.Open */)
            return;
        if (heartbeat.timeout != null)
            return;
        this.scheduleHeartbeatTimeout(connection, heartbeat);
        this.sendPing(connection);
    }
    scheduleHeartbeatTimeout(connection, heartbeat) {
        heartbeat.timeout = clearTimeoutHandle(heartbeat.timeout);
        const socket = connection.socket;
        if (this.connection !== connection || connection.heartbeat !== heartbeat || socket?.readyState !== 1 /* WebSocketState.Open */)
            return;
        heartbeat.timeout = setTimeout(() => {
            heartbeat.timeout = null;
            if (this.connection !== connection || connection.heartbeat !== heartbeat || socket.readyState !== 1 /* WebSocketState.Open */)
                return;
            this.emitSystem("_error", new NeuroApiError("WS_HEARTBEAT_TIMEOUT", "Heartbeat pong timeout"));
            socket.close(4002, "Heartbeat timeout");
        }, this.heartbeatTimeoutMs);
    }
    acknowledgeHeartbeat(connection) {
        const heartbeat = connection.heartbeat;
        if (this.connection !== connection || heartbeat?.timeout == null)
            return;
        heartbeat.timeout = clearTimeoutHandle(heartbeat.timeout);
    }
    sendPing(connection) {
        const socket = connection.socket;
        if (this.connection === connection && socket?.readyState === 1 /* WebSocketState.Open */)
            socket.send(JSON.stringify({ type: "ping", data: {} }));
    }
    resubscribeEvents() {
        for (const [eventType, subscription] of this.listeners.events) {
            subscription.state = "unsubscribed" /* SubscriptionState.Unsubscribed */;
            this.syncSubscription(eventType, subscription);
        }
    }
    /** Reconciles one event's server-side subscription with its current listeners. */
    syncSubscription(eventType, subscription) {
        const shouldSubscribe = subscription.listeners.size > 0;
        if (!this.isConnected)
            return;
        if (shouldSubscribe && subscription.state === "unsubscribed" /* SubscriptionState.Unsubscribed */) {
            subscription.state = "subscribing" /* SubscriptionState.Subscribing */;
            this.sendSubscribe(eventType);
            return;
        }
        if (!shouldSubscribe && subscription.state === "subscribed" /* SubscriptionState.Subscribed */) {
            subscription.state = "unsubscribing" /* SubscriptionState.Unsubscribing */;
            this.sendUnsubscribe(eventType);
            return;
        }
        if (!shouldSubscribe && subscription.state === "unsubscribed" /* SubscriptionState.Unsubscribed */)
            this.removeInactiveSubscription(eventType, subscription);
    }
    /** Deletes a local subscription only after the server is known not to hold it. */
    removeInactiveSubscription(eventType, subscription) {
        if (this.listeners.events.get(eventType) === subscription &&
            subscription.listeners.size === 0 &&
            subscription.state === "unsubscribed" /* SubscriptionState.Unsubscribed */)
            this.listeners.events.delete(eventType);
    }
    sendSubscribe(eventType) {
        this.send({ type: "addEvent", data: { eventType } });
    }
    sendUnsubscribe(eventType) {
        this.send({ type: "removeEvent", data: { eventType } });
    }
    send(message) {
        const socket = this.connection?.socket;
        if (this.isConnected && socket)
            socket.send(JSON.stringify(message));
    }
    isEventType(event) {
        return wsEventTypes.has(event);
    }
    on(event, callback) {
        if (this.isEventType(event)) {
            let subscription = this.listeners.events.get(event);
            if (!subscription) {
                subscription = { listeners: new Set(), state: "unsubscribed" /* SubscriptionState.Unsubscribed */ };
                this.listeners.events.set(event, subscription);
            }
            const entry = { callback: callback };
            subscription.listeners.add(entry);
            this.syncSubscription(event, subscription);
            return () => this.removeEventListenerEntry(event, entry);
        }
        if (!this.listeners.system.has(event))
            this.listeners.system.set(event, new Set());
        this.listeners.system.get(event).add(callback);
        return () => this.off(event, callback);
    }
    off(event, callback) {
        if (this.isEventType(event)) {
            const subscription = this.listeners.events.get(event);
            if (!subscription)
                return;
            for (const entry of subscription.listeners) {
                if (entry.callback === callback) {
                    this.removeEventListenerEntry(event, entry);
                    break;
                }
            }
            return;
        }
        const listeners = this.listeners.system.get(event);
        if (listeners?.delete(callback) && listeners.size === 0)
            this.listeners.system.delete(event);
    }
    removeEventListenerEntry(event, entry) {
        const subscription = this.listeners.events.get(event);
        if (!subscription?.listeners.delete(entry) || subscription.listeners.size > 0)
            return;
        // A closed connection cannot retain a server-side subscription, so an empty
        // local entry can be removed without waiting for an acknowledgement.
        if (!this.isConnected)
            subscription.state = "unsubscribed" /* SubscriptionState.Unsubscribed */;
        this.syncSubscription(event, subscription);
        this.removeInactiveSubscription(event, subscription);
    }
    emitSystem(event, ...args) {
        const listeners = this.listeners.system.get(event);
        if (!listeners)
            return;
        listeners.forEach((callback) => invokeSafely(callback, ...args));
    }
    /** Returns a list of currently subscribed event types. */
    getSubscribedEvents() {
        return Array.from(this.listeners.events)
            .filter(([, subscription]) => subscription.state === "subscribed" /* SubscriptionState.Subscribed */)
            .map(([eventType]) => eventType);
    }
    /** Requests the list of available events from the server. */
    requestEventList() {
        this.send({ type: "listEvents", data: {} });
    }
    /** Removes all event listeners and disconnects. */
    destroy() {
        this.lifecycle.destroyGeneration++;
        this.listeners.events.clear();
        this.listeners.system.clear();
        this.disconnect();
    }
}
export var Utils;
(function (Utils) {
    function isScheduleFinal(status) {
        return status === "confirmed";
    }
    Utils.isScheduleFinal = isScheduleFinal;
    function isScheduleEntryOnline(entry) {
        return entry.type === "normal" || entry.type === "TBD";
    }
    Utils.isScheduleEntryOnline = isScheduleEntryOnline;
    function isScheduleEntryOffline(entry) {
        return entry.type === "offline" || entry.type === "canceled";
    }
    Utils.isScheduleEntryOffline = isScheduleEntryOffline;
    function isScheduleEntryUnknown(entry) {
        return entry.type === "unknown";
    }
    Utils.isScheduleEntryUnknown = isScheduleEntryUnknown;
    function hasScheduleImage(entry) {
        return entry.imageUrl !== null && entry.imageUrl.trim() !== "";
    }
    Utils.hasScheduleImage = hasScheduleImage;
})(Utils || (Utils = {}));
const wsEventTypes = new Set([
    "blogFeedUpdate",
    "xFeedNewEntries",
    "xFeedUpdate",
    "scheduleUpdate",
    "subathonUpdate",
    "subathonGoalUpdate",
    "streamOnline",
    "streamUpdate",
    "streamOffline",
    "secretneuroaccountOnline",
    "streamRaidIncoming",
    "streamRaidOutgoing",
]);
/** @deprecated Use `Utils.isScheduleFinal` instead. */
export const isScheduleFinal = Utils.isScheduleFinal;
