import { AxiosInstance } from "axios";
type Success<T> = {
    data: T;
    error: null;
};
type Failure = {
    data: null;
    error: NeuroApiError;
};
export type ApiResult<T> = Success<T> | Failure;
/**
 * Custom error class for API errors with code and status information.
 */
export declare class NeuroApiError extends Error {
    code: string;
    status?: number | undefined;
    constructor(code: string, message: string, status?: number | undefined);
}
/**
 * Client for interacting with the NeuroInfo API.
 * Provides methods to fetch stream data, VODs, schedules, and subathon information.
 */
export declare class NeuroInfoApiClient {
    apiInstance: AxiosInstance;
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
    getCurrentStream: () => Promise<ApiResult<TwitchStreamData>>;
    /**
     * Fetches all VODs (Video on Demand).
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#all-vods-1
     */
    getAllVods: () => Promise<ApiResult<TwitchVod[]>>;
    /**
     * Fetches a specific VOD by stream ID.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#specific-vod-1
     */
    getVod: (streamId: string) => Promise<ApiResult<TwitchVod>>;
    /**
     * Fetches the schedule for a specific year and week. If no parameters are provided, fetches the current week's schedule.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#specific-weekly-schedule-1
     */
    getSchedule: (year?: number, week?: number) => Promise<ApiResult<ScheduleResponse>>;
    /**
     * Fetches the latest weekly schedule.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#latest-weekly-schedule-1
     */
    getLatestSchedule: () => Promise<ApiResult<ScheduleLatestResponse>>;
    /**
     * Fetches available schedule week numbers grouped by year.
     * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#schedule-weeks-index-1
     */
    getScheduleWeeks: () => Promise<ApiResult<ScheduleWeeksResponse>>;
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
    getSubathonYears(detailed: true): Promise<ApiResult<SubathonYearsDetailedResponse>>;
    getSubathonYears(detailed?: false): Promise<ApiResult<SubathonYearsResponse>>;
}
/**
 * Event-based wrapper for the NeuroInfo API.
 * Automatically polls the API at regular intervals and emits events when data changes.
 * Supports events: streamOnline, streamOffline, streamUpdate, scheduleUpdate, subathonUpdate, subathonGoalUpdate.
 * @deprecated The WebSocket client provides a more efficient and real-time way to receive updates. Consider using NeuroInfoApiWebsocketClient instead for new implementations.
 */
