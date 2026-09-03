export type ApiResult<T> = {
    data: T;
    error: null;
} | {
    data: null;
    error: NeuroApiError;
};
export interface HttpClientOptions {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
}
export interface HttpRequestOptions {
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
    method?: string;
    signal?: AbortSignal;
}
export declare class HttpRequestError extends Error {
    status?: number | undefined;
    data?: unknown;
    constructor(message: string, status?: number | undefined, data?: unknown);
}
/**
 * Lightweight fetch wrapper with configurable defaults.
 */
export declare class HttpClient {
    private readonly config;
    constructor(options?: HttpClientOptions);
    /** @deprecated Use `new HttpClient(options)` instead. */
    static create(options?: HttpClientOptions): HttpClient;
    request<T>(url: string, options?: HttpRequestOptions): Promise<T>;
    private buildUrl;
}
/**
 * Structured error body returned by the API.
 */
export interface ApiErrorBody {
    code: string;
    message: string;
    timestamp: number;
    path: string;
}
/**
 * Custom error class for API errors with code and status information.
 */
export declare class NeuroApiError extends Error {
    code: string;
    status?: number | undefined;
    timestamp?: number | undefined;
    path?: string | undefined;
    constructor(code: string, message: string, status?: number | undefined, timestamp?: number | undefined, path?: string | undefined);
}
/**
 * Client for interacting with the NeuroInfo API.
 * Provides methods to fetch stream data, VODs, schedules, and subathon information.
 */
export declare class NeuroInfoApiClient {
    apiInstance: HttpClient;
    private apiToken;
    /**
     * Creates a new API client instance.
     * @param token - Optional authentication token
     * @param options - Optional configuration options
     */
    constructor(token?: string | undefined, options?: NeuroInfoApiClientOptions);
    /**
     * Parses an error into a NeuroApiError with proper code and message.
     */
    private parseError;
    /** Sets the API token for authentication. Pass `null` to remove the token. */
    setApiToken(token: string | null): void;
    /** Generic request wrapper that handles errors consistently. */
    private request;
    /**
     * Fetches the current stream data.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#current-stream-status-1
     */
    getCurrentStream: () => Promise<ApiResult<TwitchStreamState>>;
    /**
     * Fetches all VODs (Video on Demand).
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#all-vods-1
     */
    getAllVods: () => Promise<ApiResult<TwitchVod[]>>;
    /**
     * Fetches a specific VOD by stream ID.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#specific-vod-1
     */
    getVod: (id: string) => Promise<ApiResult<TwitchVod>>;
    /**
     * Fetches the schedule for a specific week and year.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#specific-weekly-schedule-1
     */
    getSchedule: (week: number, year?: number) => Promise<ApiResult<ScheduleData>>;
    /**
     * Fetches the latest weekly schedule.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#latest-weekly-schedule-1
     */
    getLatestSchedule: () => Promise<ApiResult<LatestScheduleData>>;
    /**
     * Fetches available schedule week numbers grouped by year.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#schedule-weeks-index-1
     */
    getScheduleWeeks: () => Promise<ApiResult<ScheduleWeeksResponse>>;
    /**
     * Fetches the devstream schedule times.
     */
    getDevstreamTimes: () => Promise<ApiResult<number[]>>;
    /**
     * Searches schedule entries by message text with optional filters and cursor pagination.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#search-weekly-schedules
     */
    getScheduleSearch: (query: string, options?: Omit<ScheduleSearchOptions, "query">) => Promise<ApiResult<ScheduleSearchResponse>>;
    /**
     * Fetches the current active subathons.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#current-subathon-1
     */
    getCurrentSubathons: () => Promise<ApiResult<SubathonData[]>>;
    /**
     * Fetches subathon data for a specific year.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#subathon-data-specific-year-1
     */
    getSubathon: (year: number) => Promise<ApiResult<SubathonData>>;
    /**
     * Fetches the years for which subathon data is available.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#subathon-years-1
     */
    getSubathonYears: () => Promise<ApiResult<SubathonYearsResponse>>;
    /**
     * Fetches the Neuro-sama blog feed. Requires an API token.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/blog.md#endpoint
     */
    getBlogFeed: (raw?: boolean) => Promise<ApiResult<BlogFeedData>>;
    /**
     * Fetches the cached X feed for one of the supported accounts. Requires an API token.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/x-feed.md#endpoint
     */
    getXFeed: (user: XFeedAccount) => Promise<ApiResult<XFeedEntry[]>>;
}
/**
 * Event-based wrapper for the NeuroInfo API.
 * Automatically polls the API at regular intervals and emits events when data changes.
 * Supports events: streamOnline, streamOffline, streamUpdate, scheduleUpdate, subathonUpdate, subathonGoalUpdate.
 * @deprecated The WebSocket client provides a more efficient and real-time way to receive updates. Consider using NeuroInfoApiWebsocketClient instead for new implementations.
 */
