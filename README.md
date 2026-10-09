# TEIN UENR – NDC Student Body membership

Members register online, pay their dues via Paystack and get an official payment receipt
(`/portal/receipt/<id>`, printable). Executives print the membership cards (CR80 / bank-card size, front + back,
with a QR code for verification) from the admin dashboard; members cannot download cards themselves.

## Run it

Hosting: **Vercel** (frontend + API) and **Supabase** (Postgres database + private Storage bucket for photos).

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev                  # http://localhost:3000
```

Tables, the `passport-photos` bucket and the first admin are created automatically on first run.
Note: if `.env.local` points at the production Supabase project, local testing writes to live data. Use a
second Supabase project for development.

## Deploy

```bash
npx vercel deploy --prod
```

Production environment variables (Vercel → Project → Settings → Environment Variables): `DATABASE_URL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_INITIAL_PASSWORD`, plus `PAYSTACK_SECRET_KEY` for real
Paystack or `ALLOW_TEST_CHECKOUT=true` for the built-in test checkout. Functions run in `dub1` (Dublin) next
to the Supabase project (eu-west-1); see `vercel.json`.

## Default admin login

Go to **/admin**:

| Username | Password    |
| -------- | ----------- |
| `admin`  | the `ADMIN_INITIAL_PASSWORD` you set (default `Admin@123`) |

You'll be asked to change the password after the first sign-in. Additional admins can be added under
**Admin → Settings**.

## Admin roles

Every executive gets their own login with one role (`lib/roles.ts`):

| Role               | Can do                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Super admin        | Everything: admins and roles, fee, signatory, activity log, deleting members |
| Finance            | Members, marking cash payments, CSV export                             |
| Membership officer | Members, correcting details, printing cards, the programme list        |
| Content editor     | The website section only                                               |

Super admins manage accounts in **Admin → Settings → Admin users**. Deactivate an executive at the end of their term
rather than sharing their password: they're signed out at once and can't sign in again, and their history stays in
the activity log. Nobody can change their own role or deactivate themselves, and there is always at least one
active super admin. Admins that existed before roles were added became super admins, keeping their passwords.

Every page and server action checks the role on the server, so hiding a button is never the only protection.

## Activity log

**Admin → Activity log** (super admins) records sign-ins (including failed attempts and lockouts), admin account
changes, cash payments, Paystack/test payment confirmations and rejected payments, member edits (with before/after
values), member deletions (with a copy of the deleted record), CSV exports, card downloads and prints, fee,
signatory and programme changes, and website edits. Filter by person, type, date or text. Each member's page shows
their own history.

The `audit_log` table is append-only: a database trigger rejects updates, deletes and truncation, from the app or
from Supabase's SQL editor alike. Card printing is logged when the Print / Download buttons are used; printing with
the browser's own menu (Ctrl+P) can't be detected.

## Payments

| `PAYSTACK_SECRET_KEY` in `.env.local` | What happens                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| _(empty)_                             | Built-in **test checkout**. Pay with MoMo `0551234987` or card `4084 0840 8408 4081`, CVV `408` |
| `sk_test_…`                           | Real Paystack checkout in test mode (Paystack's test numbers, no real money) |
| `sk_live_…`                           | Live payments                                                                |

For live payments also set the webhook URL in Paystack → Settings → API Keys & Webhooks to
`https://<your-domain>/api/paystack/webhook`, and set `NEXT_PUBLIC_SITE_URL` to your domain. Paystack returns members to
`/portal/payment/callback`.

The membership fee is set by admins in **Admin → Settings → Membership fee**; members only see it on the
last registration step and at checkout. See `.env.example` for all settings. Programs and periods are edited in `lib/config.ts`.

## Membership numbers and card period

- Membership numbers look like `BR/UENR/26/0000001` (region / institution / two-digit year of payment / running
  number). The format lives in `memberCode()` in `lib/config.ts`.
- Members register once. The card period runs from the year of payment until they complete their programme:
  `end year = payment year + (programme length − current level)`, at least one year, so final-year students get
  until the end of the next year. It is saved when payment clears, so changing the rule later doesn't alter issued
  cards. Admins can correct a member's programme length or level, which updates the end year.
- The card's signatory (name, title, signature image) is set in **Admin → Settings → Card signatory**.
- The NDC logo and UENR crest on the card are placeholders in `public/card/`. Replace those files with the official
  artwork.

## Routes

- **Main site:** `/` home, `/about`, `/activities`, `/activities/<slug>` (write-up + photo gallery), `/executives`
  (current team + past executives by term), `/contact`
- **Portal:** `/portal` landing page, `/portal/register`, `/portal/receipt/<id>`, `/portal/payment/callback`
- `/verify/<id>`: what the card's QR code opens
- Old `/register`, `/receipt/<id>` and `/card/<id>` links redirect to their new addresses.

## Main site content

Executives manage everything in **Admin → Website**:

- **Site content:** home page headline and intro, about us, mission, vision, contact details and social links.
- **Executives:** photo, name, position, term and display order. Untick "Current executive" to move someone to the
  past executives archive.
- **Activities:** create an event (it starts hidden), upload many photos at once, pick the cover, then tick "Show on
  website". Photos are resized in the browser before upload.

Site photos live in the **public** Supabase bucket `site-media` (created automatically); passport photos stay in the
private `passport-photos` bucket. Content tables are created by the schema migration in `lib/db.ts`.

## Passport photo editor

On the registration form's photo step, members position their photo in a round frame that matches the card
(drag, pinch/scroll or the slider to zoom; arrow keys and +/- also work) and the card preview updates live. The
form uploads a 600×600 JPEG of exactly what's in the frame.

The background is made white automatically on the member's device with Google MediaPipe (`lib/photo.ts`,
`components/PhotoEditor.tsx`); the photo is never sent anywhere for this. The same pass finds the head and frames
it passport-style. Members can switch the white background off to compare with the original.

- First use downloads about 20 MB (the `selfie_multiclass_256x256` model from Google's storage, kept in the
  browser's cache, plus the runtime). On data-saver or 2G connections it asks before downloading.
- The runtime (Wasm) is served from `public/mediapipe/`, copied there from `node_modules` by
  `scripts/copy-mediapipe.mjs` on every `npm install` (git-ignored, so run `npm install` after cloning).
- Anyone standing right next to the member stays in the picture; ask for a photo of one person.

## Features

- **Public:** portal landing page, registration with photo upload and year of study, payment, receipt, QR verify page.
- **Admin:** role-based access, activity log, stats, search/filter members, member details and editing, view/download/print any member's card,
  mark cash payments as paid, delete members, bulk print cards, CSV export, admin users, roles and passwords.

## Design

Light "paper" theme with the NDC colours (black, red, white, green) used as flat accents, Barlow Condensed
headlines and an umbrella-and-dove emblem (`components/brand/Umbrella.tsx`). Animations are plain CSS
(`app/globals.css`) plus React view transitions for page changes, and respect the OS "reduce motion" setting.

The main site layers a "rally poster" look on top: dark ink page headers with rising headlines and a swaying 3D
emblem, a draggable 3D ring of recent activity photos on the home page (`components/site/PhotoRing.tsx`), crossing
marquee banners, cards that tilt with a pointer glare or turn over to show an executive's bio, and a dark footer.
The portal and admin keep the plain paper theme.

## Speed

- `npm run dev` compiles each page the first time you open it; that's the "Compiling…" you see. `npm run prod`
  builds once and serves everything instantly.
- Keep the project **outside OneDrive** (e.g. `C:\Projects\uner-tein`). OneDrive syncing `.next` and
  `node_modules` slows every compile down.

