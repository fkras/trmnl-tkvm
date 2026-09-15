import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function getCacheFilePath(fileName: string): string {
  return process.env.VERCEL ? path.join(os.tmpdir(), fileName) : path.join(process.cwd(), ".dashboard-cache", fileName);
}

export async function readDashboardCache<T>(
  fileName: string,
  isValidPayload: (input: unknown) => input is T,
): Promise<T | null> {
  const filePath = getCacheFilePath(fileName);

  try {
    await access(filePath);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    return isValidPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeDashboardCache<T>(fileName: string, payload: T): Promise<void> {
  const filePath = getCacheFilePath(fileName);

  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cache write error";
    console.warn(`Unable to write dashboard cache ${fileName}: ${message}`);
  }
}

export function isFreshTimestamp(updatedAt: string, ttlMs: number): boolean {
  const updatedAtTime = new Date(updatedAt).getTime();

  if (Number.isNaN(updatedAtTime)) {
    return false;
  }

  return Date.now() - updatedAtTime < ttlMs;
}
