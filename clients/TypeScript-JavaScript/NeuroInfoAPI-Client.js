import axios, { isAxiosError } from "axios";
const baseDomain = "neuro.appstun.net";
/**
 * Custom error class for API errors with code and status information.
 */
export class NeuroApiError extends Error {
    constructor(code, message, status) {
        super(message);
        this.code = code;
        this.status = status;
        this.name = "NeuroApiError";
    }
}
/**
 * Client for interacting with the NeuroInfo API.
 * Provides methods to fetch stream data, VODs, schedules, and subathon information.
 */
export class NeuroInfoApiClient {
    constructor() {
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
        this.getVod = (streamId) => this.request("/twitch/vod", { streamId });
        /**
         * Fetches the schedule for a specific year and week. If no parameters are provided, fetches the current week's schedule.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#specific-weekly-schedule-1
         */
        this.getSchedule = (year, week) => this.request("/schedule", year || week ? { year, week } : undefined);
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
         * Searches schedule entries by message text with optional filters and cursor pagination.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#search-weekly-schedules
         */
        this.getScheduleSearch = (query, options) => {
            const params = {
                query,
                limit: options?.limit,
                year: options?.year,
                sort: options?.sort,
                type: options?.type,
            };
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
        this.getCurrentSubathons = () => this.request("/subathon/current");
        /**
         * Fetches subathon data for a specific year.
         * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#subathon-data-specific-year-1
         */
        this.getSubathon = (year) => this.request("/subathon", { year });
        this.apiInstance = axios.create({
            baseURL: `https://${baseDomain}/api/v1`,
            timeout: 10000,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
    /**
     * Parses an error into a NeuroApiError with proper code and message.
     */
    parseError(error) {
        if (isAxiosError(error)) {
            const apiError = error.response?.data?.error;
            if (apiError?.code && apiError?.message)
                return new NeuroApiError(apiError.code, apiError.message, error.response?.status);
            if (!error.response)
                return new NeuroApiError("NETWORK", error.message || "Network error");
            return new NeuroApiError("HTTP_ERROR", `Request failed with status ${error.response.status}`, error.response.status);
        }
        return new NeuroApiError("UNKNOWN", String(error));
    }
    /** Sets the API token for authentication. Pass `null` to remove the token. */
    setApiToken(token) {
        if (token == null)
            delete this.apiInstance.defaults.headers.common["Authorization"];
        else
            this.apiInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    /** Generic request wrapper that handles errors consistently. */
    async request(url, params) {
        try {
            const response = await this.apiInstance.get(url, params ? { params } : undefined);
            return { data: response.data, error: null };
        }
        catch (error) {
            return { data: null, error: this.parseError(error) };
        }
    }
    getSubathonYears(detailed = false) {
        return this.request("/subathon/years", detailed ? { detailed: true } : undefined);
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
        return this._fetchInterval;
    }
    set fetchInterval(value) {
        this._fetchInterval = Math.max(value, 10000);
    }
    constructor() {
        this.eventListeners = new Map();
        this.errorHandlers = new Map();
        this.cached = new Map();
        this.fetchTimeout = null;
        this.isProcessing = false;
        this._fetchInterval = 60000;
        this.client = new NeuroInfoApiClient();
        console.warn("NeuroInfoApiEventer is deprecated. Please use NeuroInfoApiWebsocketClient for real-time updates instead.");
    }
    async processEvents() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            const events = new Set(this.eventListeners.keys());
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
            const emitError = (event, error) => this.errorHandlers.get(event)?.forEach((handler) => handler(error));
            const emit = (listeners, data) => listeners.forEach((entry) => entry.callback(data));
            const hasChanged = (cached, current) => !cached || JSON.stringify(cached) !== JSON.stringify(current);
            for (const [event, listeners] of this.eventListeners) {
                switch (event) {
                    case "streamOnline":
                    case "streamOffline":
                    case "streamUpdate": {
                        if (!strResult?.data) {
                            if (strResult?.error)
                                emitError(event, strResult.error);
                            break;
                        }
                        const cached = this.cached.get("streamData");
                        let shouldEmit = false;
                        if (event === "streamOnline")
                            shouldEmit = !cached?.isLive && strResult.data.isLive;
                        else if (event === "streamOffline")
                            shouldEmit = cached?.isLive && !strResult.data.isLive;
                        else
                            shouldEmit = cached && !(cached?.isLive !== strResult.data.isLive) && hasChanged(cached, strResult.data);
                        if (shouldEmit)
                            emit(listeners, strResult.data);
                        break;
                    }
                    case "scheduleUpdate": {
                        if (!scheResult?.data) {
                            if (scheResult?.error)
                                emitError(event, scheResult.error);
                            break;
                        }
                        if (hasChanged(this.cached.get("latestSchedule"), scheResult.data))
                            emit(listeners, scheResult.data);
                        break;
                    }
                    case "subathonUpdate": {
                        if (!subResult?.data) {
                            if (subResult?.error)
                                emitError(event, subResult.error);
                            break;
                        }
                        const cached = this.cached.get("currentSubathons");
                        for (const sub of subResult.data) {
                            const cachedSub = cached?.find((s) => s.year === sub.year);
                            if (hasChanged(cachedSub, sub))
                                emit(listeners, sub);
                        }
                        if (cached) {
                            for (const cachedSub of cached) {
                                if (!subResult.data.find((s) => s.year === cachedSub.year)) {
                                    emit(listeners, { ...cachedSub, isActive: false });
                                }
                            }
                        }
                        break;
                    }
                    case "subathonGoalUpdate": {
                        if (!subResult?.data) {
                            if (subResult?.error)
                                emitError(event, subResult.error);
                            break;
                        }
                        const cached = this.cached.get("currentSubathons");
                        for (const sub of subResult.data) {
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
            const updateCache = (key, result) => {
                if (result?.data !== undefined && result?.data !== null)
                    this.cached.set(key, result.data);
                else if (result?.error)
                    this.cached.delete(key);
            };
            updateCache("streamData", strResult);
            updateCache("latestSchedule", scheResult);
            updateCache("currentSubathons", subResult);
        }
        finally {
            this.isProcessing = false;
        }
    }
    /** Starts the event loop that fetches events at regular intervals. */
    startEventLoop() {
        if (this.fetchTimeout != null)
            return;
        this.processEvents();
        this.fetchTimeout = setInterval(() => this.processEvents(), this.fetchInterval);
    }
    /** Stops the event loop that fetches events at regular intervals. */
    stopEventLoop() {
        if (this.fetchTimeout == null)
            return;
        clearInterval(this.fetchTimeout);
        this.fetchTimeout = null;
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
        if (!this.eventListeners.has(event))
            this.eventListeners.set(event, new Set());
        const entry = { callback };
        this.eventListeners.get(event).add(entry);
        if (onError) {
            if (!this.errorHandlers.has(event))
                this.errorHandlers.set(event, new Set());
            this.errorHandlers.get(event).add(onError);
        }
        return () => {
            this.eventListeners.get(event)?.delete(entry);
            if (onError)
                this.errorHandlers.get(event)?.delete(onError);
        };
    }
    /**
     * Removes an event listener for the specified event.
     *
     * @param event - The event name to remove the listener from.
     * @param callback - The callback function to remove.
     */
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const entry of listeners) {
                if (entry.callback === callback) {
                    listeners.delete(entry);
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
            callback(data);
        }), onError
            ? (error) => {
                unsubscribe();
                onError(error);
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
        const listeners = this.eventListeners.get(event);
        if (!listeners)
            return;
        listeners.forEach((entry) => {
            try {
                entry.callback(data);
            }
            catch (error) { }
        });
    }
    /**
     * Removes all event listeners for a specific event or all events.
     *
     * @param event - (Optional) The event name to remove all listeners from.
     *                If not provided, removes all listeners for all events.
     */
    removeAllListeners(event) {
        if (event) {
            this.eventListeners.delete(event);
            this.errorHandlers.delete(event);
        }
        else {
            this.eventListeners.clear();
            this.errorHandlers.clear();
        }
    }
}
/**
 * WebSocket client for the NeuroInfo API with automatic reconnection.
 * Provides real-time event subscriptions for stream, schedule, and subathon updates.
 *
 * By default uses ticket-based authentication: the client fetches a one-time ticket via
 * REST API before connecting, so the token is never exposed in URL query parameters.
 */
export class NeuroInfoApiWebsocketClient {
    /** Maximum number of reconnect attempts. Default is 10. Set to 0 for unlimited. */
    get maxReconnectAttempts() {
        return this._maxReconnectAttempts;
    }
    set maxReconnectAttempts(value) {
        this._maxReconnectAttempts = Math.max(0, value);
    }
    /** Base delay in milliseconds for reconnection backoff. Default is 1000ms. */
    get reconnectBaseDelay() {
        return this._reconnectBaseDelay;
    }
    set reconnectBaseDelay(value) {
        this._reconnectBaseDelay = Math.max(100, value);
    }
    /**
     * Creates a new WebSocket client instance.
     * @param token - Authentication token (required for connection)
     * @param options - Optional configuration options
     */
    constructor(token, options = {}) {
        this.websocket = null;
        this.sessionId = null;
        this.eventListeners = new Map();
        this.systemListeners = new Map();
        this.subscribedEvents = new Set();
        this.pendingSubscriptions = new Set();
        this.reconnectAttempts = 0;
        this.reconnectTimeout = null;
        this.isIntentionallyClosed = false;
        /** Whether to automatically reconnect on disconnect. Default is true. */
        this.autoReconnect = true;
        this._maxReconnectAttempts = 10;
        this._reconnectBaseDelay = 1000;
        this.token = token;
        this.baseUrl = options.baseUrl ?? `wss://${baseDomain}/api/ws`;
        this.authMethod = options.authMethod ?? "ticket";
        // API base URL for ticket fetching (no version prefix)
        this.apiBaseUrl = options.apiBaseUrl ?? this.baseUrl.replace(/^wss?:\/\//, "https://").replace(/\/api\/ws.*$/, "/api");
    }
    /** Returns the current connection state. */
    get readyState() {
        return this.websocket?.readyState ?? WebSocket.CLOSED;
    }
    /** Returns true if the WebSocket is connected and ready. */
    get isConnected() {
        return this.websocket?.readyState === WebSocket.OPEN;
    }
    /** Returns the current session ID (available after connection). */
    getSessionId() {
        return this.sessionId;
    }
    /** Updates the authentication token. Reconnects if currently connected. */
    setToken(token) {
        this.token = token;
        if (this.isConnected) {
            this.disconnect();
            this.connect();
        }
    }
    /**
     * Connects to the WebSocket server.
     * Uses the configured `authMethod` to authenticate.
     * @returns Promise that resolves when connected, rejects on error.
     */
    async connect() {
        if (this.websocket?.readyState === WebSocket.OPEN || this.websocket?.readyState === WebSocket.CONNECTING)
            return;
        this.isIntentionallyClosed = false;
        if (this.authMethod === "header") {
            // Send token via Authorization header (Node.js only, not supported in browsers)
            return this.connectWithUrl(this.baseUrl, { Authorization: `Bearer ${this.token}` });
        }
        else {
            // Fetch one-time ticket via REST API (token never exposed in URL, works in browsers)
            const ticket = await this.fetchTicket();
            return this.connectWithUrl(`${this.baseUrl}?ticket=${encodeURIComponent(ticket)}`);
        }
    }
    /** Fetches a one-time connection ticket from the API */
    async fetchTicket() {
        const response = await fetch(`${this.apiBaseUrl}/ws/ticket`, {
            headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) {
            const text = await response.text().catch(() => "Unknown error");
            throw new NeuroApiError("TICKET_ERROR", `Failed to fetch connection ticket: ${text}`, response.status);
        }
        const json = await response.json();
        if (!json?.data?.ticket) {
            throw new NeuroApiError("TICKET_ERROR", "Invalid ticket response from server");
        }
        return json.data.ticket;
    }
    /** Internal: Connect to WebSocket with the given URL and optional headers */
    connectWithUrl(url, headers) {
        return new Promise((resolve, reject) => {
            // Pass headers using runtime-compatible constructor variants.
            const WS = WebSocket;
            if (headers) {
                try {
                    this.websocket = new WS(url, { headers });
                }
                catch {
                    this.websocket = new WS(url, undefined, { headers });
                }
            }
            else {
                this.websocket = new WebSocket(url);
            }
            let settled = false;
            const onOpen = () => {
                this.reconnectAttempts = 0;
            };
            const onMessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "welcome") {
                        this.sessionId = msg.data.sessionId;
                        this.emitSystem("_connected", this.sessionId);
                        this.resubscribeEvents();
                        if (!settled) {
                            settled = true;
                            resolve();
                        }
                    }
                    this.handleParsedMessage(msg);
                }
                catch { }
            };
            const onError = (error) => {
                cleanup();
                if (!settled) {
                    settled = true;
                    reject(new NeuroApiError("WS_ERROR", "WebSocket connection error"));
                }
            };
            const onClose = (event) => {
                cleanup();
                if (!settled) {
                    settled = true;
                    reject(new NeuroApiError("WS_CLOSED", `Connection closed: ${event.reason || "Unknown reason"}`, event.code));
                }
            };
            const cleanup = () => {
                this.websocket?.removeEventListener("open", onOpen);
                this.websocket?.removeEventListener("message", onMessage);
                this.websocket?.removeEventListener("error", onError);
                this.websocket?.removeEventListener("close", onClose);
            };
            this.websocket.addEventListener("open", onOpen);
            this.websocket.addEventListener("message", onMessage);
            this.websocket.addEventListener("error", onError);
            this.websocket.addEventListener("close", onClose);
            this.websocket.addEventListener("close", (event) => this.handleClose(event));
            this.websocket.addEventListener("error", (event) => this.emitSystem("_error", event));
        });
    }
    /** Disconnects from the WebSocket server. */
    disconnect() {
        this.isIntentionallyClosed = true;
        this.clearReconnectTimeout();
        if (this.websocket) {
            this.websocket.close(1000, "Client disconnect");
            this.websocket = null;
        }
        this.sessionId = null;
    }
    handleMessage(event) {
        try {
            const msg = JSON.parse(event.data);
            this.handleParsedMessage(msg);
        }
        catch (error) {
            this.emitSystem("_error", new NeuroApiError("WS_PARSE_ERROR", "Failed to parse message"));
        }
    }
    handleParsedMessage(msg) {
        switch (msg.type) {
            case "event":
                this.handleEventMessage(msg);
                break;
            case "addSuccess":
                if (msg.data.subscribed) {
                    this.subscribedEvents.add(msg.data.eventType);
                    this.pendingSubscriptions.delete(msg.data.eventType);
                    this.emitSystem("_eventAdded", msg.data.eventType);
                }
                else {
                    this.emitSystem("_error", new NeuroApiError("WS_SUBSCRIBE_FAILED", `Server rejected event subscription: ${msg.data.eventType}`));
                }
                break;
            case "removeSuccess":
                if (msg.data.unsubscribed) {
                    this.subscribedEvents.delete(msg.data.eventType);
                    this.emitSystem("_eventRemoved", msg.data.eventType);
                }
                else {
                    this.emitSystem("_error", new NeuroApiError("WS_UNSUBSCRIBE_FAILED", `Server rejected event unsubscription: ${msg.data.eventType}`));
                }
                break;
            case "invalid":
                this.emitSystem("_error", new NeuroApiError("WS_INVALID", msg.data.message || msg.data.reason));
                break;
        }
        this.emitSystem("_message", msg);
    }
    handleEventMessage(msg) {
        const eventType = msg.data.eventType;
        const listeners = this.eventListeners.get(eventType);
        if (!listeners)
            return;
        listeners.forEach((entry) => {
            try {
                entry.callback(msg.data.eventData, msg.data.timestamp);
            }
            catch { }
        });
    }
    handleClose(event) {
        this.sessionId = null;
        this.emitSystem("_disconnected", event.code, event.reason);
        if (!this.isIntentionallyClosed && this.autoReconnect) {
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this._maxReconnectAttempts > 0 && this.reconnectAttempts >= this._maxReconnectAttempts) {
            this.emitSystem("_reconnectFailed");
            return;
        }
        // Exponential backoff with jitter: baseDelay * 2^attempts + random(0-1000ms)
        const delay = Math.min(this._reconnectBaseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000, 30000);
        this.reconnectAttempts++;
        this.emitSystem("_reconnecting", this.reconnectAttempts, delay);
        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            try {
                await this.connect();
            }
            catch {
                if (!this.isIntentionallyClosed && this.autoReconnect) {
                    this.scheduleReconnect();
                }
            }
        }, delay);
    }
    clearReconnectTimeout() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
    resubscribeEvents() {
        for (const eventType of this.subscribedEvents) {
            this.sendSubscribe(eventType);
        }
        for (const eventType of this.pendingSubscriptions) {
            this.sendSubscribe(eventType);
        }
    }
    sendSubscribe(eventType) {
        this.send({ type: "addEvent", data: { eventType } });
    }
    sendUnsubscribe(eventType) {
        this.send({ type: "removeEvent", data: { eventType } });
    }
    send(message) {
        if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        }
    }
    isEventType(event) {
        return (event === "scheduleUpdate" ||
            event === "subathonUpdate" ||
            event === "subathonGoalUpdate" ||
            event === "streamOnline" ||
            event === "streamUpdate" ||
            event === "streamOffline" ||
            event === "secretneuroaccountOnline" ||
            event === "streamRaidIncoming" ||
            event === "streamRaidOutgoing");
    }
    on(event, callback) {
        if (this.isEventType(event)) {
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, new Set());
            }
            const entry = { callback: callback };
            this.eventListeners.get(event).add(entry);
            if (!this.subscribedEvents.has(event) && !this.pendingSubscriptions.has(event)) {
                this.pendingSubscriptions.add(event);
                if (this.isConnected) {
                    this.sendSubscribe(event);
                }
            }
            return () => this.off(event, callback);
        }
        if (!this.systemListeners.has(event)) {
            this.systemListeners.set(event, new Set());
        }
        this.systemListeners.get(event).add(callback);
        return () => this.off(event, callback);
    }
    off(event, callback) {
        if (this.isEventType(event)) {
            const listeners = this.eventListeners.get(event);
            if (!listeners)
                return;
            for (const entry of listeners) {
                if (entry.callback === callback) {
                    listeners.delete(entry);
                    break;
                }
            }
            if (listeners.size === 0) {
                this.eventListeners.delete(event);
                this.subscribedEvents.delete(event);
                this.pendingSubscriptions.delete(event);
                if (this.isConnected) {
                    this.sendUnsubscribe(event);
                }
            }
            return;
        }
        this.systemListeners.get(event)?.delete(callback);
    }
    emitSystem(event, ...args) {
        const listeners = this.systemListeners.get(event);
        if (!listeners)
            return;
        listeners.forEach((cb) => {
            try {
                cb(...args);
            }
            catch { }
        });
    }
    /** Returns a list of currently subscribed event types. */
    getSubscribedEvents() {
        return Array.from(this.subscribedEvents);
    }
    /** Requests the list of available events from the server. */
    requestEventList() {
        this.send({ type: "listEvents", data: {} });
    }
    /** Removes all event listeners and disconnects. */
    destroy() {
        this.disconnect();
        this.eventListeners.clear();
        this.systemListeners.clear();
        this.subscribedEvents.clear();
        this.pendingSubscriptions.clear();
    }
}
