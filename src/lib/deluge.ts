import { isFreshTimestamp, readDashboardCache, writeDashboardCache } from "@/lib/dashboard-cache";

const DELUGE_CACHE_FILE = "deluge-cache.json";
const DELUGE_CACHE_TTL_MS = Number(process.env.DELUGE_CACHE_TTL_MS ?? 2 * 60 * 1000);
const DELUGE_FETCH_TIMEOUT_MS = Number(process.env.DELUGE_FETCH_TIMEOUT_MS ?? 8_000);
const DELUGE_ITEM_LIMIT = Number(process.env.DELUGE_ITEM_LIMIT ?? 5);

export type DelugeDownloadItem = {
  name: string;
  state: string;
  progress: number;
  eta: string;
  down_speed: string;
  up_speed: string;
};

export type DelugeDashboardData = {
  is_configured: boolean;
  status: "ok" | "unconfigured" | "stale" | "error";
  updated_at: string;
  active_count: number;
  total_count: number;
  down_speed: string;
  up_speed: string;
  items: DelugeDownloadItem[];
};

export type DelugeResult = {
  source: "deluge" | "cache" | "empty";
  data: DelugeDashboardData;
};

type DelugeRpcResponse<T> = {
  id: number;
  result?: T;
  error?: {
    message?: string;
  } | null;
};

type DelugeTorrent = {
  name?: unknown;
  state?: unknown;
  progress?: unknown;
  eta?: unknown;
  download_payload_rate?: unknown;
  upload_payload_rate?: unknown;
};

type DelugeUpdateUiResult = {
  torrents?: Record<string, DelugeTorrent>;
};

function getDelugeUrl(): string {
  return process.env.DELUGE_URL?.trim().replace(/\/+$/, "") ?? "";
}

function getDelugePassword(): string {
  return process.env.DELUGE_PASSWORD?.trim() ?? "";
}

function isConfigured(): boolean {
  return Boolean(getDelugeUrl() && getDelugePassword());
}

function emptyDelugeData(status: DelugeDashboardData["status"] = "unconfigured"): DelugeDashboardData {
  return {
    is_configured: isConfigured(),
    status,
    updated_at: "",
    active_count: 0,
    total_count: 0,
    down_speed: "0 B/s",
    up_speed: "0 B/s",
    items: [],
  };
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBytesPerSecond(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) {
    return "0 B/s";
  }

  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let value = bytesPerSecond;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted = value >= 10 || unitIndex === 0 ? Math.round(value).toString() : value.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) {
    return "";
  }

  if (seconds >= 86_400) {
    return `${Math.round(seconds / 86_400)}d`;
  }

  if (seconds >= 3_600) {
    return `${Math.round(seconds / 3_600)}h`;
  }

  return `${Math.max(1, Math.round(seconds / 60))}m`;
}

function getCookieHeader(response: Response): string {
  const rawCookie = response.headers.get("set-cookie") ?? "";

  return rawCookie
    .split(/,(?=\s*[^;,]+=)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function delugeRpc<T>(method: string, params: unknown[], cookie = ""): Promise<{ result: T; cookie: string }> {
  const response = await fetch(`${getDelugeUrl()}/json`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({
      id: Date.now(),
      method,
      params,
    }),
    signal: AbortSignal.timeout(DELUGE_FETCH_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Deluge returned ${response.status}`);
  }

  const payload = (await response.json()) as DelugeRpcResponse<T>;

  if (payload.error) {
    throw new Error(payload.error.message ?? `Deluge ${method} failed`);
  }

  return {
    result: payload.result as T,
    cookie: getCookieHeader(response),
  };
}

function isActiveTorrent(item: DelugeTorrent): boolean {
  const state = toStringValue(item.state).toLowerCase();
  const downSpeed = toNumberValue(item.download_payload_rate);
  const upSpeed = toNumberValue(item.upload_payload_rate);

  return state === "downloading" || state === "seeding" || downSpeed > 0 || upSpeed > 0;
}

function toDownloadItem(item: DelugeTorrent): DelugeDownloadItem | null {
  const name = toStringValue(item.name);

  if (!name) {
    return null;
  }

  const progress = Math.max(0, Math.min(100, Math.round(toNumberValue(item.progress))));

  return {
    name,
    state: toStringValue(item.state) || "Unknown",
    progress,
    eta: formatEta(toNumberValue(item.eta)),
    down_speed: formatBytesPerSecond(toNumberValue(item.download_payload_rate)),
    up_speed: formatBytesPerSecond(toNumberValue(item.upload_payload_rate)),
  };
}

function isValidDelugePayload(input: unknown): input is DelugeDashboardData {
  if (!input || typeof input !== "object") {
    return false;
  }

  const data = input as Partial<DelugeDashboardData>;
  return (
    typeof data.is_configured === "boolean" &&
    typeof data.status === "string" &&
    typeof data.active_count === "number" &&
    typeof data.total_count === "number" &&
    Array.isArray(data.items)
  );
}

async function fetchDelugeData(): Promise<DelugeDashboardData> {
  const login = await delugeRpc<boolean>("auth.login", [getDelugePassword()]);

  if (!login.result) {
    throw new Error("Deluge login failed");
  }

  const keys = [
    "name",
    "state",
    "progress",
    "eta",
    "download_payload_rate",
    "upload_payload_rate",
  ];
  const update = await delugeRpc<DelugeUpdateUiResult>("web.update_ui", [keys, {}], login.cookie);
  const torrents = Object.values(update.result.torrents ?? {});
  const activeTorrents = torrents.filter(isActiveTorrent);
  const visibleTorrents = activeTorrents.length > 0 ? activeTorrents : torrents;
  const items = visibleTorrents
    .map((item) => toDownloadItem(item))
    .filter((item): item is DelugeDownloadItem => item !== null)
    .slice(0, DELUGE_ITEM_LIMIT);
  const downSpeed = torrents.reduce((sum, item) => sum + toNumberValue(item.download_payload_rate), 0);
  const upSpeed = torrents.reduce((sum, item) => sum + toNumberValue(item.upload_payload_rate), 0);

  return {
    is_configured: true,
    status: "ok",
    updated_at: new Date().toISOString(),
    active_count: activeTorrents.length,
    total_count: torrents.length,
    down_speed: formatBytesPerSecond(downSpeed),
    up_speed: formatBytesPerSecond(upSpeed),
    items,
  };
}

export async function getDelugeDashboardData(): Promise<DelugeResult> {
  const cached = await readDashboardCache(DELUGE_CACHE_FILE, isValidDelugePayload);

  if (!isConfigured()) {
    return {
      source: cached ? "cache" : "empty",
      data: cached ?? emptyDelugeData(),
    };
  }

  if (cached && isFreshTimestamp(cached.updated_at, DELUGE_CACHE_TTL_MS)) {
    return {
      source: "cache",
      data: cached,
    };
  }

  try {
    const freshData = await fetchDelugeData();
    await writeDashboardCache(DELUGE_CACHE_FILE, freshData);

    return {
      source: "deluge",
      data: freshData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Deluge error";
    console.warn(`Unable to load Deluge data: ${message}`);

    if (cached) {
      return {
        source: "cache",
        data: {
          ...cached,
          status: "stale",
        },
      };
    }

    return {
      source: "empty",
      data: emptyDelugeData("error"),
    };
  }
}
