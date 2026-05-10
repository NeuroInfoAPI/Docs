import { FetchError, ofetch } from "ofetch";

type Success<T> = { data: T; error: null };
type Failure = { data: null; error: NeuroApiError };
export type ApiResult<T> = Success<T> | Failure;

type IntervalHandle = ReturnType<typeof setInterval>;
type TimeoutHandle = ReturnType<typeof setTimeout>;

const baseDomain = "neuro.appstun.net";

/**
 * Custom error class for API errors with code and status information.
 */
export class NeuroApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "NeuroApiError";
  }
}

/**
 * Client for interacting with the NeuroInfo API.
 * Provides methods to fetch stream data, VODs, schedules, and subathon information.
 */
export class NeuroInfoApiClient {
  public apiInstance: ReturnType<typeof ofetch.create>;
  private apiToken: string | null = null;
  private baseUrl: string;

  /**
   * Creates a new API client instance.
   * @param token - Optional authentication token
   * @param options - Optional configuration options
   */
  constructor(token: string | undefined = undefined, options: NeuroInfoApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? `https://${baseDomain}/api/v1`;
    this.apiInstance = ofetch.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (token != null) this.setApiToken(token);
  }

  /**
   * Parses an error into a NeuroApiError with proper code and message.
   */
  private parseError(error: unknown): NeuroApiError {
    if (error instanceof FetchError) {
      const apiError = (error.data as { error?: { code?: string; message?: string } } | undefined)?.error;
      if (apiError?.code && apiError?.message) return new NeuroApiError(apiError.code, apiError.message, error.response?.status);
      if (!error.response) return new NeuroApiError("NETWORK", error.message || "Network error");
      return new NeuroApiError("HTTP_ERROR", `Request failed with status ${error.response.status}`, error.response.status);
    }
    return new NeuroApiError("UNKNOWN", String(error));
  }

  /** Sets the API token for authentication. Pass `null` to remove the token. */
  public setApiToken(token: string | null): void {
    this.apiToken = token;
  }

  /** Generic request wrapper that handles errors consistently. */
  private async request<T>(url: string, params?: Record<string, any>): Promise<ApiResult<T>> {
    try {
      const response = await this.apiInstance<T>(url, {
        query: params,
        headers: this.apiToken != null ? { Authorization: `Bearer ${this.apiToken}` } : undefined,
      });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: this.parseError(error) };
    }
  }

  /**
   * Fetches the current stream data.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#current-stream-status-1
   */
  public getCurrentStream = () => this.request<TwitchStreamData>("/twitch/stream");

  /**
   * Fetches all VODs (Video on Demand).
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#all-vods-1
   */
  public getAllVods = () => this.request<TwitchVod[]>("/twitch/vods");

  /**
   * Fetches a specific VOD by stream ID.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#specific-vod-1
   */
  public getVod = (streamId: string) => this.request<TwitchVod>("/twitch/vod", { streamId });

  /**
   * Fetches the schedule for a specific year and week. If no parameters are provided, fetches the current week's schedule.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#specific-weekly-schedule-1
   */
  public getSchedule = (year?: number, week?: number) =>
    this.request<ScheduleResponse>("/schedule", year || week ? { year, week } : undefined);

  /**
   * Fetches the latest weekly schedule.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#latest-weekly-schedule-1
   */
  public getLatestSchedule = () => this.request<ScheduleLatestResponse>("/schedule/latest");

  /**
   * Fetches available schedule week numbers grouped by year.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#schedule-weeks-index-1
   */
  public getScheduleWeeks = () => this.request<ScheduleWeeksResponse>("/schedule/weeks");

  /**
   * Searches schedule entries by message text with optional filters and cursor pagination.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#search-weekly-schedules
   */
  public getScheduleSearch = (query: string, options?: Omit<ScheduleSearchOptions, "query">) => {
    const params: Record<string, any> = {
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

    return this.request<ScheduleSearchResponse>("/schedule/search", params);
  };

  /**
   * Fetches the current active subathons.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#current-subathon-1
   */
  public getCurrentSubathons = () => this.request<SubathonData[]>("/subathon/current");

  /**
   * Fetches subathon data for a specific year.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#subathon-data-specific-year-1
   */
  public getSubathon = (year: number) => this.request<SubathonData>("/subathon", { year });

  /**
   * Fetches the years for which subathon data is available.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#subathon-years-1
   */
  public getSubathonYears(detailed: true): Promise<ApiResult<SubathonYearsDetailedResponse>>;
  public getSubathonYears(detailed?: false): Promise<ApiResult<SubathonYearsResponse>>;
  public getSubathonYears(detailed: boolean = false): Promise<ApiResult<SubathonYearsResponse | SubathonYearsDetailedResponse>> {
    return this.request<SubathonYearsResponse | SubathonYearsDetailedResponse>(
      "/subathon/years",
      detailed ? { detailed: true } : undefined,
    );
  }

  /**
   * Fetches the Neuro-sama blog feed. Requires an API token.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/blog.md#endpoint
   */
  public getBlogFeed = (raw: boolean = false) => this.request<BlogFeedResponse>("/blog/feed", raw ? { raw: true } : undefined);
}