export declare class NeuroInfoApiEventer {
    private client;
    private eventListeners;
    private errorHandlers;
    private cached;
    private fetchTimeout;
    private isProcessing;
    private _fetchInterval;
    /** Interval in milliseconds between event fetches. Default is 60000 (60 seconds). Minimum is 10000 (10 seconds). */
    get fetchInterval(): number;
    set fetchInterval(value: number);
    constructor();
    private emitInternalError;
    private runProcessEvents;
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
 * Provides real-time event subscriptions for stream, schedule, and subathon updates.
 *
 * By default uses ticket-based authentication: the client fetches a one-time ticket via
 * REST API before connecting, so the token is never exposed in URL query parameters.
 */
export declare class NeuroInfoApiWebsocketClient {
    private websocket;
    private token;
    private baseUrl;
    private apiBaseUrl;
    private authMethod;
    private sessionId;
    private eventListeners;
    private systemListeners;
    private subscribedEvents;
    private pendingSubscriptions;
    private reconnectAttempts;
    private reconnectTimeout;
    private isIntentionallyClosed;
    private heartbeatIntervalHandle;
    private heartbeatTimeoutHandle;
    private pendingHeartbeat;
    /** Whether to automatically reconnect on disconnect. Default is true. */
    autoReconnect: boolean;
    /** Whether to automatically send heartbeat pings while connected. Default is true. */
    autoHeartbeat: boolean;
    private _maxReconnectAttempts;
    /** Maximum number of reconnect attempts. Default is 10. Set to 0 for unlimited. */
    get maxReconnectAttempts(): number;
    set maxReconnectAttempts(value: number);
    private _reconnectBaseDelay;
    /** Base delay in milliseconds for reconnection backoff. Default is 1000ms. */
    get reconnectBaseDelay(): number;
    set reconnectBaseDelay(value: number);
    private _heartbeatIntervalMs;
    /** Interval in milliseconds for heartbeat pings. Default is 30000ms. Minimum is 5000ms. */
    get heartbeatIntervalMs(): number;
    set heartbeatIntervalMs(value: number);
    private _heartbeatTimeoutMs;
    /** Timeout in milliseconds waiting for a heartbeat pong. Default is 10000ms. Minimum is 1000ms. */
    get heartbeatTimeoutMs(): number;
    set heartbeatTimeoutMs(value: number);
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
    /**
     * Connects to the WebSocket server.
     * Uses the configured `authMethod` to authenticate.
     * @returns Promise that resolves when connected, rejects on error.
     */
    connect(): Promise<void>;
    /** Fetches a one-time connection ticket from the API */
    private fetchTicket;
    /** Internal: Connect to WebSocket with the given URL and optional headers */
    private connectWithUrl;
    /** Disconnects from the WebSocket server. */
    disconnect(): void;
    private handleMessage;
    private handleParsedMessage;
    private handleEventMessage;
    private handleClose;
    private scheduleReconnect;
    private clearReconnectTimeout;
    private startHeartbeat;
    private stopHeartbeat;
    private sendHeartbeatPing;
    private acknowledgeHeartbeat;
    private resubscribeEvents;
    private sendSubscribe;
    private sendUnsubscribe;
    private sendPing;
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
    private emitSystem;
    /** Returns a list of currently subscribed event types. */
    getSubscribedEvents(): WsEventType[];
    /** Requests the list of available events from the server. */
    requestEventList(): void;
    /** Removes all event listeners and disconnects. */
    destroy(): void;
}
/**
 * Options for the NeuroInfoApiWebsocketClient.
 */
export interface NeuroInfoApiWebsocketClientOptions {
    /**
     * WebSocket server URL. Defaults to `wss://neuro.appstun.net/api/ws`.
     */
    baseUrl?: string;
    /**
     * REST API base URL for ticket fetching. If not provided, automatically derived from baseUrl.
     * Example: `https://neuro.appstun.net/api`
     */
    apiBaseUrl?: string;
    /**
     * Authentication method to use when connecting.
     * - `"ticket"` *(default)*: Fetches a one-time ticket via REST API before connecting.
     *   The token is never exposed in URL query parameters. Recommended for browser clients.
     * - `"header"`: Sends the token via `Authorization: Bearer` header during the WebSocket handshake.
     *   Only works in environments that support custom WebSocket headers (e.g., Node.js with the `ws` library).
     *   **Not supported in browsers.**
     */
    authMethod?: "ticket" | "header";
    /**
     * Enable client-side ping/pong heartbeat.
     * Default: `true`
     */
    autoHeartbeat?: boolean;
    /**
     * Heartbeat ping interval in milliseconds.
     * Default: `25000` (minimum `5000`).
     */
    heartbeatIntervalMs?: number;
    /**
     * Heartbeat pong timeout in milliseconds.
     * Default: `10000` (minimum `1000`).
     */
    heartbeatTimeoutMs?: number;
}
export interface NeuroInfoApiClientOptions {
    baseUrl?: string;
}
/** WebSocket event types available for subscription. */
export type WsEventType = "scheduleUpdate" | "subathonUpdate" | "subathonGoalUpdate" | "streamOnline" | "streamUpdate" | "streamOffline" | "secretneuroaccountOnline" | "streamRaidIncoming" | "streamRaidOutgoing";
/** System events emitted by the WebSocket client. */
export type WsSystemEvent = "_connected" | "_disconnected" | "_reconnecting" | "_reconnectFailed" | "_error" | "_message" | "_pong" | "_eventAdded" | "_eventRemoved";
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
export type WsSystemEventCallback<T extends WsSystemEvent> = WsSystemEventCallbacks[T];
export type WsInvalidReason = "malformed" | "unauthenticated" | "missingEventtype" | "invalidEventtype" | "missingToken" | "invalidToken" | "authError";
/** Event data for streamOnline event. */
export interface WsStreamOnlineData {
    isLive: true;
    id: string;
    title: string;
    game: {
        id: string;
        name: string;
    };
    language: string;
    tags: string[];
    isMature: boolean;
    viewerCount: number;
    startedAt: number;
    thumbnailUrl: string;
}
/** Event data for streamOffline event. */
export interface WsStreamOfflineData {
    isLive: false;
}
/** Event data for streamUpdate event. */
export interface WsStreamUpdateData {
    title: string;
    game: {
        id: string;
        name: string;
    };
    language: string;
    isMature: boolean;
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
/** Event data for scheduleUpdate event. */
export interface WsScheduleUpdateData {
    year: number;
    week: number;
    schedule: ScheduleEntry[];
    isFinal: boolean;
}
/** Event data for subathonUpdate event. */
export interface WsSubathonUpdateData {
    year: number;
    name: string;
    subcount: number;
    goals: {
        [goal: number]: SubathonGoal;
    };
    isActive: boolean;
    startTimestamp?: number;
    endTimestamp?: number;
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
    streamOnline: WsStreamOnlineData;
    streamOffline: WsStreamOfflineData;
    streamUpdate: WsStreamUpdateData;
    secretneuroaccountOnline: WsStreamOnlineData;
    streamRaidIncoming: WsStreamRaidData;
    streamRaidOutgoing: WsStreamRaidData;
    scheduleUpdate: WsScheduleUpdateData;
    subathonUpdate: WsSubathonUpdateData;
    subathonGoalUpdate: WsSubathonGoalUpdateData;
}
interface WsWelcomeMessage {
    type: "welcome";
    data: {
        sessionId: string;
    };
}
interface WsInvalidMessage {
    type: "invalid";
    data: {
        reason: WsInvalidReason;
        message?: string;
    };
}
interface WsAddSuccessMessage {
    type: "addSuccess";
    data: {
        eventType: WsEventType;
        subscribed: boolean;
    };
}
interface WsRemoveSuccessMessage {
    type: "removeSuccess";
    data: {
        eventType: WsEventType;
        unsubscribed: boolean;
    };
}
interface WsListEventsMessage {
    type: "listEvents";
    data: {
        subscribedEvents: WsEventType[];
        availableEvents: WsEventType[];
    };
}
interface WsPongMessage {
    type: "pong";
    data: Record<string, never>;
}
interface WsEventMessage<T extends WsEventType = WsEventType> {
    type: "event";
    data: {
        eventType: T;
        eventData: WsEventDataMap[T];
        timestamp: number;
    };
}
export type WsServerMessage = WsWelcomeMessage | WsInvalidMessage | WsAddSuccessMessage | WsRemoveSuccessMessage | WsListEventsMessage | WsPongMessage | WsEventMessage;
export interface ApiClientEvents {
    streamOnline: TwitchStreamData;
    streamOffline: TwitchStreamData;
    streamUpdate: TwitchStreamData;
    scheduleUpdate: ScheduleLatestResponse;
    subathonUpdate: SubathonData;
    subathonGoalUpdate: {
        subathon: SubathonData;
        goal: SubathonGoal;
        goalNumber: number;
    };
}
export type ApiClientEvent = keyof ApiClientEvents;
export type ApiClientEventCallback<T extends ApiClientEvent> = (data: ApiClientEvents[T]) => void;
export interface TwitchStreamData {
    isLive: boolean;
    id?: string;
    title?: string;
    game?: {
        id: string;
        name: string;
    };
    language?: string;
    tags?: string[];
    isMature?: boolean;
    viewerCount?: number;
    startedAt?: number;
    thumbnailUrl?: string;
}
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
export interface ScheduleResponse {
    year: number;
    week: number;
    schedule: ScheduleEntry[];
    isFinal: boolean;
}
export interface ScheduleLatestResponse extends ScheduleResponse {
    hasActiveSubathon: boolean;
}
export type ScheduleWeeksResponse = Record<number, number[]>;
export interface ScheduleSearchCursor {
    year: number;
    week: number;
}
export interface ScheduleSearchOptions {
    query: string;
    year?: number;
    limit?: number;
    sort?: "asc" | "desc";
    type?: "normal" | "offline" | "canceled" | "TBD" | "unknown";
    cursor?: ScheduleSearchCursor;
}
export interface ScheduleSearchResultItem {
    foundDays: number[];
    data: {
        year: number;
        week: number;
        schedule: ScheduleEntry[];
        isFinal: boolean;
    };
}
export interface ScheduleSearchResponse {
    nextCursor: ScheduleSearchCursor | null;
    results: ScheduleSearchResultItem[];
}
export interface ScheduleEntry {
    day: number;
    time: number;
    message: string;
    type: "normal" | "offline" | "canceled" | "TBD" | "unknown";
}
export interface SubathonData {
    year: number;
    name: string;
    subcount: number;
    goals: {
        [goalNumber: number]: SubathonGoal;
    };
    isActive: boolean;
    startTimestamp?: number;
    endTimestamp?: number;
}
export type SubathonYearsResponse = string[];
export type SubathonYearsDetailedResponse = Record<number, string>;
export interface SubathonGoal {
    name: string;
    completed: boolean;
    reached: boolean;
}
export {};