export declare class NeuroInfoApiEventer {
    private readonly client;
    private readonly events;
    /** Interval in milliseconds between event fetches. Default is 60000 (60 seconds). Minimum is 10000 (10 seconds). */
    get fetchInterval(): number;
    set fetchInterval(value: number);
    constructor();
    private processEvents;
    /** Starts the event loop that fetches events at regular intervals. */
    startEventLoop(): void;
    /** Stops the event loop that fetches events at regular intervals. */
    stopEventLoop(): void;
    /** Returns the underlying NeuroInfoApiClient instance. */
    getClient(): NeuroInfoApiClient;
    /** Sets the API token for authentication. Pass `null` to remove the token. */
    setApiToken(token: string | null): void;
    /**
     * Registers an event listener for the specified event.
     *
     * @param event - The event name to listen for.
     * @param callback - The callback function to be invoked when the event is emitted.
     * @param onError - (Optional) The callback function to be invoked when an error occurs.
     * @returns A function to unsubscribe from the event.
     */
    on<T extends ApiClientEvent>(event: T, callback: ApiClientEventCallback<T>, onError?: (error: NeuroApiError) => void): () => void;
    /**
     * Removes an event listener for the specified event.
     *
     * @param event - The event name to remove the listener from.
     * @param callback - The callback function to remove.
     */
    off<T extends ApiClientEvent>(event: T, callback: ApiClientEventCallback<T>): void;
    /**
     * Registers a one-time event listener for the specified event.
     * The listener will be automatically removed after it is invoked once.
     *
     * @param event - The event name to listen for.
     * @param callback - The callback function to be invoked when the event is emitted.
     * @param onError - (Optional) The callback function to be invoked when an error occurs.
     * @returns A function to unsubscribe from the event.
     */
    once<T extends ApiClientEvent>(event: T, callback: ApiClientEventCallback<T>, onError?: (error: NeuroApiError) => void): () => void;
    /**
     * Emits an event with the specified data to all registered listeners.
     *
     * @param event - The event name to emit.
     * @param data - The data to pass to the event listeners.
     */
    protected emit<T extends ApiClientEvent>(event: T, data: ApiClientEvents[T]): void;
    /**
     * Removes all event listeners for a specific event or all events.
     *
     * @param event - (Optional) The event name to remove all listeners from.
     *                If not provided, removes all listeners for all events.
     */
    removeAllListeners(event?: ApiClientEvent): void;
}
/**
 * WebSocket client for the NeuroInfo API with automatic reconnection.
 * Provides real-time event subscriptions for stream, feed, schedule, and subathon updates.
 *
 * By default uses ticket-based authentication: the client fetches a one-time ticket via
 * REST API before connecting, so the token is never exposed in URL query parameters.
 */