/**
 * Event-based wrapper for the NeuroInfo API.
 * Automatically polls the API at regular intervals and emits events when data changes.
 * Supports events: streamOnline, streamOffline, streamUpdate, scheduleUpdate, subathonUpdate, subathonGoalUpdate.
 * @deprecated The WebSocket client provides a more efficient and real-time way to receive updates. Consider using NeuroInfoApiWebsocketClient instead for new implementations.
 */
export class NeuroInfoApiEventer {
  private client: NeuroInfoApiClient;
  private eventListeners: Map<ApiClientEvent, Set<EventListenerEntry<any>>> = new Map();
  private errorHandlers: Map<ApiClientEvent, Set<(error: NeuroApiError) => void>> = new Map();
  private cached: Map<string, any> = new Map();
  private fetchTimeout: IntervalHandle | null = null;
  private isProcessing: boolean = false;

  private _fetchInterval: number = 60000;
  /** Interval in milliseconds between event fetches. Default is 60000 (60 seconds). Minimum is 10000 (10 seconds). */
  public get fetchInterval(): number {
    return this._fetchInterval;
  }
  public set fetchInterval(value: number) {
    this._fetchInterval = Math.max(value, 10000);
  }

  constructor() {
    this.client = new NeuroInfoApiClient();
    console.warn("NeuroInfoApiEventer is deprecated. Please use NeuroInfoApiWebsocketClient for real-time updates instead.");
  }

  private async processEvents() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events = new Set(this.eventListeners.keys());
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const needsStream = events.has("streamOnline") || events.has("streamOffline") || events.has("streamUpdate");
      const needsSchedule = events.has("scheduleUpdate");
      const needsSubathon = events.has("subathonUpdate") || events.has("subathonGoalUpdate");

      const strResult = needsStream ? await this.client.getCurrentStream() : null;
      if (needsSchedule && needsStream) await delay(100);
      const scheResult = needsSchedule ? await this.client.getLatestSchedule() : null;
      if (needsSubathon && (needsStream || needsSchedule)) await delay(100);
      const subResult = needsSubathon ? await this.client.getCurrentSubathons() : null;

      const emitError = (event: ApiClientEvent, error: NeuroApiError) =>
        this.errorHandlers.get(event)?.forEach((handler) => handler(error));
      const emit = (listeners: Set<EventListenerEntry<any>>, data: any) => listeners.forEach((entry) => entry.callback(data));
      const hasChanged = (cached: any, current: any) => !cached || JSON.stringify(cached) !== JSON.stringify(current);

