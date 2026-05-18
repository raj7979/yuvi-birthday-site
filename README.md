# Yuvaan Birthday Site

A mobile first World Cup inspired birthday RSVP site for `yuvi.ca`.

It includes the features requested from the invite:

1. Countdown timer to Saturday, June 6, 2026 at 2:00 PM Eastern time
2. Confetti animation on load and after RSVP
3. RSVP form with Going, Maybe, and Not Going
4. Who is coming counter and public squad list
5. Photo upload after the party
6. Original invite preview image
7. Supabase database and storage setup
8. Cloudflare Pages ready Vite project

## Event details baked into the site

Name: Yuvaan's 7th Birthday World Cup Party

Date: Saturday, June 6, 2026

Kick off: 2:00 PM

Venue: Rain or Shine Play Centre, 55 Broadway St, Tillsonburg, ON N4G 3P4

RSVP contact: Neelam, 647 535 4017

Site: yuvi.ca

## Local setup

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env.local
```

Add your Supabase values to `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_SUPABASE_PHOTO_BUCKET=yuvi-party-photos
```

Run locally:

```bash
npm run dev
```

Build locally:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Supabase setup

1. Create a new Supabase project.
2. Open the SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Go to Project Settings, API.
5. Copy the Project URL and anon public key into `.env.local` and Cloudflare Pages environment variables.

The SQL creates:

1. `public.rsvps`
2. `public.party_photos`
3. `public.get_rsvp_summary()`
4. Public storage bucket named `yuvi-party-photos`
5. Row level security policies so guests can submit RSVPs and upload party photos

The site does not publicly expose phone or email contact values. Public visitors only see RSVP totals and names from guests who tick the public squad list checkbox.

## Photo upload timing

The photo form unlocks in the browser after June 6, 2026 at 6:00 PM Eastern time.

To test it before the party, open the site with this query string:

```text
?photos=1
```

Example in local development:

```text
http://localhost:5173/?photos=1
```

This is a friendly front end lock, not a hard security gate. For a birthday site, that is usually enough. To fully block early uploads at the database level, add a `now()` time check to the storage insert policy in `supabase/schema.sql` after you finish testing.

## Cloudflare Pages deployment

Cloudflare Pages settings:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

Add these environment variables in Cloudflare Pages for Production and Preview:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_SUPABASE_PHOTO_BUCKET=yuvi-party-photos
```

Then add `yuvi.ca` as a custom domain in the Pages project.

## Editing the invite details

Most copy is in `index.html`.

The countdown and photo unlock times are in `src/main.js`:

```js
const EVENT_START = new Date('2026-06-06T14:00:00-04:00');
const PHOTO_UNLOCK_TIME = new Date('2026-06-06T18:00:00-04:00');
```

The visual theme is in `src/styles.css`.

The original invitation image lives at:

```text
public/invite.jpg
```

## Notes

This is a private birthday site with a World Cup inspired visual theme. It is not affiliated with FIFA.
