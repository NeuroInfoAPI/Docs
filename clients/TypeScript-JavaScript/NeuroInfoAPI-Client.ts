export type ApiResult<T> = { data: T; error: null } | { data: null; error: NeuroApiError };
type TimeoutHandle = ReturnType<typeof setTimeout>;
type IntervalHandle = ReturnType<typeof setInterval>;
const enum WebSocketState { Connecting, Open, Closing, Closed }
const enum SubscriptionState { Unsubscribed = "unsubscribed", Subscribing = "subscribing", Subscribed = "subscribed", Unsubscribing = "unsubscribing" }

const apiVersion = "v2";
const defaultApiBaseUrl = `neuro.appstun.net/api/${apiVersion}`;

function invokeSafely(callback: (...args: any[]) => unknown, ...args: any[]): void {
  try {
    const result = callback(...args);
    if (result && typeof (result as PromiseLike<unknown>).then === "function") void Promise.resolve(result).catch(() => {});
  } catch {}
}

function clearTimeoutHandle(handle: TimeoutHandle | null): null {
  if (handle != null) clearTimeout(handle);
  return null;
}

function clearIntervalHandle(handle: IntervalHandle | null): null {
  if (handle != null) clearInterval(handle);
  return null;
}

function createClientUrls(apiBaseUrl: string = defaultApiBaseUrl, useTls?: boolean): ClientUrls {
  const protocol = apiBaseUrl.match(/^(https?|wss?):\/\//i)?.[1]?.toLowerCase();
  if (protocol)
    console.warn(
      "[NeuroInfoAPI] Protocols in apiBaseUrl are deprecated and will stop being supported in a future major version. Remove the protocol and use useTls instead.",
    );
  const base = apiBaseUrl.replace(/^(?:https?|wss?):\/\//i, "").replace(/^\/+|\/+$/g, "");
  if (!base || /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(base) || /[?#]/.test(base))
    throw new TypeError("apiBaseUrl must contain a host and API path without query or hash");
  const tls = useTls ?? (protocol ? protocol.endsWith("s") : true);
  return { api: `${tls ? "https" : "http"}://${base}`, websocket: `${tls ? "wss" : "ws"}://${base}/ws` };
}

function deriveApiUrl(websocketUrl: string): string {
  const url = new URL(websocketUrl);
  url.protocol = url.protocol === "ws:" ? "http:" : "https:";
  url.pathname = url.pathname.replace(/\/ws(?:\/.*)?$/, "");
  url.search = url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

// Boot check: fires once and warns when this client no longer targets the current public API version.
let bootCheckFired = false;
async function bootCheck(baseUrlOrApiBase: string, clientApiVer: string = apiVersion): Promise<void> {
  if (bootCheckFired) return;
  bootCheckFired = true;

  try {
    const infoUrl = `${baseUrlOrApiBase.replace(/\/api\/v\d+.*$/, "/api")}/info`;
    const resp = await fetch(infoUrl);
    if (!resp.ok) return;
    const json = await resp.json();
    const latestVersion = typeof json?.data?.latestVersion === "string" ? json.data.latestVersion : null;
    const currentVersionInfo = json?.data?.versions?.[clientApiVer] as
      | { status?: string; message?: string; sunset?: string; docsUrl?: string }
      | undefined;
    const latestVersionInfo = latestVersion ? (json?.data?.versions?.[latestVersion] as { docsUrl?: string } | undefined) : undefined;
    const currentStatus = currentVersionInfo?.status;

    if (latestVersion && latestVersion !== clientApiVer) {
      switch (currentStatus) {
        case "deprecated":
          const parsedSunsetDate = currentVersionInfo?.sunset ? new Date(currentVersionInfo.sunset) : null;
          const sunsetDate = parsedSunsetDate && Number.isFinite(parsedSunsetDate.getTime()) ? parsedSunsetDate : null;
          console.warn(
            `\x1b[33m[NeuroInfoAPI] API ${clientApiVer} is deprecated and will be turned off${sunsetDate ? ` on ${sunsetDate.toISOString()}` : ""}.\x1b[0m`,
          );
          break;
        case "removed":
          console.warn(
            `\x1b[31m[NeuroInfoAPI] API ${clientApiVer} is no longer available. Please update to the latest version.${latestVersionInfo?.docsUrl ? ` See ${latestVersionInfo.docsUrl}` : ""}\x1b[0m`,
          );
          break;
        default:
          console.warn(
            `\x1b[33m[NeuroInfoAPI] API ${clientApiVer} is not the latest version. The latest version is ${latestVersion}.\x1b[0m`,
          );
          break;
      }
    }
  } catch {
    // Silently ignore — boot check is non-critical
  }
}

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

export class HttpRequestError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}

/**
 * Lightweight fetch wrapper with configurable defaults.
 */
export class HttpClient {
  private readonly config: Required<HttpClientOptions>;

  constructor(options: HttpClientOptions = {}) {
    const timeout = options.timeout == null || !Number.isFinite(options.timeout) || options.timeout < 0 ? 10000 : options.timeout;
    this.config = { baseURL: options.baseURL ?? "", timeout, headers: options.headers ?? {} };
  }

  /** @deprecated Use `new HttpClient(options)` instead. */
  public static create(options: HttpClientOptions = {}): HttpClient {
    return new HttpClient(options);
  }

  async request<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const fullUrl = this.buildUrl(url, options.query);
    const controller = options.signal ? null : new AbortController();
    const signal = options.signal ?? controller!.signal;
    const timeoutId = controller ? setTimeout(() => controller.abort(), this.config.timeout) : null;
    const method = options.method ?? "GET";

    try {
      const response = await fetch(fullUrl, { method, headers: { ...this.config.headers, ...options.headers }, signal });

      let data: unknown;
      try {
        data = await response.json();
      } catch (error) {
        if (signal.aborted || (error instanceof Error && error.name === "AbortError"))
          throw new HttpRequestError(options.signal ? "Request aborted" : "Request timeout");
        if (response.ok && method.toUpperCase() !== "HEAD" && response.status !== 204 && response.status !== 205)
          throw new HttpRequestError("Invalid JSON response", response.status);
        data = undefined;
      }

      if (!response.ok) throw new HttpRequestError(`Request failed with status ${response.status}`, response.status, data);

      return data as T;
    } catch (error) {
      if (error instanceof HttpRequestError) throw error;
      if (error instanceof Error && error.name === "AbortError")
        throw new HttpRequestError(options.signal ? "Request aborted" : "Request timeout");
      throw new HttpRequestError(error instanceof Error ? error.message : "Network error");
    } finally {
      clearTimeoutHandle(timeoutId);
    }
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const isAbsoluteUrl = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path);
    let url: URL;

    try {
      if (isAbsoluteUrl) url = new URL(path);
      else {
        const base = this.config.baseURL.replace(/\/+$/, "");
        if (base) {
          const relativePath = path.startsWith("/") ? path : `/${path}`;
          url = new URL(`${base}${relativePath}`);
        } else if (typeof location !== "undefined") url = new URL(path, location.origin);
        else throw new HttpRequestError("A baseURL is required for relative request URLs");
      }
    } catch (error) {
      if (error instanceof HttpRequestError) throw error;
      throw new HttpRequestError(`Invalid request URL: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (query)
      for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));

    return url.toString();
  }
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
export class NeuroApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public timestamp?: number,
    public path?: string,
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
  public apiInstance: HttpClient;
  private apiToken: string | null = null;

  /**
   * Creates a new API client instance.
   * @param token - Optional authentication token
   * @param options - Optional configuration options
   */
  constructor(token: string | undefined = undefined, options: NeuroInfoApiClientOptions = {}) {
    const apiUrl =
      options.apiBaseUrl != null ? createClientUrls(options.apiBaseUrl, options.useTls).api : (options.baseUrl ?? createClientUrls().api);
    this.apiInstance = new HttpClient({ baseURL: apiUrl, timeout: options.requestTimeoutMs, headers: { "Content-Type": "application/json" } });

    if (token != null) this.setApiToken(token);

    bootCheck(apiUrl);
  }

  /**
   * Parses an error into a NeuroApiError with proper code and message.
   */
  private parseError(error: unknown): NeuroApiError {
    if (error instanceof HttpRequestError) {
      const apiError = (error.data as { error?: Partial<ApiErrorBody> & { code?: string; message?: string } } | undefined)?.error;
      if (apiError?.code && apiError?.message) {
        return new NeuroApiError(
          apiError.code,
          apiError.message,
          error.status,
          typeof apiError.timestamp === "number" ? apiError.timestamp : undefined,
          typeof apiError.path === "string" ? apiError.path : undefined,
        );
      }
      if (error.status == null) return new NeuroApiError("NETWORK", error.message || "Network error");
      return new NeuroApiError("HTTP_ERROR", `Request failed with status ${error.status}`, error.status);
    }
    return new NeuroApiError("UNKNOWN", String(error));
  }

  /** Sets the API token for authentication. Pass `null` to remove the token. */
  public setApiToken(token: string | null): void {
    this.apiToken = token;
  }

  /** Generic request wrapper that handles errors consistently. */
  private async request<T>(url: string, params?: Record<string, unknown>): Promise<ApiResult<T>> {
    try {
      const response = await this.apiInstance.request<T | { data: T }>(url, {
        ...(params !== undefined ? { query: params } : {}),
        ...(this.apiToken != null ? { headers: { Authorization: `Bearer ${this.apiToken}` } } : {}),
      });
      // Unwrap { data: T } response envelope
      const data = response && typeof response === "object" && "data" in response ? response.data : response;
      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: this.parseError(error) };
    }
  }

  /**
   * Fetches the current stream data.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#current-stream-status-1
   */
  public getCurrentStream = () => this.request<TwitchStreamState>("/twitch/stream");

  /**
   * Fetches all VODs (Video on Demand).
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#all-vods-1
   */
  public getAllVods = () => this.request<TwitchVod[]>("/twitch/vods");

  /**
   * Fetches a specific VOD by stream ID.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/twitch.md#specific-vod-1
   */
  public getVod = (id: string) => this.request<TwitchVod>("/twitch/vod", { id });

  /**
   * Fetches the schedule for a specific week and year.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#specific-weekly-schedule-1
   */
  public getSchedule = (week: number, year?: number) =>
    this.request<ScheduleData>("/schedule", { week, ...(year !== undefined ? { year } : {}) });

  /**
   * Fetches the latest weekly schedule.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#latest-weekly-schedule-1
   */
  public getLatestSchedule = () => this.request<LatestScheduleData>("/schedule/latest");

  /**
   * Fetches available schedule week numbers grouped by year.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#schedule-weeks-index-1
   */
  public getScheduleWeeks = () => this.request<ScheduleWeeksResponse>("/schedule/weeks");

  /**
   * Fetches the devstream schedule times.
   */
  public getDevstreamTimes = () => this.request<number[]>("/devstream/times");

  /**
   * Searches schedule entries by message text with optional filters and cursor pagination.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/schedule.md#search-weekly-schedules
   */
  public getScheduleSearch = (query: string, options?: Omit<ScheduleSearchOptions, "query">) => {
    const params: Record<string, unknown> = { query, limit: options?.limit, year: options?.year, sort: options?.sort, type: options?.type };

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
  public getCurrentSubathons = () => this.request<SubathonData[]>("/subathon");

  /**
   * Fetches subathon data for a specific year.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#subathon-data-specific-year-1
   */
  public getSubathon = (year: number) => this.request<SubathonData>("/subathon", { year });

  /**
   * Fetches the years for which subathon data is available.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/subathon.md#subathon-years-1
   */
  public getSubathonYears = () => this.request<SubathonYearsResponse>("/subathon/years");

  /**
   * Fetches the Neuro-sama blog feed. Requires an API token.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/blog.md#endpoint
   */
  public getBlogFeed = (raw: boolean = false) => this.request<BlogFeedData>("/blog", raw ? { raw: true } : undefined);

  /**
   * Fetches the cached X feed for one of the supported accounts. Requires an API token.
   * @docs https://github.com/Appstun/NeuroInfoAPI-Docs/blob/master/x-feed.md#endpoint
   */
  public getXFeed = (user: XFeedAccount) => this.request<XFeedEntry[]>("/x-feed", { user });
}

/**
 * Event-based wrapper for the NeuroInfo API.
 * Automatically polls the API at regular intervals and emits events when data changes.
 * Supports events: streamOnline, streamOffline, streamUpdate, scheduleUpdate, subathonUpdate, subathonGoalUpdate.
 * @deprecated The WebSocket client provides a more efficient and real-time way to receive updates. Consider using NeuroInfoApiWebsocketClient instead for new implementations.
 */
export class NeuroInfoApiEventer {
  private readonly client = new NeuroInfoApiClient();
  private readonly events: EventerState = { listeners: new Map(), cache: {}, loop: { timer: null, processing: false, intervalMs: 60000 } };
  /** Interval in milliseconds between event fetches. Default is 60000 (60 seconds). Minimum is 10000 (10 seconds). */
  public get fetchInterval(): number {
    return this.events.loop.intervalMs;
  }
  public set fetchInterval(value: number) {
    if (!Number.isFinite(value)) return;
    const interval = Math.max(value, 10000);
    if (this.events.loop.intervalMs === interval) return;
    this.events.loop.intervalMs = interval;

    if (this.events.loop.timer != null) {
      clearIntervalHandle(this.events.loop.timer);
      this.events.loop.timer = setInterval(() => void this.processEvents(), this.events.loop.intervalMs);
    }
  }

  constructor() {
    console.warn("NeuroInfoApiEventer is deprecated. Please use NeuroInfoApiWebsocketClient for real-time updates instead.");
  }

  private async processEvents() {
    if (this.events.loop.processing) return;
    this.events.loop.processing = true;

    try {
      const events = new Set(this.events.listeners.keys());
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const needsStream = events.has("streamOnline") || events.has("streamOffline") || events.has("streamUpdate");
      const needsSchedule = events.has("scheduleUpdate");
      const needsSubathon = events.has("subathonUpdate") || events.has("subathonGoalUpdate");

      const strResult = needsStream ? await this.client.getCurrentStream() : null;
      if (needsSchedule && needsStream) await delay(100);
      const scheResult = needsSchedule ? await this.client.getLatestSchedule() : null;
      if (needsSubathon && (needsStream || needsSchedule)) await delay(100);
      const subResult = needsSubathon ? await this.client.getCurrentSubathons() : null;
      // The REST endpoint reports an empty active-subathon set as SB1/404. For
      // polling transitions this is a valid empty state, not a fetch failure.
      const subData = subResult?.data ?? (subResult?.error.code === "SB1" ? [] : null);

      const emitError = (listeners: Set<EventListenerEntry<any>>, error: NeuroApiError) =>
        listeners.forEach((entry) => {
          if (entry.onError) invokeSafely(entry.onError, error);
        });
      const emit = (listeners: Set<EventListenerEntry<any>>, data: any) => listeners.forEach((entry) => invokeSafely(entry.callback, data));
      const hasChanged = (cached: any, current: any) => !cached || JSON.stringify(cached) !== JSON.stringify(current);

      for (const [event, listeners] of this.events.listeners) {
        switch (event) {
          case "streamOnline":
          case "streamOffline":
          case "streamUpdate": {
            if (!strResult?.data) {
              if (strResult?.error) emitError(listeners, strResult.error);
              break;
            }
            const cached = this.events.cache.streamData;
            let shouldEmit = false;

            if (event === "streamOnline") shouldEmit = cached?.isLive !== true && strResult.data.isLive;
            else if (event === "streamOffline") shouldEmit = cached?.isLive === true && !strResult.data.isLive;
            else shouldEmit = cached != null && cached.isLive === strResult.data.isLive && hasChanged(cached, strResult.data);

            if (shouldEmit) emit(listeners, strResult.data);
            break;
          }

          case "scheduleUpdate": {
            if (!scheResult?.data) {
              if (scheResult?.error) emitError(listeners, scheResult.error);
              break;
            }
            if (hasChanged(this.events.cache.latestSchedule, scheResult.data)) emit(listeners, scheResult.data);

            break;
          }
          case "subathonUpdate": {
            if (!subData) {
              if (subResult?.error) emitError(listeners, subResult.error);
              break;
            }
            const cached = this.events.cache.currentSubathons;

            for (const sub of subData) {
              const cachedSub = cached?.find((s) => s.year === sub.year);
              if (hasChanged(cachedSub, sub)) emit(listeners, sub);
            }

            if (cached)
              for (const cachedSub of cached)
                if (!subData.find((s) => s.year === cachedSub.year)) emit(listeners, { ...cachedSub, isActive: false });
            break;
          }
          case "subathonGoalUpdate": {
            if (!subData) {
              if (subResult?.error) emitError(listeners, subResult.error);
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

      if (strResult?.data != null) this.events.cache.streamData = strResult.data;
      if (scheResult?.data != null) this.events.cache.latestSchedule = scheResult.data;
      if (subData) this.events.cache.currentSubathons = subData;
    } finally {
      this.events.loop.processing = false;
    }
  }

  /** Starts the event loop that fetches events at regular intervals. */
  public startEventLoop(): void {
    if (this.events.loop.timer != null) return;
    void this.processEvents();
    this.events.loop.timer = setInterval(() => void this.processEvents(), this.fetchInterval);
  }

  /** Stops the event loop that fetches events at regular intervals. */
  public stopEventLoop(): void {
    this.events.loop.timer = clearIntervalHandle(this.events.loop.timer);
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
    if (!this.events.listeners.has(event)) this.events.listeners.set(event, new Set());
    const entry: EventListenerEntry<T> = { callback, ...(onError !== undefined ? { onError } : {}) };
    this.events.listeners.get(event)!.add(entry);

    return () => {
      const listeners = this.events.listeners.get(event);
      if (listeners?.delete(entry) && listeners.size === 0) this.events.listeners.delete(event);
    };
  }

  /**
   * Removes an event listener for the specified event.
   *
   * @param event - The event name to remove the listener from.
   * @param callback - The callback function to remove.
   */
  public off<T extends ApiClientEvent>(event: T, callback: ApiClientEventCallback<T>): void {
    const listeners = this.events.listeners.get(event);
    if (listeners) {
      for (const entry of listeners) {
        if (entry.callback === callback) {
          listeners.delete(entry);
          if (listeners.size === 0) this.events.listeners.delete(event);
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
        return callback(data);
      }) as ApiClientEventCallback<T>,
      onError
        ? (error: NeuroApiError) => {
            unsubscribe();
            return onError(error);
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
    const listeners = this.events.listeners.get(event);
    if (!listeners) return;
    listeners.forEach((entry) => invokeSafely(entry.callback, data));
  }

  /**
   * Removes all event listeners for a specific event or all events.
   *
   * @param event - (Optional) The event name to remove all listeners from.
   *                If not provided, removes all listeners for all events.
   */
  public removeAllListeners(event?: ApiClientEvent): void {
    if (event) {
      this.events.listeners.delete(event);
    } else {
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
  private connection: WsConnectionState | null = null;
  private readonly auth: WsAuthState;
  private readonly urls: ClientUrls;
  private readonly listeners: WsListenerState = { events: new Map(), system: new Map() };
  private readonly reconnect: WsReconnectState = { attempts: 0, timeout: null };
  private readonly lifecycle: WsLifecycleState = { intentionallyClosed: false, destroyGeneration: 0 };
  private readonly settings: WsClientSettings = { autoReconnect: true, autoHeartbeat: true, maxReconnectAttempts: 10, reconnectBaseDelay: 1000, heartbeatIntervalMs: 30000, heartbeatTimeoutMs: 10000, connectTimeoutMs: 15000 };

  /** Whether to automatically reconnect on disconnect. Default is true. */
  public get autoReconnect(): boolean {
    return this.settings.autoReconnect;
  }
  public set autoReconnect(value: boolean) {
    this.settings.autoReconnect = value;
    if (!value) {
      this.clearReconnectTimeout();
      const connection = this.connection;
      if (connection?.isAutomaticReconnect && connection.sessionId == null) this.disconnect();
    }
  }

  /** Whether to automatically send heartbeat pings while connected. Default is true. */
  public get autoHeartbeat(): boolean {
    return this.settings.autoHeartbeat;
  }
  public set autoHeartbeat(value: boolean) {
    if (this.settings.autoHeartbeat === value) return;
    this.settings.autoHeartbeat = value;

    const connection = this.connection;
    if (!connection || !this.isConnected) return;
    if (value) this.startHeartbeat(connection);
    else this.stopHeartbeat(connection);
  }

  /** Maximum number of reconnect attempts. Default is 10. Set to 0 for unlimited. */
  public get maxReconnectAttempts(): number {
    return this.settings.maxReconnectAttempts;
  }
  public set maxReconnectAttempts(value: number) {
    if (Number.isFinite(value)) this.settings.maxReconnectAttempts = Math.max(0, value);
  }

  /** Base delay in milliseconds for reconnection backoff. Default is 1000ms. */
  public get reconnectBaseDelay(): number {
    return this.settings.reconnectBaseDelay;
  }
  public set reconnectBaseDelay(value: number) {
    if (Number.isFinite(value)) this.settings.reconnectBaseDelay = Math.max(100, value);
  }

  /** Interval in milliseconds for heartbeat pings. Default is 30000ms. Minimum is 5000ms. */
  public get heartbeatIntervalMs(): number {
    return this.settings.heartbeatIntervalMs;
  }
  public set heartbeatIntervalMs(value: number) {
    if (!Number.isFinite(value)) return;
    const interval = Math.max(5000, value);
    if (this.settings.heartbeatIntervalMs === interval) return;
    this.settings.heartbeatIntervalMs = interval;

    const connection = this.connection;
    const heartbeat = connection?.heartbeat;
    if (connection && heartbeat) this.scheduleHeartbeatInterval(connection, heartbeat);
  }

  /** Timeout in milliseconds waiting for a heartbeat pong. Default is 10000ms. Minimum is 1000ms. */
  public get heartbeatTimeoutMs(): number {
    return this.settings.heartbeatTimeoutMs;
  }
  public set heartbeatTimeoutMs(value: number) {
    if (!Number.isFinite(value)) return;
    const timeout = Math.max(1000, value);
    if (this.settings.heartbeatTimeoutMs === timeout) return;
    this.settings.heartbeatTimeoutMs = timeout;

    const connection = this.connection;
    const heartbeat = connection?.heartbeat;
    if (connection && heartbeat?.timeout != null) this.scheduleHeartbeatTimeout(connection, heartbeat);
  }

  /** Timeout in milliseconds for ticket fetching and the WebSocket welcome. Default is 15000ms. Minimum is 1000ms. */
  public get connectTimeoutMs(): number {
    return this.settings.connectTimeoutMs;
  }
  public set connectTimeoutMs(value: number) {
    if (Number.isFinite(value)) this.settings.connectTimeoutMs = Math.max(1000, value);
  }

  /**
   * Creates a new WebSocket client instance.
   * @param token - Authentication token (required for connection)
   * @param options - Optional configuration options
   */
  constructor(token: string, options: NeuroInfoApiWebsocketClientOptions = {}) {
    this.auth = { token, method: options.authMethod ?? "ticket" };
    const legacyWebsocketUrl = options.websocketUrl ?? options.baseUrl;
    this.urls = legacyWebsocketUrl
      ? {
          api: options.apiBaseUrl != null ? createClientUrls(options.apiBaseUrl, options.useTls).api : deriveApiUrl(legacyWebsocketUrl),
          websocket: legacyWebsocketUrl,
        }
      : createClientUrls(options.apiBaseUrl, options.useTls);
    if (options.autoReconnect != null) this.autoReconnect = options.autoReconnect;
    if (options.autoHeartbeat != null) this.autoHeartbeat = options.autoHeartbeat;
    if (options.maxReconnectAttempts != null) this.maxReconnectAttempts = options.maxReconnectAttempts;
    if (options.reconnectBaseDelay != null) this.reconnectBaseDelay = options.reconnectBaseDelay;
    if (options.heartbeatIntervalMs != null) this.heartbeatIntervalMs = options.heartbeatIntervalMs;
    if (options.heartbeatTimeoutMs != null) this.heartbeatTimeoutMs = options.heartbeatTimeoutMs;
    if (options.connectTimeoutMs != null) this.connectTimeoutMs = options.connectTimeoutMs;
    bootCheck(this.urls.api);
  }

  /** Returns the current connection state. */
  public get readyState(): number {
    return this.connection?.socket?.readyState ?? WebSocketState.Closed;
  }

  /** Returns true if the WebSocket is connected and ready. */
  public get isConnected(): boolean {
    return this.connection?.socket?.readyState === WebSocketState.Open && this.connection.sessionId != null;
  }

  /** Returns the current session ID (available after connection). */
  public getSessionId(): string | null {
    return this.connection?.sessionId ?? null;
  }

  /** Updates the authentication token. Reconnects if currently connected. */
  public setToken(token: string): void {
    const shouldReconnect = this.connection?.socket != null || this.connection?.connect?.promise != null;
    const destroyGeneration = this.lifecycle.destroyGeneration;
    this.auth.token = token;
    if (shouldReconnect) {
      this.disconnect();
      if (this.lifecycle.destroyGeneration !== destroyGeneration) return;
      void this.connect().catch((error) => {
        const parsed = error instanceof NeuroApiError ? error : new NeuroApiError("WS_RECONNECT_ERROR", String(error));
        this.emitSystem("_error", parsed);
      });
    }
  }

  /** Alias matching the HTTP client token setter. */
  public setApiToken(token: string): void {
    this.setToken(token);
  }

  /**
   * Connects to the WebSocket server.
   * Uses the configured `authMethod` to authenticate.
   * @returns Promise that resolves when connected, rejects on error.
   */
  public connect(): Promise<void> {
    return this.connectWithContext(false);
  }

  /** Starts either a user-requested or automatic reconnect attempt. */
  private connectWithContext(isAutomaticReconnect: boolean): Promise<void> {
    const currentConnection = this.connection;
    if (
      currentConnection?.socket?.readyState === WebSocketState.Open ||
      currentConnection?.socket?.readyState === WebSocketState.Connecting
    )
      return currentConnection.connect?.promise || Promise.resolve();
    if (currentConnection?.connect?.promise) return currentConnection.connect.promise;

    if (!isAutomaticReconnect) {
      // A user-requested connection starts a fresh retry cycle after a previous exhaustion.
      this.reconnect.attempts = 0;
    }
    this.lifecycle.intentionallyClosed = false;
    this.clearReconnectTimeout();
    const connect: WsConnectState = { promise: null, abortController: new AbortController(), timeout: null, abortError: new NeuroApiError("WS_CONNECT_CANCELLED", "WebSocket connection was cancelled"), onAbort: () => {} };
    const connection: WsConnectionState = { socket: null, sessionId: null, connect, heartbeat: null, isAutomaticReconnect };
    this.connection = connection;

    const cancelled = new Promise<never>((_, reject) => {
      connect.onAbort = () => reject(connect.abortError);
    });
    connect.abortController.signal.addEventListener("abort", connect.onAbort, { once: true });
    connect.timeout = setTimeout(() => {
      connect.timeout = null;
      connect.abortError = new NeuroApiError("WS_CONNECT_TIMEOUT", "WebSocket connection timed out");
      connect.abortController.abort();
      if (this.connection !== connection || this.lifecycle.intentionallyClosed) return;

      this.connection = null;
      connection.connect = null;
      this.stopHeartbeat(connection);
      const socket = connection.socket;
      if (socket) {
        if (socket.readyState !== WebSocketState.Closing && socket.readyState !== WebSocketState.Closed)
          socket.close(4000, "Connection timeout");
        this.emitSystem("_disconnected", 4000, "Connection timeout");
        if (!this.lifecycle.intentionallyClosed && this.autoReconnect) this.scheduleReconnect();
      }
    }, this.connectTimeoutMs);
    const promise = Promise.race([this.connectInternal(connection, connect), cancelled]);
    connect.promise = promise;

    promise.then(
      () => {
        connect.timeout = clearTimeoutHandle(connect.timeout);
        connect.abortController.signal.removeEventListener("abort", connect.onAbort);
        if (this.connection === connection) connection.connect = null;
      },
      () => {
        connect.timeout = clearTimeoutHandle(connect.timeout);
        connect.abortController.signal.removeEventListener("abort", connect.onAbort);
        if (this.connection === connection) {
          connection.connect = null;
          if (!connection.socket) this.connection = null;
        }
      },
    );
    return promise;
  }

  private async connectInternal(connection: WsConnectionState, connect: WsConnectState): Promise<void> {
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
  private async fetchTicket(signal: AbortSignal): Promise<string> {
    try {
      const json = await new HttpClient({ baseURL: this.urls.api }).request<{ data?: { ticket?: string } }>("/ws/ticket", {
        headers: { Authorization: `Bearer ${this.auth.token}` },
        signal,
      });
      if (!json.data?.ticket) throw new NeuroApiError("TICKET_ERROR", "Invalid ticket response from server");
      return json.data.ticket;
    } catch (error) {
      if (signal.aborted) throw new NeuroApiError("WS_CONNECT_CANCELLED", "WebSocket connection was cancelled");
      if (error instanceof NeuroApiError) throw error;
      const detail =
        error instanceof HttpRequestError
          ? ((error.data as { error?: { message?: string } } | undefined)?.error?.message ?? error.message)
          : error instanceof Error
            ? error.message
            : "Unknown error";
      throw new NeuroApiError(
        "TICKET_ERROR",
        `Failed to fetch connection ticket: ${detail}`,
        error instanceof HttpRequestError ? error.status : undefined,
      );
    }
  }

  /** Internal: Connect to WebSocket with the given URL and optional headers */
  private connectWithUrl(
    url: string,
    connection: WsConnectionState,
    connect: WsConnectState,
    headers?: Record<string, string>,
  ): Promise<void> {
    const signal = connect.abortController.signal;
    return new Promise((resolve, reject) => {
      if (signal.aborted || this.connection !== connection || this.lifecycle.intentionallyClosed) {
        reject(new NeuroApiError("WS_CONNECT_CANCELLED", "WebSocket connection was cancelled"));
        return;
      }

      // Pass headers using runtime-compatible constructor variants.
      let socket: WebSocket;
      try {
        const WS = WebSocket as any;
        if (headers) {
          try {
            socket = new WS(url, { headers }) as WebSocket;
          } catch {
            socket = new WS(url, undefined, { headers }) as WebSocket;
          }
        } else socket = new WS(url) as WebSocket;
      } catch (error) {
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

      const onMessage = (event: MessageEvent) => {
        if (this.connection !== connection || connection.socket !== socket) return;
        try {
          const msg = JSON.parse(event.data) as WsServerMessage;
          if (msg.type === "welcome") {
            this.reconnect.attempts = 0;
            connection.sessionId = msg.data.sessionId;
            signal.removeEventListener("abort", onAbort);
            this.resubscribeEvents();
            this.startHeartbeat(connection);
            this.emitSystem("_connected", connection.sessionId);
            if (this.connection !== connection || connection.socket !== socket) return;
            if (!settled) {
              settled = true;
              resolve();
            }
          }
          this.handleParsedMessage(msg, connection);
        } catch {
          this.emitSystem("_error", new NeuroApiError("WS_PARSE_ERROR", "Failed to parse message"));
        }
      };

      const onError = (error: Event) => {
        if (this.connection !== connection || connection.socket !== socket) return;
        this.emitSystem("_error", error);
        if (!settled) {
          settled = true;
          reject(new NeuroApiError("WS_ERROR", "WebSocket connection error"));
          if (socket.readyState !== WebSocketState.Closing && socket.readyState !== WebSocketState.Closed)
            socket.close(1011, "WebSocket connection error");
        }
      };

      const onClose = (event: CloseEvent) => {
        cleanup();
        if (!settled) {
          settled = true;
          reject(new NeuroApiError("WS_CLOSED", `Connection closed: ${event.reason || "Unknown reason"}`, event.code));
        }
        if (this.connection !== connection || connection.socket !== socket) return;
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
  public disconnect(): void {
    this.lifecycle.intentionallyClosed = true;
    this.clearReconnectTimeout();

    const connection = this.connection;
    this.connection = null;
    if (!connection) return;

    const connect = connection.connect;
    connection.connect = null;
    connect?.abortController.abort();
    const pendingConnect = connect?.promise;
    void pendingConnect?.catch(() => {});
    this.stopHeartbeat(connection);

    const socket = connection.socket;
    if (socket) {
      if (socket.readyState !== WebSocketState.Closing && socket.readyState !== WebSocketState.Closed)
        socket.close(1000, "Client disconnect");
      this.emitSystem("_disconnected", 1000, "Client disconnect");
    }
  }

  private handleParsedMessage(msg: WsServerMessage, connection: WsConnectionState): void {
    switch (msg.type) {
      case "event":
        this.handleEventMessage(msg as WsEventMessage);
        break;
      case "addSuccess":
        {
          const subscription = this.listeners.events.get(msg.data.eventType);
          if (!subscription || subscription.state !== SubscriptionState.Subscribing) break;

          // `false` means the server already had this subscription, which is still the desired state.
          subscription.state = SubscriptionState.Subscribed;
          this.emitSystem("_eventAdded", msg.data.eventType);
          this.syncSubscription(msg.data.eventType, subscription);
        }

        break;
      case "removeSuccess":
        {
          const subscription = this.listeners.events.get(msg.data.eventType);
          if (!subscription || subscription.state !== SubscriptionState.Unsubscribing) break;

          // `false` means the server already removed this subscription, which is still the desired state.
          subscription.state = SubscriptionState.Unsubscribed;
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

  private handleEventMessage(msg: WsEventMessage): void {
    const eventType = msg.data.eventType;
    const subscription = this.listeners.events.get(eventType);
    if (!subscription) return;

    subscription.listeners.forEach((entry) => invokeSafely(entry.callback, msg.data.eventData, msg.data.timestamp));
  }

  private handleClose(connection: WsConnectionState, event: CloseEvent): void {
    if (this.connection !== connection) return;
    this.connection = null;
    connection.connect = null;
    this.stopHeartbeat(connection);
    this.emitSystem("_disconnected", event.code, event.reason);

    if (!this.lifecycle.intentionallyClosed && this.autoReconnect) this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.connection != null) return;
    if (this.reconnect.timeout || this.lifecycle.intentionallyClosed || !this.autoReconnect) return;
    if (this.reconnect.attempts < 0) return; // Negative means the final failure was already emitted.
    if (this.maxReconnectAttempts > 0 && this.reconnect.attempts >= this.maxReconnectAttempts) {
      this.reconnect.attempts = -this.reconnect.attempts;
      this.emitSystem("_reconnectFailed");
      return;
    }

    // Exponential backoff with jitter: baseDelay * 2^attempts + random(0-1000ms)
    const delay = Math.min(
      this.reconnectBaseDelay * Math.pow(2, this.reconnect.attempts) + Math.random() * 1000,
      30000, // Max 30 seconds
    );

    this.reconnect.attempts++;
    const reconnectTimeout = setTimeout(async () => {
      if (this.reconnect.timeout !== reconnectTimeout) return;
      this.reconnect.timeout = null;
      if (this.connection != null || this.lifecycle.intentionallyClosed || !this.autoReconnect) return;
      try {
        await this.connectWithContext(true);
      } catch {
        if (!this.lifecycle.intentionallyClosed && this.autoReconnect) this.scheduleReconnect();
      }
    }, delay);
    this.reconnect.timeout = reconnectTimeout;
    this.emitSystem("_reconnecting", this.reconnect.attempts, delay);

    if (this.connection != null || this.lifecycle.intentionallyClosed || !this.autoReconnect) this.clearReconnectTimeout();
  }

  private clearReconnectTimeout(): void {
    this.reconnect.timeout = clearTimeoutHandle(this.reconnect.timeout);
  }

  private startHeartbeat(connection: WsConnectionState): void {
    this.stopHeartbeat(connection);
    if (!this.autoHeartbeat || this.connection !== connection) return;

    const heartbeat: WsHeartbeatState = { interval: null, timeout: null };
    connection.heartbeat = heartbeat;
    this.sendHeartbeatPing(connection, heartbeat);
    this.scheduleHeartbeatInterval(connection, heartbeat);
  }

  private scheduleHeartbeatInterval(connection: WsConnectionState, heartbeat: WsHeartbeatState): void {
    heartbeat.interval = clearIntervalHandle(heartbeat.interval);
    if (this.connection !== connection || connection.heartbeat !== heartbeat || !this.autoHeartbeat) return;

    heartbeat.interval = setInterval(() => this.sendHeartbeatPing(connection, heartbeat), this.heartbeatIntervalMs);
  }

  private stopHeartbeat(connection: WsConnectionState): void {
    const heartbeat = connection.heartbeat;
    if (!heartbeat) return;

    connection.heartbeat = null;
    heartbeat.interval = clearIntervalHandle(heartbeat.interval);
    heartbeat.timeout = clearTimeoutHandle(heartbeat.timeout);
  }

  private sendHeartbeatPing(connection: WsConnectionState, heartbeat: WsHeartbeatState): void {
    const socket = connection.socket;
    if (this.connection !== connection || connection.heartbeat !== heartbeat || socket?.readyState !== WebSocketState.Open) return;

    if (heartbeat.timeout != null) return;
    this.scheduleHeartbeatTimeout(connection, heartbeat);
    this.sendPing(connection);
  }

  private scheduleHeartbeatTimeout(connection: WsConnectionState, heartbeat: WsHeartbeatState): void {
    heartbeat.timeout = clearTimeoutHandle(heartbeat.timeout);

    const socket = connection.socket;
    if (this.connection !== connection || connection.heartbeat !== heartbeat || socket?.readyState !== WebSocketState.Open) return;

    heartbeat.timeout = setTimeout(() => {
      heartbeat.timeout = null;
      if (this.connection !== connection || connection.heartbeat !== heartbeat || socket.readyState !== WebSocketState.Open) return;

      this.emitSystem("_error", new NeuroApiError("WS_HEARTBEAT_TIMEOUT", "Heartbeat pong timeout"));
      socket.close(4002, "Heartbeat timeout");
    }, this.heartbeatTimeoutMs);
  }

  private acknowledgeHeartbeat(connection: WsConnectionState): void {
    const heartbeat = connection.heartbeat;
    if (this.connection !== connection || heartbeat?.timeout == null) return;

    heartbeat.timeout = clearTimeoutHandle(heartbeat.timeout);
  }

  private sendPing(connection: WsConnectionState): void {
    const socket = connection.socket;
    if (this.connection === connection && socket?.readyState === WebSocketState.Open)
      socket.send(JSON.stringify({ type: "ping", data: {} } satisfies WsPingRequest));
  }

  private resubscribeEvents(): void {
    for (const [eventType, subscription] of this.listeners.events) {
      subscription.state = SubscriptionState.Unsubscribed;
      this.syncSubscription(eventType, subscription);
    }
  }

  /** Reconciles one event's server-side subscription with its current listeners. */
  private syncSubscription(eventType: WsEventType, subscription: WsEventSubscription<any>): void {
    const shouldSubscribe = subscription.listeners.size > 0;
    if (!this.isConnected) return;

    if (shouldSubscribe && subscription.state === SubscriptionState.Unsubscribed) {
      subscription.state = SubscriptionState.Subscribing;
      this.sendSubscribe(eventType);
      return;
    }

    if (!shouldSubscribe && subscription.state === SubscriptionState.Subscribed) {
      subscription.state = SubscriptionState.Unsubscribing;
      this.sendUnsubscribe(eventType);
      return;
    }

    if (!shouldSubscribe && subscription.state === SubscriptionState.Unsubscribed) this.removeInactiveSubscription(eventType, subscription);
  }

  /** Deletes a local subscription only after the server is known not to hold it. */
  private removeInactiveSubscription(eventType: WsEventType, subscription: WsEventSubscription<any>): void {
    if (
      this.listeners.events.get(eventType) === subscription &&
      subscription.listeners.size === 0 &&
      subscription.state === SubscriptionState.Unsubscribed
    )
      this.listeners.events.delete(eventType);
  }

  private sendSubscribe(eventType: WsEventType): void {
    this.send({ type: "addEvent", data: { eventType } });
  }

  private sendUnsubscribe(eventType: WsEventType): void {
    this.send({ type: "removeEvent", data: { eventType } });
  }

  private send(message: WsClientMessage): void {
    const socket = this.connection?.socket;
    if (this.isConnected && socket) socket.send(JSON.stringify(message));
  }

  private isEventType(event: WsEventType | WsSystemEvent): event is WsEventType {
    return wsEventTypes.has(event as WsEventType);
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
      let subscription = this.listeners.events.get(event);
      if (!subscription) {
        subscription = { listeners: new Set(), state: SubscriptionState.Unsubscribed };
        this.listeners.events.set(event, subscription);
      }

      const entry: WsEventListenerEntry<any> = { callback: callback as (data: any, timestamp: number) => void };
      subscription.listeners.add(entry);
      this.syncSubscription(event, subscription);

      return () => this.removeEventListenerEntry(event, entry);
    }

    if (!this.listeners.system.has(event)) this.listeners.system.set(event, new Set());
    this.listeners.system.get(event)!.add(callback as (...args: any[]) => void);
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
      const subscription = this.listeners.events.get(event);
      if (!subscription) return;

      for (const entry of subscription.listeners) {
        if (entry.callback === callback) {
          this.removeEventListenerEntry(event, entry);
          break;
        }
      }
      return;
    }

    const listeners = this.listeners.system.get(event);
    if (listeners?.delete(callback as (...args: any[]) => void) && listeners.size === 0) this.listeners.system.delete(event);
  }

  private removeEventListenerEntry(event: WsEventType, entry: WsEventListenerEntry<any>): void {
    const subscription = this.listeners.events.get(event);
    if (!subscription?.listeners.delete(entry) || subscription.listeners.size > 0) return;

    // A closed connection cannot retain a server-side subscription, so an empty
    // local entry can be removed without waiting for an acknowledgement.
    if (!this.isConnected) subscription.state = SubscriptionState.Unsubscribed;
    this.syncSubscription(event, subscription);
    this.removeInactiveSubscription(event, subscription);
  }

  private emitSystem<T extends WsSystemEvent>(event: T, ...args: Parameters<WsSystemEventCallback<T>>): void {
    const listeners = this.listeners.system.get(event);
    if (!listeners) return;
    listeners.forEach((callback) => invokeSafely(callback, ...args));
  }

  /** Returns a list of currently subscribed event types. */
  public getSubscribedEvents(): WsEventType[] {
    return Array.from(this.listeners.events)
      .filter(([, subscription]) => subscription.state === SubscriptionState.Subscribed)
      .map(([eventType]) => eventType);
  }

  /** Requests the list of available events from the server. */
  public requestEventList(): void {
    this.send({ type: "listEvents", data: {} });
  }

  /** Removes all event listeners and disconnects. */
  public destroy(): void {
    this.lifecycle.destroyGeneration++;
    this.listeners.events.clear();
    this.listeners.system.clear();
    this.disconnect();
  }
}

export namespace Utils {
  export function isScheduleFinal(status: ScheduleStatus): boolean {
    return status === "confirmed";
  }

  export function isScheduleEntryOnline(entry: ScheduleEntry): boolean {
    return entry.type === "normal" || entry.type === "TBD";
  }

  export function isScheduleEntryOffline(entry: ScheduleEntry): boolean {
    return entry.type === "offline" || entry.type === "canceled";
  }

  export function isScheduleEntryUnknown(entry: ScheduleEntry): boolean {
    return entry.type === "unknown";
  }

  export function hasScheduleImage(entry: ScheduleData): boolean {
    return entry.imageUrl !== null && entry.imageUrl.trim() !== "";
  }
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

export type WsInvalidReason =
  | "malformed"
  | "unauthenticated"
  | "missingEventtype"
  | "invalidEventtype"
  | "missingToken"
  | "invalidToken"
  | "authError";

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
  channel: { displayName: string; name: string; id: string };
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

export type XFeedMedia = { type: "image"; url: string } | { type: "video"; url: string; posterUrl?: string; mimeType?: string };

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
] as const satisfies readonly WsEventType[]);

type WsEmptyData = Record<string, never>;
type WsMessage<Type extends string, Data = WsEmptyData> = { type: Type; data: Data };
type WsEventSelection = { eventType: WsEventType };
type WsWelcomeMessage = WsMessage<"welcome", { sessionId: string }>;
type WsAuthSuccessMessage = WsMessage<"authSuccess">;
type WsInvalidMessage = WsMessage<"invalid", { reason: WsInvalidReason; message?: string }>;
type WsAddSuccessMessage = WsMessage<"addSuccess", WsEventSelection & { subscribed: boolean }>;
type WsRemoveSuccessMessage = WsMessage<"removeSuccess", WsEventSelection & { unsubscribed: boolean }>;
type WsListEventsMessage = WsMessage<"listEvents", { subscribedEvents: WsEventType[]; availableEvents: WsEventType[] }>;
type WsPongMessage = WsMessage<"pong">;
type WsEventMessage<T extends WsEventType = WsEventType> = {
  [EventType in T]: WsMessage<"event", { eventType: EventType; eventData: WsEventDataMap[EventType]; timestamp: number }>;
}[T];
export type WsServerMessage =
  | WsWelcomeMessage
  | WsAuthSuccessMessage
  | WsInvalidMessage
  | WsAddSuccessMessage
  | WsRemoveSuccessMessage
  | WsListEventsMessage
  | WsPongMessage
  | WsEventMessage;

type WsAddEventRequest = WsMessage<"addEvent", WsEventSelection>;
type WsRemoveEventRequest = WsMessage<"removeEvent", WsEventSelection>;
type WsListEventsRequest = WsMessage<"listEvents">;
type WsPingRequest = WsMessage<"ping">;

type WsClientMessage = WsAddEventRequest | WsRemoveEventRequest | WsListEventsRequest | WsPingRequest;

type WsEventListenerEntry<T extends WsEventType> = { callback: (data: WsEventDataMap[T], timestamp: number) => void };
/** The server-side state currently known to the client. */
type WsEventSubscription<T extends WsEventType> = {
  listeners: Set<WsEventListenerEntry<T>>;
  state: SubscriptionState;
};

type WsListenerState = { events: Map<WsEventType, WsEventSubscription<any>>; system: Map<WsSystemEvent, Set<(...args: any[]) => void>> };
type ClientUrls = { api: string; websocket: string };
type WsAuthState = { token: string; method: "ticket" | "header" };
type WsLifecycleState = { intentionallyClosed: boolean; destroyGeneration: number };
type WsClientSettings = { autoReconnect: boolean; autoHeartbeat: boolean; maxReconnectAttempts: number; reconnectBaseDelay: number; heartbeatIntervalMs: number; heartbeatTimeoutMs: number; connectTimeoutMs: number };
type WsHeartbeatState = { interval: IntervalHandle | null; timeout: TimeoutHandle | null };

type WsConnectState = { promise: Promise<void> | null; abortController: AbortController; timeout: TimeoutHandle | null; abortError: NeuroApiError; onAbort: () => void };
type WsConnectionState = { socket: WebSocket | null; sessionId: string | null; connect: WsConnectState | null; heartbeat: WsHeartbeatState | null; isAutomaticReconnect: boolean };

type WsReconnectState = { attempts: number; timeout: TimeoutHandle | null };

/** Base stream shape kept for backwards-compatible access to live-only optional fields. */
export interface TwitchStreamData extends Partial<StreamMetadata> {
  isLive: boolean;
  id?: string;
  tags?: string[];
  viewerCount?: number;
  startedAt?: number; // Unix timestamp
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
  createdAt: number; // Unix timestamp
  publishedAt: number; // Unix timestamp
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
  day: number; // 0-6, Sunday-Saturday
  time: number; // Unix timestamp in milliseconds
  message: string;
  type: ScheduleEntryType;
}

export interface SubathonData {
  year: number;
  name: string;
  subcount: number;
  goals: { [goalNumber: number]: SubathonGoal };
  subcountMilestones?: SubathonSubcountMilestone;
  isActive: boolean;
  startTimestamp?: number; // Unix timestamp
  endTimestamp?: number; // Unix timestamp
}

export type SubathonSubcountMilestone = { [milestone: number]: { timestamp: number } };

export type SubathonYearsResponse = Record<number, string>;

export interface SubathonGoal {
  name: string;
  completed: boolean;
  reached: boolean; // dynamically calculated
}

// Deprecated compatibility types and aliases. Remove with the next major API/client version. Or so... ¯\_(ツ)_/¯

/** @deprecated Only used by the deprecated `NeuroInfoApiEventer`. Use `TwitchStreamState` or the WebSocket event types instead. */
export type EventerStreamData = TwitchStreamData;

/** @deprecated Event map used only by the deprecated `NeuroInfoApiEventer`. Use `WsEventDataMap` with `NeuroInfoApiWebsocketClient` instead. */
export interface ApiClientEvents {
  streamOnline: EventerStreamData;
  streamOffline: EventerStreamData;
  streamUpdate: EventerStreamData;
  scheduleUpdate: LatestScheduleData;
  subathonUpdate: SubathonData;
  subathonGoalUpdate: { subathon: SubathonData; goal: SubathonGoal; goalNumber: number };
}

/** @deprecated Event name used only by the deprecated `NeuroInfoApiEventer`. Use `WsEventType` instead. */
export type ApiClientEvent = keyof ApiClientEvents;

/** @deprecated Callback type used only by the deprecated `NeuroInfoApiEventer`. Use a WebSocket event callback instead. */
export type ApiClientEventCallback<T extends ApiClientEvent> = (data: ApiClientEvents[T]) => void;

/** @deprecated Internal type used only by the deprecated `NeuroInfoApiEventer`. */
type EventListenerEntry<T extends ApiClientEvent> = { callback: ApiClientEventCallback<T>; onError?: (error: NeuroApiError) => void };

/** @deprecated Internal state used only by the deprecated `NeuroInfoApiEventer`. */
type EventerState = { listeners: Map<ApiClientEvent, Set<EventListenerEntry<any>>>; cache: Partial<{ streamData: TwitchStreamState; latestSchedule: LatestScheduleData; currentSubathons: SubathonData[] }>; loop: { timer: IntervalHandle | null; processing: boolean; intervalMs: number } };

/** @deprecated Use `Utils.isScheduleFinal` instead. */
export const isScheduleFinal = Utils.isScheduleFinal;

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