      for (const [event, listeners] of this.eventListeners) {
        switch (event) {
          case "streamOnline":
          case "streamOffline":
          case "streamUpdate": {
            if (!strResult?.data) {
              if (strResult?.error) emitError(event, strResult.error);
              break;
            }
            const cached = this.cached.get("streamData");
            let shouldEmit = false;

            if (event === "streamOnline") shouldEmit = !cached?.isLive && strResult.data.isLive;
            else if (event === "streamOffline") shouldEmit = cached?.isLive && !strResult.data.isLive;
            else shouldEmit = cached && !(cached?.isLive !== strResult.data.isLive) && hasChanged(cached, strResult.data);

            if (shouldEmit) emit(listeners, strResult.data);
            break;
          }

          case "scheduleUpdate": {
            if (!scheResult?.data) {
              if (scheResult?.error) emitError(event, scheResult.error);
              break;
            }
            if (hasChanged(this.cached.get("latestSchedule"), scheResult.data)) emit(listeners, scheResult.data);

            break;
          }
          case "subathonUpdate": {
            if (!subResult?.data) {
              if (subResult?.error) emitError(event, subResult.error);
              break;
            }
            const cached: SubathonData[] | undefined = this.cached.get("currentSubathons");

            for (const sub of subResult.data) {
              const cachedSub = cached?.find((s) => s.year === sub.year);
              if (hasChanged(cachedSub, sub)) emit(listeners, sub);
            }

            if (cached) {
              for (const cachedSub of cached) {
                if (!subResult.data.find((s) => s.year === cachedSub.year)) emit(listeners, { ...cachedSub, isActive: false });
              }
            }
            break;
          }
          case "subathonGoalUpdate": {
            if (!subResult?.data) {
              if (subResult?.error) emitError(event, subResult.error);
              break;
            }
            const cached: SubathonData[] | undefined = this.cached.get("currentSubathons");

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

      const updateCache = (key: string, result: ApiResult<any> | null) => {
        if (result?.data !== undefined && result?.data !== null) this.cached.set(key, result.data);
        else if (result?.error) this.cached.delete(key);
      };
      updateCache("streamData", strResult);
      updateCache("latestSchedule", scheResult);
      updateCache("currentSubathons", subResult);
    } finally {
      this.isProcessing = false;
    }
  }

  /** Starts the event loop that fetches events at regular intervals. */
  public startEventLoop(): void {
    if (this.fetchTimeout != null) return;
    this.processEvents();
    this.fetchTimeout = setInterval(() => this.processEvents(), this.fetchInterval);
  }

  /** Stops the event loop that fetches events at regular intervals. */
  public stopEventLoop(): void {
    if (this.fetchTimeout == null) return;
    clearInterval(this.fetchTimeout);
    this.fetchTimeout = null;
  }

  /** Returns the underlying NeuroInfoApiClient instance. */
  public getClient(): NeuroInfoApiClient {
    return this.client;
  }

  /** Sets the API token for authentication. Pass `null` to remove the token. */
  public setApiToken(token: string | null): void {
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
  public on<T extends ApiClientEvent>(event: T, callback: ApiClientEventCallback<T>, onError?: (error: NeuroApiError) => void): () => void {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, new Set());
    const entry: EventListenerEntry<T> = { callback };
    this.eventListeners.get(event)!.add(entry);

    if (onError) {
      if (!this.errorHandlers.has(event)) this.errorHandlers.set(event, new Set());
      this.errorHandlers.get(event)!.add(onError);
    }

    return () => {
      this.eventListeners.get(event)?.delete(entry);
      if (onError) this.errorHandlers.get(event)?.delete(onError);
    };
  }

  /**
   * Removes an event listener for the specified event.
   *
   * @param event - The event name to remove the listener from.
   * @param callback - The callback function to remove.
   */
  public off<T extends ApiClientEvent>(event: T, callback: ApiClientEventCallback<T>): void {
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
  public once<T extends ApiClientEvent>(
    event: T,
    callback: ApiClientEventCallback<T>,
    onError?: (error: NeuroApiError) => void,
  ): () => void {
    const unsubscribe = this.on(
      event,
      ((data: ApiClientEvents[T]) => {
        unsubscribe();
        callback(data);
      }) as ApiClientEventCallback<T>,
      onError
        ? (error: NeuroApiError) => {
            unsubscribe();
            onError(error);
          }
        : undefined,
    );
    return unsubscribe;
  }

  /**
   * Emits an event with the specified data to all registered listeners.
   *
   * @param event - The event name to emit.
   * @param data - The data to pass to the event listeners.
   */
  protected emit<T extends ApiClientEvent>(event: T, data: ApiClientEvents[T]): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    listeners.forEach((entry) => {
      try {
        entry.callback(data);
      } catch (error) {}
    });
  }

  /**
   * Removes all event listeners for a specific event or all events.
   *
   * @param event - (Optional) The event name to remove all listeners from.
   *                If not provided, removes all listeners for all events.
   */
  public removeAllListeners(event?: ApiClientEvent): void {
    if (event) {
      this.eventListeners.delete(event);
      this.errorHandlers.delete(event);
    } else {
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
  private websocket: WebSocket | null = null;
  private token: string;
  private baseUrl: string;
  private apiBaseUrl: string;
  private authMethod: "ticket" | "header";
  private sessionId: string | null = null;

  private eventListeners: Map<WsEventType, Set<WsEventListenerEntry<any>>> = new Map();
  private systemListeners: Map<WsSystemEvent, Set<(...args: any[]) => void>> = new Map();
  private subscribedEvents: Set<WsEventType> = new Set();
  private pendingSubscriptions: Set<WsEventType> = new Set();

  private reconnectAttempts: number = 0;
  private reconnectTimeout: TimeoutHandle | null = null;
  private isIntentionallyClosed: boolean = false;

  private heartbeatIntervalHandle: IntervalHandle | null = null;
  private heartbeatTimeoutHandle: TimeoutHandle | null = null;
  private pendingHeartbeat: boolean = false;

  /** Whether to automatically reconnect on disconnect. Default is true. */
  public autoReconnect: boolean = true;

  /** Whether to automatically send heartbeat pings while connected. Default is true. */
  public autoHeartbeat: boolean = true;

  private _maxReconnectAttempts: number = 10;
  /** Maximum number of reconnect attempts. Default is 10. Set to 0 for unlimited. */
  public get maxReconnectAttempts(): number {
    return this._maxReconnectAttempts;
  }
  public set maxReconnectAttempts(value: number) {
    this._maxReconnectAttempts = Math.max(0, value);
  }

  private _reconnectBaseDelay: number = 1000;
  /** Base delay in milliseconds for reconnection backoff. Default is 1000ms. */
  public get reconnectBaseDelay(): number {
    return this._reconnectBaseDelay;
  }
  public set reconnectBaseDelay(value: number) {
    this._reconnectBaseDelay = Math.max(100, value);
  }

  private _heartbeatIntervalMs: number = 30000;
  /** Interval in milliseconds for heartbeat pings. Default is 30000ms. Minimum is 5000ms. */
  public get heartbeatIntervalMs(): number {
    return this._heartbeatIntervalMs;
  }
  public set heartbeatIntervalMs(value: number) {
    this._heartbeatIntervalMs = Math.max(5000, value);
  }

  private _heartbeatTimeoutMs: number = 10000;
  /** Timeout in milliseconds waiting for a heartbeat pong. Default is 10000ms. Minimum is 1000ms. */
  public get heartbeatTimeoutMs(): number {
    return this._heartbeatTimeoutMs;
  }
  public set heartbeatTimeoutMs(value: number) {
    this._heartbeatTimeoutMs = Math.max(1000, value);
  }

  /**
   * Creates a new WebSocket client instance.
   * @param token - Authentication token (required for connection)
   * @param options - Optional configuration options
   */
  constructor(token: string, options: NeuroInfoApiWebsocketClientOptions = {}) {
    this.token = token;
    this.baseUrl = options.baseUrl ?? `wss://${baseDomain}/api/ws`;
    this.authMethod = options.authMethod ?? "ticket";
    if (options.autoHeartbeat != null) this.autoHeartbeat = options.autoHeartbeat;
    if (options.heartbeatIntervalMs != null) this.heartbeatIntervalMs = options.heartbeatIntervalMs;
    if (options.heartbeatTimeoutMs != null) this.heartbeatTimeoutMs = options.heartbeatTimeoutMs;
    // API base URL for ticket fetching (no version prefix)
    this.apiBaseUrl = options.apiBaseUrl ?? this.baseUrl.replace(/^wss?:\/\//, "https://").replace(/\/api\/ws.*$/, "/api");
  }

  /** Returns the current connection state. */
  public get readyState(): number {
    return this.websocket?.readyState ?? WebSocket.CLOSED;
  }

  /** Returns true if the WebSocket is connected and ready. */
  public get isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  /** Returns the current session ID (available after connection). */
  public getSessionId(): string | null {
    return this.sessionId;
  }

  /** Updates the authentication token. Reconnects if currently connected. */
  public setToken(token: string): void {
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
  public async connect(): Promise<void> {
    if (this.websocket?.readyState === WebSocket.OPEN || this.websocket?.readyState === WebSocket.CONNECTING) return;

    this.isIntentionallyClosed = false;

    if (this.authMethod === "header")
      // Send token via Authorization header (Node.js only, not supported in browsers)
      return this.connectWithUrl(this.baseUrl, { Authorization: `Bearer ${this.token}` });
    else {
      // Fetch one-time ticket via REST API (token never exposed in URL, works in browsers)
      const ticket = await this.fetchTicket();
      return this.connectWithUrl(`${this.baseUrl}?ticket=${encodeURIComponent(ticket)}`);
    }
  }

  /** Fetches a one-time connection ticket from the API */
  private async fetchTicket(): Promise<string> {
    const response = await fetch(`${this.apiBaseUrl}/ws/ticket`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new NeuroApiError("TICKET_ERROR", `Failed to fetch connection ticket: ${text}`, response.status);
    }

    const json = await response.json();
    if (!json?.data?.ticket) throw new NeuroApiError("TICKET_ERROR", "Invalid ticket response from server");

    return json.data.ticket;
  }

  /** Internal: Connect to WebSocket with the given URL and optional headers */
  private connectWithUrl(url: string, headers?: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
      // Pass headers using runtime-compatible constructor variants.
      const WS = WebSocket as any;
      if (headers) {
        try {
          this.websocket = new WS(url, { headers }) as WebSocket;
        } catch {
          this.websocket = new WS(url, undefined, { headers }) as WebSocket;
        }
      } else this.websocket = new WebSocket(url);

      let settled = false;

      const onOpen = () => {
        this.reconnectAttempts = 0;
      };

      const onMessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data) as WsServerMessage;
          if (msg.type === "welcome") {
            this.sessionId = msg.data.sessionId;
            this.emitSystem("_connected", this.sessionId);
            this.resubscribeEvents();
            this.startHeartbeat();
            if (!settled) {
              settled = true;
              resolve();
            }
          }
          this.handleParsedMessage(msg);
        } catch {}
      };

      const onError = (error: Event) => {
        cleanup();
        if (!settled) {
          settled = true;
          reject(new NeuroApiError("WS_ERROR", "WebSocket connection error"));
        }
      };

      const onClose = (event: CloseEvent) => {
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
  public disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimeout();
    this.stopHeartbeat();
    if (this.websocket) {
      this.websocket.close(1000, "Client disconnect");
      this.websocket = null;
    }
    this.sessionId = null;
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const msg = JSON.parse(event.data) as WsServerMessage;
      this.handleParsedMessage(msg);
    } catch (error) {
      this.emitSystem("_error", new NeuroApiError("WS_PARSE_ERROR", "Failed to parse message"));
    }
  }

  private handleParsedMessage(msg: WsServerMessage): void {
    switch (msg.type) {
      case "event":
        this.handleEventMessage(msg as WsEventMessage);
        break;
      case "addSuccess":
        if (msg.data.subscribed) {
          this.subscribedEvents.add(msg.data.eventType);
          this.pendingSubscriptions.delete(msg.data.eventType);
          this.emitSystem("_eventAdded", msg.data.eventType);
        } else
          this.emitSystem("_error", new NeuroApiError("WS_SUBSCRIBE_FAILED", `Server rejected event subscription: ${msg.data.eventType}`));

        break;
      case "removeSuccess":
        if (msg.data.unsubscribed) {
          this.subscribedEvents.delete(msg.data.eventType);
          this.emitSystem("_eventRemoved", msg.data.eventType);
        } else
          this.emitSystem(
            "_error",
            new NeuroApiError("WS_UNSUBSCRIBE_FAILED", `Server rejected event unsubscription: ${msg.data.eventType}`),
          );

        break;
      case "invalid":
        this.emitSystem("_error", new NeuroApiError("WS_INVALID", msg.data.message || msg.data.reason));
        break;
      case "pong":
        this.acknowledgeHeartbeat();
        this.emitSystem("_pong");
        break;
    }

    this.emitSystem("_message", msg);
  }

  private handleEventMessage(msg: WsEventMessage): void {
    const eventType = msg.data.eventType;
    const listeners = this.eventListeners.get(eventType);
    if (!listeners) return;

    listeners.forEach((entry) => {
      try {
        entry.callback(msg.data.eventData, msg.data.timestamp);
      } catch {}
    });
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    this.sessionId = null;
    this.emitSystem("_disconnected", event.code, event.reason);

    if (!this.isIntentionallyClosed && this.autoReconnect) this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this._maxReconnectAttempts > 0 && this.reconnectAttempts >= this._maxReconnectAttempts) {
      this.emitSystem("_reconnectFailed");
      return;
    }

    // Exponential backoff with jitter: baseDelay * 2^attempts + random(0-1000ms)
    const delay = Math.min(
      this._reconnectBaseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000, // Max 30 seconds
    );

    this.reconnectAttempts++;
    this.emitSystem("_reconnecting", this.reconnectAttempts, delay);

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      try {
        await this.connect();
      } catch {
        if (!this.isIntentionallyClosed && this.autoReconnect) this.scheduleReconnect();
      }
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (!this.autoHeartbeat) return;

    this.sendHeartbeatPing();
    this.heartbeatIntervalHandle = setInterval(() => this.sendHeartbeatPing(), this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalHandle) {
      clearInterval(this.heartbeatIntervalHandle);
      this.heartbeatIntervalHandle = null;
    }

    if (this.heartbeatTimeoutHandle) {
      clearTimeout(this.heartbeatTimeoutHandle);
      this.heartbeatTimeoutHandle = null;
    }

    this.pendingHeartbeat = false;
  }

  private sendHeartbeatPing(): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    if (this.pendingHeartbeat) {
      this.emitSystem("_error", new NeuroApiError("WS_HEARTBEAT_TIMEOUT", "Heartbeat pong timeout"));
      this.websocket.close(4002, "Heartbeat timeout");
      return;
    }

    this.pendingHeartbeat = true;
    this.sendPing();

    this.heartbeatTimeoutHandle = setTimeout(() => {
      if (!this.pendingHeartbeat) return;
      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

      this.emitSystem("_error", new NeuroApiError("WS_HEARTBEAT_TIMEOUT", "Heartbeat pong timeout"));
      this.websocket.close(4002, "Heartbeat timeout");
    }, this.heartbeatTimeoutMs);
  }

