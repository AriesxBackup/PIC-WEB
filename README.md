# PIC REF

A private website for your team's Instagram inspiration. When someone scrolls past a reel worth copying,
they paste the link (or **Share → PIC REF** on Android), write **the idea — what we could make with it** —
and the whole team sees it, plays it, votes on it, discusses it and moves it through production.

- **Feed** – every saved reel, playable right on the page, with the idea, tags, 🔥 votes and comments.
  Filter by status, tag or person, search, or sort by most votes.
- **Board** – New → Approved → In production → Posted (or Skipped).
- **Tasks** – the admin assigns a reel to someone with a due date; they see it under *My tasks* and tap
  *Start* / *Mark as posted*.
- **Live** – new reels, comments and changes appear for everyone instantly, with a notification.
- **Admin** – only admins create accounts (email + a password they choose), reset passwords, turn people
  off, make others admin, and download backups. There is no public sign-up.
- **Phone friendly** – installable as an app; on Android it shows up in Instagram's share sheet.

The board lives in **PostgreSQL**: on Railway it uses Railway's Postgres database; on your own computer it
uses a built-in copy of Postgres (stored in `data/pglite`), so it also runs there with zero setup.

---

## Try it on your computer

Needs [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the first visit asks you to **create the admin account**. Then go to
**Team** to add your teammates.

`npm run dev` is for editing code — it compiles pages on demand and is noticeably slower. For everyday
use, run the fast production version instead (same board, same `data/` folder):

```bash
npm run build
npm start
```

## See it with sample content

- **`npm run sample-reels`** – adds 20 real public Instagram reels (each with an example idea and tags) to
  *your* board as new ideas, shared by the first admin. Safe to run twice; delete any of them from the site.
- **`npm run demo`** – a separate, fully populated demo board (stop `npm run dev` first): a sample team of
  five with votes, comments, statuses, assignments and due dates. It lives in `demo-data/` — your real board
  isn't touched — and only opens on this computer. Log in with any demo account; all use the password
  `demo-board-2026`:

  | Email            | Role   |
  | ---------------- | ------ |
  | `aria@demo.team` | admin  |
  | `dev@demo.team`  | member |
  | `mia@demo.team`  | member |
  | `leo@demo.team`  | member |
  | `zara@demo.team` | member |

  Delete the `demo-data` folder to start the demo over.

## Host it on Railway (recommended)

[Railway](https://railway.com) runs the site and its PostgreSQL database for you, with HTTPS included —
so installing on phones and Android's *Share to* work straight away.

1. **Push this project to GitHub** (it's already connected to your repository).
2. In Railway: **New Project → Deploy from GitHub repo** → pick the repository. Railway finds the
   `Dockerfile` and `railway.json` (health check on `/api/health`) by itself.
3. In the same project: **+ Create → Database → PostgreSQL**.
4. Open the **web service → Variables** and add:

   | Variable       | Value                                                          |
   | -------------- | -------------------------------------------------------------- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (pick it from the suggestions)    |
   | `SETUP_TOKEN`  | any long random text — protects the first-time setup           |
   | `APP_NAME`     | optional, e.g. `PIC Reels`                                     |

5. **Settings → Networking → Generate Domain** gives you an `https://….up.railway.app` address.
6. Open `https://<your-domain>/setup?token=<SETUP_TOKEN>` and create the admin account — or first move
   your existing board up (next section).

Every push to GitHub redeploys automatically. Tables are created on first start; nothing else to set up.

**Check it's using Railway's database:** *Team* page → Backup → "Stored in: PostgreSQL at
postgres.railway.internal". If `DATABASE_URL` is missing or wrong, the site shows **Database not connected**
(and `/api/health` explains why) instead of running on a temporary database — so Railway keeps your previous
deploy and nothing gets lost. Fix the variable and Railway redeploys automatically.
Keep the service at **1 replica** (live updates are sent from a single server).

### Move your existing board to Railway

Before anyone signs up on the Railway site, copy your current board (accounts, reels, ideas, tags,
previews) into Railway's database from your computer:

1. Railway → **Postgres service → Settings → Networking → enable Public Networking**, then copy
   `DATABASE_PUBLIC_URL` from its **Variables** tab.
2. In this folder (PowerShell):

   ```powershell
   $env:DATABASE_PUBLIC_URL = "postgresql://postgres:…@….proxy.rlwy.net:12345/railway"
   npm run import -- data/app.db
   ```

   `data/app.db` is the board from the earlier SQLite version; a file from *Team → Download backup*
   works too. Everyone keeps their email and password.
3. Turn Public Networking off again afterwards if you like.

## Run it yourself (Docker)

On any server with [Docker](https://docs.docker.com/get-docker/): copy `.env.example` to `.env`
(set `APP_NAME`, `SETUP_TOKEN`, `POSTGRES_PASSWORD`), then `docker compose up -d --build`. The site runs
on port 3000 with its own PostgreSQL (data kept in the `db-data` volume).

> **Claim your site first.** On a brand-new install, whoever opens it first creates the admin account.
> On a public server, set `SETUP_TOKEN` in `.env` (any long random string) — then only
> `https://your-site/setup?token=<SETUP_TOKEN>` works until the admin exists.

### HTTPS (needed for phones)

Browsers only allow installing the app and Android's *Share to* on `https://` sites. Pick one:

- **VPS with a domain (simplest):** point a domain (e.g. `reels.yourteam.com`) at the server, put
  `DOMAIN=reels.yourteam.com` in `.env`, open ports 80/443 and run
  `docker compose --profile https up -d --build`. Caddy fetches and renews the certificate automatically.
- **A computer at home/office:** use a tunnel instead of opening ports, e.g.
  [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
  (`cloudflared tunnel --url http://localhost:3000`) or
  [Tailscale Funnel](https://tailscale.com/kb/1223/funnel) (`tailscale funnel 3000`).

## On your phone

The whole site works on phones (bottom tab bar, thumb-sized buttons, previews that load fast on mobile data).

**Quick test on the same Wi-Fi:** while `npm start` runs on your computer, open `http://<your-computer's-IP>:3000`
on the phone (find the IP with `ipconfig` → "Wi-Fi" → IPv4). Everything works there except the three things
browsers only allow on `https://` sites: the **Paste** button (long-press the box and paste instead),
**installing** the app, and Android's **Share to**. For those, use one of the HTTPS options above.

Each person can find these steps in **Settings** too.

- **Android:** open the site in Chrome → ⋮ → *Install app*. In Instagram tap **Share → More** on a reel and
  pick the app — the link lands in a new post, ready for your idea.
- **iPhone:** open the site in Safari → Share → *Add to Home Screen*. In Instagram tap **Share → Copy link**,
  open the app, tap **+** and **Paste**. (Optional: a 3-step Shortcut makes it appear in Instagram's share
  sheet — see Settings.)

## Admin notes

- **Backups:** *Team → Download backup* gives you the whole board as one JSON file (restore it into a
  fresh board with `npm run import -- <file>`). On Railway you can also turn on the Postgres **Backups**.
- **Forgot the only admin password?** From this folder: `npm run reset-password -- you@example.com new-password`
  (for the Railway site, set `$env:DATABASE_PUBLIC_URL` first, as in *Move your existing board*).
- **Local scripts and the running site:** the built-in database can only be opened by one program at a
  time — stop `npm start` before running `sample-reels`, `import` or `reset-password` locally.
- **Reels that won't play:** the player is Instagram's official embed. Private or deleted reels, and some
  with licensed music, can't play outside Instagram — the card then shows a *Watch on Instagram* button.
- **Why reels load in two steps:** each Instagram player is heavy (~50 requests), so the feed first shows a
  still preview (fetched once from Instagram's oEmbed and kept in the database) and only starts the
  real player for reels that are on screen.

## Settings

| Variable   | Default      | What it does                                         |
| ---------- | ------------ | ---------------------------------------------------- |
| `APP_NAME` | `Reel Board` | Name in the header, browser tab and phone home screen |
| `DATABASE_URL` | –        | PostgreSQL connection (Railway: `${{Postgres.DATABASE_URL}}`); empty = built-in database |
| `DATA_DIR` | `./data`     | Where the built-in database lives (`data/pglite`)    |
| `SETUP_TOKEN` | –         | Protects first-run admin setup: `/setup?token=…`     |
| `DOMAIN`   | –            | Docker + Caddy only: your domain for automatic HTTPS |
| `PORT`     | `3000`       | Port the app listens on                              |

## Development

```bash
npm run dev         # start locally
npm test            # unit tests (link parsing, data layer, passwords)
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run e2e         # end-to-end smoke test in your installed Chrome (needs an EMPTY database running)
npm run e2e:mobile  # every feature with taps on a phone-sized screen (run against `npm run demo`)
```

Built with Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4 and PostgreSQL (`pg`, PGlite).
Code map: `app/` pages and routes · `lib/data/` database queries · `lib/actions/` form actions ·
`lib/db/core.ts` database connection + schema · `components/` UI.
