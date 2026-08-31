This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## TRMNL X

The normal website stays available at `/`. A dedicated e-ink view is available at `/trmnl` and renders a fixed 1872 x 1404 layout for TRMNL X.

Docker Compose includes a separate `renderer` service that uses Playwright Chromium to capture `http://takvimi:3000/trmnl` inside the Compose network. The renderer exposes:

- `GET /screen.png` on port `3001` in the container, mapped to host port `3101` by default.
- `GET /health` for Portainer and container health checks.

Relevant Compose environment variables:

- `HOST_PORT`: host port for the Next.js `takvimi` service, default `3000`.
- `RENDERER_HOST_PORT`: host port for the renderer service, default `3101`.
- `TRMNL_TARGET_URL`: internal page URL for Playwright, default `http://takvimi:3000/trmnl`.
- `TRMNL_CACHE_TTL_MS`: short PNG cache lifetime, default `60000`.
- `TZ`: timezone used by both services, default `Europe/Belgrade`.

Local checks:

```bash
npm run lint
npm run build
docker compose up -d --build
curl http://localhost:3000/
curl http://localhost:3000/trmnl
curl http://localhost:3101/health
curl -o screen.png http://localhost:3101/screen.png
```

In Portainer, redeploy the existing stack from this repository so both `takvimi` and `renderer` services are built. nginx is not part of this repository. If you later want `https://trmnl.fkras.com/screen.png` to expose the renderer, add a reverse-proxy location for `/screen.png` to the renderer host port or container upstream.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