  private acknowledgeHeartbeat(): void {
    if (!this.pendingHeartbeat) return;

    this.pendingHeartbeat = false;
    if (this.heartbeatTimeoutHandle) {
      clearTimeout(this.heartbeatTimeoutHandle);
      this.heartbeatTimeoutHandle = null;
    }
  }

  private sendPing(): void {
    this.send({ type: "ping", data: {} });
  }

  private resubscribeEvents(): void {
    for (const eventType of this.subscribedEvents) {
      this.sendSubscribe(eventType);
    }
    for (const eventType of this.pendingSubscriptions) {
      this.sendSubscribe(eventType);
    }
  }

  private sendSubscribe(eventType: WsEventType): void {
    this.send({ type: "addEvent", data: { eventType } });
  }

  private sendUnsubscribe(eventType: WsEventType): void {
    this.send({ type: "removeEvent", data: { eventType } });
  }

  private send(message: WsClientMessage): void {
    if (this.websocket?.readyState === WebSocket.OPEN) this.websocket.send(JSON.stringify(message));
  }

  private isEventType(event: WsEventType | WsSystemEvent): event is WsEventType {
    return (
      event === "blogFeedUpdate" ||
      event === "scheduleUpdate" ||
      event === "subathonUpdate" ||
      event === "subathonGoalUpdate" ||
      event === "streamOnline" ||
      event === "streamUpdate" ||
      event === "streamOffline" ||
      event === "secretneuroaccountOnline" ||
      event === "streamRaidIncoming" ||
      event === "streamRaidOutgoing"
    );
  }

