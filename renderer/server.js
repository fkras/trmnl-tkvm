import http from "node:http";
import { chromium } from "playwright";

const PORT = Number(process.env.PORT ?? 3001);
const TARGET_URL = process.env.TARGET_URL ?? "http://takvimi:3000/trmnl";
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 60_000);
const VIEWPORT = {
  width: 1872,
  height: 1404,
  deviceScaleFactor: 1,
};

let cachedPng = null;
let cachedAt = 0;
let renderPromise = null;
let browserPromise = null;

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body);

  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

function isCacheFresh() {
  return cachedPng && Date.now() - cachedAt < CACHE_TTL_MS;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      args: ["--disable-dev-shm-usage"],
    });
  }

  return browserPromise;
}

async function renderScreenPng() {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: VIEWPORT });

  try {
    const response = await page.goto(TARGET_URL, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    if (!response?.ok()) {
      throw new Error(`Target returned ${response?.status() ?? "no response"}`);
    }

    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector(".trmnl-page", { state: "visible", timeout: 10_000 });

    const png = await page.screenshot({
      type: "png",
      fullPage: false,
      animations: "disabled",
    });

    cachedPng = png;
    cachedAt = Date.now();
    return png;
  } finally {
    await page.close().catch((error) => {
      console.warn(`Unable to close Playwright page: ${error.message}`);
    });
  }
}

async function getScreenPng() {
  if (isCacheFresh()) {
    return cachedPng;
  }

  if (!renderPromise) {
    renderPromise = renderScreenPng().finally(() => {
      renderPromise = null;
    });
  }

  return renderPromise;
}

function requestHandler(request, response) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/screen.png") {
    getScreenPng()
      .then((png) => {
        response.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": png.length,
          "Cache-Control": `public, max-age=${Math.max(0, Math.floor(CACHE_TTL_MS / 1000))}`,
        });
        response.end(png);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unknown render error";
        console.error(`TRMNL render failed: ${message}`);
        sendJson(response, 502, { ok: false, error: "Unable to render screen.png" });
      });
    return;
  }

  sendJson(response, 404, { ok: false, error: "Not found" });
}

const server = http.createServer(requestHandler);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`TRMNL renderer listening on ${PORT}; target=${TARGET_URL}`);
});

async function shutdown() {
  server.close();

  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    await browser?.close().catch((error) => {
      console.warn(`Unable to close Playwright browser: ${error.message}`);
    });
  }

  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown();
});
process.on("SIGINT", () => {
  void shutdown();
});
