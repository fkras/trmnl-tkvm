import type { TrmnlDashboardData } from "@/lib/trmnl-dashboard";

type PushResult = {
  pushedAt: string;
  status: number;
};

function getWebhookUrl(): string {
  return process.env.TRMNL_WEBHOOK_URL?.trim() ?? "";
}

function assertValidWebhookUrl(value: string): void {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new Error("TRMNL_WEBHOOK_URL is not a valid HTTP(S) URL.");
  }
}

export function hasTrmnlWebhookUrl(): boolean {
  return getWebhookUrl().length > 0;
}

export async function pushTrmnlDashboardData(data: TrmnlDashboardData): Promise<PushResult> {
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl) {
    throw new Error("TRMNL_WEBHOOK_URL is not configured.");
  }

  assertValidWebhookUrl(webhookUrl);

  let response: Response;

  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merge_variables: data,
      }),
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`Unable to reach TRMNL webhook: ${message}`);
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    const detail = responseText ? `: ${responseText.slice(0, 240)}` : "";
    throw new Error(`TRMNL webhook returned ${response.status}${detail}`);
  }

  return {
    pushedAt: new Date().toISOString(),
    status: response.status,
  };
}