  /**
   * Registers an event listener for a data event or system event.
   * @param event - The event type to listen to.
   * @param callback - Callback invoked when the event is received.
   * @returns Unsubscribe function.
   */
  public on<T extends WsEventType>(event: T, callback: (data: WsEventDataMap[T], timestamp: number) => void): () => void;
  public on<T extends WsSystemEvent>(event: T, callback: WsSystemEventCallback<T>): () => void;
  public on(
    event: WsEventType | WsSystemEvent,
    callback: ((...args: any[]) => void) | ((data: any, timestamp: number) => void),
  ): () => void {
    if (this.isEventType(event)) {
      if (!this.eventListeners.has(event)) this.eventListeners.set(event, new Set());

      const entry: WsEventListenerEntry<any> = { callback: callback as (data: any, timestamp: number) => void };
      this.eventListeners.get(event)!.add(entry);

      if (!this.subscribedEvents.has(event) && !this.pendingSubscriptions.has(event)) {
        this.pendingSubscriptions.add(event);
        if (this.isConnected) this.sendSubscribe(event);
      }

      return () => this.off(event, callback as (data: any, timestamp: number) => void);
    }

    if (!this.systemListeners.has(event)) this.systemListeners.set(event, new Set());
    this.systemListeners.get(event)!.add(callback as (...args: any[]) => void);
    return () => this.off(event, callback as (...args: any[]) => void);
  }

