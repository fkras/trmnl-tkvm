import { isFreshTimestamp, readDashboardCache, writeDashboardCache } from "@/lib/dashboard-cache";

const PLEX_CACHE_FILE = "plex-cache.json";
const PLEX_CACHE_TTL_MS = Number(process.env.PLEX_CACHE_TTL_MS ?? 30 * 60 * 1000);
const PLEX_RECENT_LIMIT = Number(process.env.PLEX_RECENT_LIMIT ?? 6);
const PLEX_FETCH_TIMEOUT_MS = Number(process.env.PLEX_FETCH_TIMEOUT_MS ?? 8_000);

export type PlexMediaItem = {
  title: string;
  subtitle: string;
  type: string;
  added_at: string;
};

export type PlexDashboardData = {
  is_configured: boolean;
  status: "ok" | "unconfigured" | "stale" | "error";
  updated_at: string;
  items: PlexMediaItem[];
};

export type PlexResult = {
  source: "plex" | "cache" | "empty";
  data: PlexDashboardData;
};

type PlexMetadataItem = {
  title?: unknown;
  type?: unknown;
  year?: unknown;
  addedAt?: unknown;
  parentTitle?: unknown;
  grandparentTitle?: unknown;
  index?: unknown;
  parentIndex?: unknown;
  librarySectionTitle?: unknown;
};

type PlexRecentlyAddedResponse = {
  MediaContainer?: {
    Metadata?: PlexMetadataItem[];
  };
};

function getPlexUrl(): string {
  return process.env.PLEX_URL?.trim().replace(/\/+$/, "") ?? "";
}

function getPlexToken(): string {
  return process.env.PLEX_TOKEN?.trim() ?? "";
}

function isConfigured(): boolean {
  return Boolean(getPlexUrl() && getPlexToken());
}

function emptyPlexData(status: PlexDashboardData["status"] = "unconfigured"): PlexDashboardData {
  return {
    is_configured: isConfigured(),
    status,
    updated_at: "",
    items: [],
  };
}

function formatAddedAt(value: unknown): string {
  const timestamp = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const date = new Date(timestamp * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sq-AL", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function formatEpisodeLabel(item: PlexMetadataItem): string {
  const season = toNumberValue(item.parentIndex);
  const episode = toNumberValue(item.index);

  if (season === null || episode === null) {
    return "";
  }

  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

function buildSubtitle(item: PlexMetadataItem): string {
  const mediaType = toStringValue(item.type);
  const library = toStringValue(item.librarySectionTitle);

  if (mediaType === "episode") {
    return [toStringValue(item.grandparentTitle), formatEpisodeLabel(item)].filter(Boolean).join(" ");
  }

  if (mediaType === "season") {
    return toStringValue(item.parentTitle) || library;
  }

  const year = toNumberValue(item.year);
  return [year ? String(year) : "", library].filter(Boolean).join(" · ");
}

function toMediaItem(item: PlexMetadataItem): PlexMediaItem | null {
  const title = toStringValue(item.title);

  if (!title) {
    return null;
  }

  return {
    title,
    subtitle: buildSubtitle(item),
    type: toStringValue(item.type) || "media",
    added_at: formatAddedAt(item.addedAt),
  };
}

function isValidPlexPayload(input: unknown): input is PlexDashboardData {
  if (!input || typeof input !== "object") {
    return false;
  }

  const data = input as Partial<PlexDashboardData>;
  return typeof data.is_configured === "boolean" && typeof data.status === "string" && Array.isArray(data.items);
}

async function fetchRecentlyAdded(): Promise<PlexDashboardData> {
  const response = await fetch(`${getPlexUrl()}/library/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=${PLEX_RECENT_LIMIT}`, {
    headers: {
      Accept: "application/json",
      "X-Plex-Client-Identifier": "trmnl-takvimi",
      "X-Plex-Product": "TRMNL Takvimi",
      "X-Plex-Token": getPlexToken(),
    },
    signal: AbortSignal.timeout(PLEX_FETCH_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Plex returned ${response.status}`);
  }

  const payload = (await response.json()) as PlexRecentlyAddedResponse;
  const items =
    payload.MediaContainer?.Metadata?.map((item) => toMediaItem(item))
      .filter((item): item is PlexMediaItem => item !== null)
      .slice(0, PLEX_RECENT_LIMIT) ?? [];

  return {
    is_configured: true,
    status: "ok",
    updated_at: new Date().toISOString(),
    items,
  };
}

export async function getPlexDashboardData(): Promise<PlexResult> {
  const cached = await readDashboardCache(PLEX_CACHE_FILE, isValidPlexPayload);

  if (!isConfigured()) {
    return {
      source: cached ? "cache" : "empty",
      data: cached ?? emptyPlexData(),
    };
  }

  if (cached && isFreshTimestamp(cached.updated_at, PLEX_CACHE_TTL_MS)) {
    return {
      source: "cache",
      data: cached,
    };
  }

  try {
    const freshData = await fetchRecentlyAdded();
    await writeDashboardCache(PLEX_CACHE_FILE, freshData);

    return {
      source: "plex",
      data: freshData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Plex error";
    console.warn(`Unable to load Plex data: ${message}`);

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
      data: emptyPlexData("error"),
    };
  }
}