export declare class NeuroInfoApiWebsocketClient {
    private connection;
    private readonly auth;
    private readonly urls;
    private readonly listeners;
    private readonly reconnect;
    private readonly lifecycle;
    private readonly settings;
    /** Whether to automatically reconnect on disconnect. Default is true. */
    get autoReconnect(): boolean;
    set autoReconnect(value: boolean);
    /** Whether to automatically send heartbeat pings while connected. Default is true. */
    get autoHeartbeat(): boolean;
    set autoHeartbeat(value: boolean);
    /** Maximum number of reconnect attempts. Default is 10. Set to 0 for unlimited. */
    get maxReconnectAttempts(): number;
    set maxReconnectAttempts(value: number);
    /** Base delay in milliseconds for reconnection backoff. Default is 1000ms. */
    get reconnectBaseDelay(): number;
    set reconnectBaseDelay(value: number);
    /** Interval in milliseconds for heartbeat pings. Default is 30000ms. Minimum is 5000ms. */
    get heartbeatIntervalMs(): number;
    set heartbeatIntervalMs(value: number);
    /** Timeout in milliseconds waiting for a heartbeat pong. Default is 10000ms. Minimum is 1000ms. */
    get heartbeatTimeoutMs(): number;
    set heartbeatTimeoutMs(value: number);
    /** Timeout in milliseconds for ticket fetching and the WebSocket welcome. Default is 15000ms. Minimum is 1000ms. */
    get connectTimeoutMs(): number;
    set connectTimeoutMs(value: number);
    /**
     * Creates a new WebSocket client instance.
     * @param token - Authentication token (required for connection)
     * @param options - Optional configuration options
     */
    constructor(token: string, options?: NeuroInfoApiWebsocketClientOptions);
    /** Returns the current connection state. */
    get readyState(): number;
    /** Returns true if the WebSocket is connected and ready. */
    get isConnected(): boolean;
    /** Returns the current session ID (available after connection). */
    getSessionId(): string | null;
    /** Updates the authentication token. Reconnects if currently connected. */
    setToken(token: string): void;
    /** Alias matching the HTTP client token setter. */
    setApiToken(token: string): void;
    /**
     * Connects to the WebSocket server.
     * Uses the configured `authMethod` to authenticate.
     * @returns Promise that resolves when connected, rejects on error.
     */
    connect(): Promise<void>;
    /** Starts either a user-requested or automatic reconnect attempt. */
    private connectWithContext;
    private connectInternal;
    /** Fetches a one-time connection ticket from the API */
    private fetchTicket;
    /** Internal: Connect to WebSocket with the given URL and optional headers */
    private connectWithUrl;
    /** Disconnects from the WebSocket server. */
    disconnect(): void;
    private handleParsedMessage;
    private handleEventMessage;
    private handleClose;
    private scheduleReconnect;
    private clearReconnectTimeout;
    private startHeartbeat;
    private scheduleHeartbeatInterval;
    private stopHeartbeat;
    private sendHeartbeatPing;
    private scheduleHeartbeatTimeout;
    private acknowledgeHeartbeat;
    private sendPing;
    private resubscribeEvents;
    /** Reconciles one event's server-side subscription with its current listeners. */
    private syncSubscription;
    /** Deletes a local subscription only after the server is known not to hold it. */
    private removeInactiveSubscription;
    private sendSubscribe;
    private sendUnsubscribe;
    private send;
    private isEventType;
    /**
     * Registers an event listener for a data event or system event.
     * @param event - The event type to listen to.
     * @param callback - Callback invoked when the event is received.
     * @returns Unsubscribe function.
     */
    on<T extends WsEventType>(event: T, callback: (data: WsEventDataMap[T], timestamp: number) => void): () => void;
    on<T extends WsSystemEvent>(event: T, callback: WsSystemEventCallback<T>): () => void;
    /**
     * Removes an event listener for a data event or system event.
     * @param event - The event type to remove the listener from.
     * @param callback - The callback to remove.
     */
    off<T extends WsEventType>(event: T, callback: (data: WsEventDataMap[T], timestamp: number) => void): void;
    off<T extends WsSystemEvent>(event: T, callback: WsSystemEventCallback<T>): void;
    private removeEventListenerEntry;
    private emitSystem;
    /** Returns a list of currently subscribed event types. */
    getSubscribedEvents(): WsEventType[];
    /** Requests the list of available events from the server. */
    requestEventList(): void;
    /** Removes all event listeners and disconnects. */
    destroy(): void;
}
export declare namespace Utils {
    function isScheduleFinal(status: ScheduleStatus): boolean;
    function isScheduleEntryOnline(entry: ScheduleEntry): boolean;
    function isScheduleEntryOffline(entry: ScheduleEntry): boolean;
    function isScheduleEntryUnknown(entry: ScheduleEntry): boolean;
    function hasScheduleImage(entry: ScheduleData): boolean;
}
export interface NeuroInfoApiBaseOptions {
    /** Host and API path without protocol. HTTP(S)/WS(S) protocols are accepted temporarily for compatibility and will be removed in a future major version. Default: `neuro.appstun.net/api/v2`. */
    apiBaseUrl?: string;
    /** Use HTTPS/WSS instead of HTTP/WS. Default: `true`. */
    useTls?: boolean;
}
/** Options for the NeuroInfoApiWebsocketClient. */
export interface NeuroInfoApiWebsocketClientOptions extends NeuroInfoApiBaseOptions, Partial<WsClientSettings> {
    /** Full WebSocket URL override. By default it is derived from `apiBaseUrl` and `useTls`. */
    websocketUrl?: string;
    /** @deprecated Use `websocketUrl`, or `apiBaseUrl` with `useTls`, instead. */
    baseUrl?: string;
    /**
     * Authentication method to use when connecting.
     * - `"ticket"` *(default)*: Fetches a one-time ticket via REST API before connecting.
     *   The token is never exposed in URL query parameters. Recommended for browser clients.
     * - `"header"`: Sends the token via `Authorization: Bearer` header during the WebSocket handshake.
     *   Only works in environments that support custom WebSocket headers (e.g., Node.js with the `ws` library).
     *   **Not supported in browsers.**
    */
    authMethod?: "ticket" | "header";
}
export interface NeuroInfoApiClientOptions extends NeuroInfoApiBaseOptions {
    /** @deprecated Use `apiBaseUrl` with `useTls` instead. */
    baseUrl?: string;
    /** HTTP request timeout in milliseconds. Default: `10000`. */
    requestTimeoutMs?: number;
}
/** WebSocket event types available for subscription. */
export type WsEventType = keyof WsEventDataMap;
/** Mapping of system events to their callback signatures. */
export interface WsSystemEventCallbacks {
    _connected: (sessionId: string) => void;
    _disconnected: (code: number, reason: string) => void;
    _reconnecting: (attempt: number, delay: number) => void;
    _reconnectFailed: () => void;
    _error: (error: Event | NeuroApiError) => void;
    _message: (message: WsServerMessage) => void;
    _pong: () => void;
    _eventAdded: (eventType: WsEventType) => void;
    _eventRemoved: (eventType: WsEventType) => void;
}
/** System events emitted by the WebSocket client. */
export type WsSystemEvent = keyof WsSystemEventCallbacks;
export type WsSystemEventCallback<T extends WsSystemEvent> = WsSystemEventCallbacks[T];
export type WsInvalidReason = "malformed" | "unauthenticated" | "missingEventtype" | "invalidEventtype" | "missingToken" | "invalidToken" | "authError";
export interface StreamGame {
    id: string;
    name: string;
}
export interface StreamMetadata {
    title: string;
    game: StreamGame;
    language: string;
    isMature: boolean;
}
/** Event data for streamOnline event. */
export interface WsStreamOnlineData extends StreamMetadata {
    isLive: true;
    id: string;
    tags: string[];
    viewerCount: number;
    startedAt: number;
    thumbnailUrl: string;
}
/** Event data for streamOffline event. */
export interface WsStreamOfflineData {
    isLive: false;
}
/** Event data for raid events. */
export interface WsStreamRaidData {
    channel: {
        displayName: string;
        name: string;
        id: string;
    };
    viewerCount: number;
}
export interface BlogEntryBodySection {
    header: string;
    body: string;
}
export interface BlogFeedEntry {
    title: string;
    author: string;
    url: string;
    published: number;
    updated: number;
    content?: BlogEntryBodySection[];
    rawContent?: string;
    summary: string;
}
export interface BlogFeedData {
    url: string;
    lastUpdated: number;
    title: string;
    subtitle: string;
    entries: BlogFeedEntry[];
}
export type XFeedAccount = "NeurosamaAI" | "EvilNeuroAI" | "Vedal987";
export type XFeedEntryType = "tweet" | "reply" | "retweet";
export interface XFeedUser {
    username: string;
}
export interface XFeedReplyTo extends XFeedUser {
    statusId: string;
    url: string;
    post?: XFeedPost;
}
export interface XFeedPost {
    id: string;
    content: string;
    createdTimestamp: number;
    media: XFeedMedia[];
}
export interface XFeedEntry {
    id: string;
    type: XFeedEntryType;
    replyTo?: XFeedReplyTo;
    retweetedBy?: XFeedUser;
    author: XFeedUser;
    url: string;
    createdTimestamp: number;
    content: string;
    media: XFeedMedia[];
}
export type XFeedMedia = {
    type: "image";
    url: string;
} | {
    type: "video";
    url: string;
    posterUrl?: string;
    mimeType?: string;
};
export interface XFeedNewEntriesData {
    user: XFeedAccount;
    entries: XFeedEntry[];
}
/** Event data for subathonGoalUpdate event. */
export interface WsSubathonGoalUpdateData {
    year: number;
    goalNumber: number;
    goal: SubathonGoal;
    subcount: number;
}
/** Mapping of event types to their data structures. */
export interface WsEventDataMap {
    blogFeedUpdate: BlogFeedData;
    xFeedNewEntries: XFeedNewEntriesData;
    /** @deprecated Subscribe to xFeedNewEntries instead. */
    xFeedUpdate: XFeedUpdateData;
    streamOnline: WsStreamOnlineData;
    streamOffline: WsStreamOfflineData;
    streamUpdate: StreamMetadata;
    secretneuroaccountOnline: WsStreamOnlineData;
    streamRaidIncoming: WsStreamRaidData;
    streamRaidOutgoing: WsStreamRaidData;
    scheduleUpdate: ScheduleData;
    subathonUpdate: SubathonData;
    subathonGoalUpdate: WsSubathonGoalUpdateData;
}
type WsEmptyData = Record<string, never>;
type WsMessage<Type extends string, Data = WsEmptyData> = {
    type: Type;
    data: Data;
};
type WsEventSelection = {
    eventType: WsEventType;
};
type WsWelcomeMessage = WsMessage<"welcome", {
    sessionId: string;
}>;
type WsAuthSuccessMessage = WsMessage<"authSuccess">;
type WsInvalidMessage = WsMessage<"invalid", {
    reason: WsInvalidReason;
    message?: string;
}>;
type WsAddSuccessMessage = WsMessage<"addSuccess", WsEventSelection & {
    subscribed: boolean;
}>;
type WsRemoveSuccessMessage = WsMessage<"removeSuccess", WsEventSelection & {
    unsubscribed: boolean;
}>;
type WsListEventsMessage = WsMessage<"listEvents", {
    subscribedEvents: WsEventType[];
    availableEvents: WsEventType[];
}>;
type WsPongMessage = WsMessage<"pong">;
type WsEventMessage<T extends WsEventType = WsEventType> = {
    [EventType in T]: WsMessage<"event", {
        eventType: EventType;
        eventData: WsEventDataMap[EventType];
        timestamp: number;
    }>;
}[T];
export type WsServerMessage = WsWelcomeMessage | WsAuthSuccessMessage | WsInvalidMessage | WsAddSuccessMessage | WsRemoveSuccessMessage | WsListEventsMessage | WsPongMessage | WsEventMessage;
type WsClientSettings = {
    autoReconnect: boolean;
    autoHeartbeat: boolean;
    maxReconnectAttempts: number;
    reconnectBaseDelay: number;
    heartbeatIntervalMs: number;
    heartbeatTimeoutMs: number;
    connectTimeoutMs: number;
};
/** Base stream shape kept for backwards-compatible access to live-only optional fields. */
export interface TwitchStreamData extends Partial<StreamMetadata> {
    isLive: boolean;
    id?: string;
    tags?: string[];
    viewerCount?: number;
    startedAt?: number;
    thumbnailUrl?: string;
}
/** Current stream state. `isLive` narrows all live-only fields to required values. */
export type TwitchStreamState = TwitchStreamData & (WsStreamOnlineData | WsStreamOfflineData);
export interface TwitchVod {
    id: string;
    streamId: string;
    title: string;
    url: string;
    viewable: string;
    type: string;
    language: string;
    duration: string;
    viewCount: number;
    createdAt: number;
    publishedAt: number;
    thumbnailUrl: string;
}
export type ScheduleStatus = "auto_twitch" | "auto_discord" | "confirmed";
export interface ScheduleData {
    year: number;
    week: number;
    schedule: ScheduleEntry[];
    status: ScheduleStatus;
    imageUrl: string | null;
}
export interface LatestScheduleData extends ScheduleData {
    hasActiveSubathon: boolean;
}
export type ScheduleWeeksResponse = Record<number, number[]>;
export type ScheduleSearchCursor = Pick<ScheduleData, "year" | "week">;
export interface ScheduleSearchOptions {
    query: string;
    year?: number;
    limit?: number;
    sort?: "asc" | "desc";
    type?: ScheduleEntryType;
    cursor?: ScheduleSearchCursor;
}
export interface ScheduleSearchResultItem {
    foundDays: number[];
    data: ScheduleData;
}
export interface ScheduleSearchResponse {
    nextCursor: ScheduleSearchCursor | null;
    results: ScheduleSearchResultItem[];
}
export type ScheduleEntryType = "normal" | "offline" | "canceled" | "TBD" | "unknown";
export interface ScheduleEntry {
    day: number;
    time: number;
    message: string;
    type: ScheduleEntryType;
}
export interface SubathonData {
    year: number;
    name: string;
    subcount: number;
    goals: {
        [goalNumber: number]: SubathonGoal;
    };
    subcountMilestones?: SubathonSubcountMilestone;
    isActive: boolean;
    startTimestamp?: number;
    endTimestamp?: number;
}
export type SubathonSubcountMilestone = {
    [milestone: number]: {
        timestamp: number;
    };
};
export type SubathonYearsResponse = Record<number, string>;
export interface SubathonGoal {
    name: string;
    completed: boolean;
    reached: boolean;
}
/** @deprecated Only used by the deprecated `NeuroInfoApiEventer`. Use `TwitchStreamState` or the WebSocket event types instead. */
export type EventerStreamData = TwitchStreamData;
/** @deprecated Event map used only by the deprecated `NeuroInfoApiEventer`. Use `WsEventDataMap` with `NeuroInfoApiWebsocketClient` instead. */
export interface ApiClientEvents {
    streamOnline: EventerStreamData;
    streamOffline: EventerStreamData;
    streamUpdate: EventerStreamData;
    scheduleUpdate: LatestScheduleData;
    subathonUpdate: SubathonData;
    subathonGoalUpdate: {
        subathon: SubathonData;
        goal: SubathonGoal;
        goalNumber: number;
    };
}
/** @deprecated Event name used only by the deprecated `NeuroInfoApiEventer`. Use `WsEventType` instead. */
export type ApiClientEvent = keyof ApiClientEvents;
/** @deprecated Callback type used only by the deprecated `NeuroInfoApiEventer`. Use a WebSocket event callback instead. */
export type ApiClientEventCallback<T extends ApiClientEvent> = (data: ApiClientEvents[T]) => void;
/** @deprecated Use `Utils.isScheduleFinal` instead. */
export declare const isScheduleFinal: typeof Utils.isScheduleFinal;
/** @deprecated Use `StreamMetadata` instead. */
export type WsStreamUpdateData = StreamMetadata;
/** @deprecated Use `BlogFeedData` instead. */
export type WsBlogFeedUpdateData = BlogFeedData;
/** @deprecated Use `ScheduleData` instead. */
export type ScheduleResponse = ScheduleData;
/** @deprecated Use `LatestScheduleData` instead. */
export type ScheduleLatestResponse = LatestScheduleData;
/** @deprecated Use `ScheduleData` instead. */
export type WsScheduleUpdateData = ScheduleData;
/** @deprecated Use `SubathonData` instead. */
export type WsSubathonUpdateData = SubathonData;
/** @deprecated Use XFeedNewEntriesData and xFeedNewEntries instead. */
export type XFeedUpdateData = XFeedNewEntriesData;
export {};