  /**
   * Removes an event listener for a data event or system event.
   * @param event - The event type to remove the listener from.
   * @param callback - The callback to remove.
   */
  public off<T extends WsEventType>(event: T, callback: (data: WsEventDataMap[T], timestamp: number) => void): void;
  public off<T extends WsSystemEvent>(event: T, callback: WsSystemEventCallback<T>): void;
  public off(event: WsEventType | WsSystemEvent, callback: ((...args: any[]) => void) | ((data: any, timestamp: number) => void)): void {
    if (this.isEventType(event)) {
      const listeners = this.eventListeners.get(event);
      if (!listeners) return;

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
        if (this.isConnected) this.sendUnsubscribe(event);
      }
      return;
    }

    this.systemListeners.get(event)?.delete(callback as (...args: any[]) => void);
  }

  private emitSystem<T extends WsSystemEvent>(event: T, ...args: Parameters<WsSystemEventCallback<T>>): void {
    const listeners = this.systemListeners.get(event);
    if (!listeners) return;
    listeners.forEach((cb) => {
      try {
        (cb as (...args: any[]) => void)(...args);
      } catch {}
    });
  }

  /** Returns a list of currently subscribed event types. */
  public getSubscribedEvents(): WsEventType[] {
    return Array.from(this.subscribedEvents);
  }

  /** Requests the list of available events from the server. */
  public requestEventList(): void {
    this.send({ type: "listEvents", data: {} });
  }

  /** Removes all event listeners and disconnects. */
  public destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.systemListeners.clear();
    this.subscribedEvents.clear();
    this.pendingSubscriptions.clear();
  }
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
   * Default: `30000` (minimum `5000`).
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
export type WsEventType =
  | "blogFeedUpdate"
  | "scheduleUpdate"
  | "subathonUpdate"
  | "subathonGoalUpdate"
  | "streamOnline"
  | "streamUpdate"
  | "streamOffline"
  | "secretneuroaccountOnline"
  | "streamRaidIncoming"
  | "streamRaidOutgoing";

