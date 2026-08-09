# Vidrohi Systems website

A self-contained, scroll-driven static website adapted from the supplied Vidrohi Systems presentation and the cinematic interaction language of the MCARKADE black-hole site.

## Run locally

Build first so Open Graph URLs resolve correctly, then serve the output folder:

```powershell
npm run build
cd dist
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Deploy on Vercel

Import this folder or repository into Vercel. `vercel.json` runs the small zero-dependency build automatically and serves `dist`. The build uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL` system variable so Open Graph and WhatsApp preview URLs point to the real production domain.

For CLI deployment after installing the Vercel CLI:

```powershell
npm i -g vercel
vercel deploy
```

Audio starts only after a user gesture because browsers block autoplay with sound. Motion is reduced automatically when the operating system's reduced-motion preference is enabled.