/** System events emitted by the WebSocket client. */
export type WsSystemEvent =
  | "_connected"
  | "_disconnected"
  | "_reconnecting"
  | "_reconnectFailed"
  | "_error"
  | "_message"
  | "_pong"
  | "_eventAdded"
  | "_eventRemoved";

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

export type WsInvalidReason =
  | "malformed"
  | "unauthenticated"
  | "missingEventtype"
  | "invalidEventtype"
  | "missingToken"
  | "invalidToken"
  | "authError";

/** Event data for streamOnline event. */
export interface WsStreamOnlineData {
  isLive: true;
  id: string;
  title: string;
  game: { id: string; name: string };
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
  game: { id: string; name: string };
  language: string;
  isMature: boolean;
}

/** Event data for raid events. */
export interface WsStreamRaidData {
  channel: { displayName: string; name: string; id: string };
  viewerCount: number;
}

/** Event data for scheduleUpdate event. */
export interface WsScheduleUpdateData {
  year: number;
  week: number;
  schedule: ScheduleEntry[];
  isFinal: boolean;
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

export interface BlogFeedResponse {
  data: BlogFeedData;
}

export interface WsBlogFeedUpdateData extends BlogFeedData {}

/** Event data for subathonUpdate event. */
export interface WsSubathonUpdateData {
  year: number;
  name: string;
  subcount: number;
  goals: { [goal: number]: SubathonGoal };
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
  blogFeedUpdate: WsBlogFeedUpdateData;
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
  data: { sessionId: string };
}

interface WsInvalidMessage {
  type: "invalid";
  data: { reason: WsInvalidReason; message?: string };
}

interface WsAddSuccessMessage {
  type: "addSuccess";
  data: { eventType: WsEventType; subscribed: boolean };
}

interface WsRemoveSuccessMessage {
  type: "removeSuccess";
  data: { eventType: WsEventType; unsubscribed: boolean };
}

interface WsListEventsMessage {
  type: "listEvents";
  data: { subscribedEvents: WsEventType[]; availableEvents: WsEventType[] };
}

interface WsPongMessage {
  type: "pong";
  data: Record<string, never>;
}

interface WsEventMessage<T extends WsEventType = WsEventType> {
  type: "event";
  data: { eventType: T; eventData: WsEventDataMap[T]; timestamp: number };
}

export type WsServerMessage =
  | WsWelcomeMessage
  | WsInvalidMessage
  | WsAddSuccessMessage
  | WsRemoveSuccessMessage
  | WsListEventsMessage
  | WsPongMessage
  | WsEventMessage;

interface WsAddEventRequest {
  type: "addEvent";
  data: { eventType: WsEventType };
}

interface WsRemoveEventRequest {
  type: "removeEvent";
  data: { eventType: WsEventType };
}

interface WsListEventsRequest {
  type: "listEvents";
  data: Record<string, never>;
}

interface WsPingRequest {
  type: "ping";
  data: Record<string, never>;
}

type WsClientMessage = WsAddEventRequest | WsRemoveEventRequest | WsListEventsRequest | WsPingRequest;

interface WsEventListenerEntry<T extends WsEventType> {
  callback: (data: WsEventDataMap[T], timestamp: number) => void;
}

interface EventListenerEntry<T extends ApiClientEvent> {
  callback: ApiClientEventCallback<T>;
}

export interface ApiClientEvents {
  streamOnline: TwitchStreamData;
  streamOffline: TwitchStreamData;
  streamUpdate: TwitchStreamData;
  scheduleUpdate: ScheduleLatestResponse;
  subathonUpdate: SubathonData;
  subathonGoalUpdate: { subathon: SubathonData; goal: SubathonGoal; goalNumber: number };
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
  startedAt?: number; // Unix timestamp
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
  createdAt: number; // Unix timestamp
  publishedAt: number; // Unix timestamp
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
  day: number; // 0-6, Sunday-Saturday
  time: number; // Unix timestamp in milliseconds
  message: string;
  type: "normal" | "offline" | "canceled" | "TBD" | "unknown";
}

export interface SubathonData {
  year: number;
  name: string;
  subcount: number;
  goals: { [goalNumber: number]: SubathonGoal };
  isActive: boolean;
  startTimestamp?: number; // Unix timestamp
  endTimestamp?: number; // Unix timestamp
}

export type SubathonYearsResponse = string[];
export type SubathonYearsDetailedResponse = Record<number, string>;

export interface SubathonGoal {
  name: string;
  completed: boolean;
  reached: boolean; // dynamically calculated
}
