# Kodikura Pappucharu — Dine-In System

QR-based dine-in ordering for a busy Telugu restaurant. Guests scan a table QR, browse a bilingual
(English / తెలుగు) menu, build combos, order and track their food live, and tap **Request Bill** when
they're done. Staff run everything from a merchant dashboard and a kitchen display. Payment happens at the
table with the server; there are no customer logins and no online payment gateway.

| Surface | Route | Who |
| --- | --- | --- |
| Guest menu, cart, order tracking, bill request | `/t/[tableId]` | Guests (mobile) |
| Order control center, table floor, bill alerts | `/admin` | Floor manager / cashier |
| Menu, categories, combo steps, live stock toggles | `/admin/menu` | Manager |
| KPIs, top-selling dishes, order history | `/admin/analytics` | Owner |
| Printable table QR codes (SVG / PNG) | `/admin/qr` | Manager |
| Kitchen Display System (dark, high contrast) | `/kds` | Kitchen |

## Architecture

```
┌──────────── web/ (Vercel) ────────────┐        ┌──────── server/ (Render) ────────┐
│ Next.js 15 App Router · TS · Tailwind │  REST  │ Express  /api/*                  │
│ shadcn-style UI · Lucide · Zustand    │ ─────▶ │ Socket.IO gateway (rooms)        │──▶ PostgreSQL
│ socket.io-client                      │ ◀───── │ Prisma ORM · zod validation      │    (Prisma migrations)
└───────────────────────────────────────┘   WS   └──────────────────────────────────┘
```

* **The server is the source of truth.** Order totals are always recomputed server-side from the live menu
  and the combo configuration; client prices are display-only. Unavailable items are rejected with `409`
  and the guest's cart drops them automatically.
* **Realtime events are emitted only after the DB transaction commits.** Every screen also refetches on
  socket reconnect, so a dropped connection never leaves stale state.
* **Status changes are race-safe:** transitions are validated (`pending → preparing → served → paid`, cancel
  from pending/preparing) and applied with an optimistic `WHERE status = <current>` guard, so two staff
  screens tapping the same ticket can't double-advance it.

### Repository layout

```
server/
  prisma/schema.prisma        # RestaurantTable, Category, MenuItem, ComboConfig, Order, OrderItem
  prisma/migrations/          # SQL migrations (prisma migrate)
  prisma/seed.ts              # 20 tables + authentic bilingual menu with combo steps
  src/index.ts                # Express app, security middleware, HTTP + Socket.IO bootstrap
  src/socket.ts               # Realtime gateway: room joins + typed broadcast helpers
  src/events.ts               # Event names & room names
  src/routes/{menu,orders,tables,analytics}.ts
  src/services/orders.ts      # Server-side pricing, combo validation, status transitions
  src/lib/{schemas,serialize,http}.ts
  src/middleware/{staffAuth,errors}.ts
web/
  src/app/                    # Routes: /t/[tableId], /admin/*, /kds (+ error boundaries)
  src/components/ui/          # Button, Badge, Card, Input, Switch, Dialog, Spinner (shadcn-style)
  src/components/customer/    # CustomerApp, MenuItemCard, ComboBuilder, CartBar, CartDrawer, OrderTracker
  src/components/admin/       # OrdersCenter, TableFloor, MenuManager, ItemFormDialog, Analytics, QrSheet
  src/components/kds/         # KdsBoard, KdsTicket
  src/stores/                 # Zustand: cart (persisted per table), language, staff key
  src/hooks/                  # useSocket (auto re-join + refetch on reconnect), useNow
  src/lib/                    # api client, i18n dictionary, types, chime (HTML5 Audio)
```

## Local development

Requires Node 20+ and PostgreSQL 14+.

```bash
# 1. API + realtime server
cd server
cp .env.example .env            # set DATABASE_URL
npm install
npx prisma migrate dev          # creates the schema
npm run db:seed                 # 20 tables + menu
npm run dev                     # http://localhost:4000

# 2. Web app (new terminal)
cd web
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                     # http://localhost:3000
```

Open `http://localhost:3000/t/1` on a phone-sized viewport, `/kds` in another window and `/admin` in a third,
then place an order and watch it flow through.

## Configuration

**server/.env**

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | HTTP port (default `4000`) |
| `CORS_ORIGIN` | Comma-separated allowed web origins (your Vercel domain) |
| `STAFF_API_KEY` | Optional shared key for staff screens & endpoints. When set, `/admin` and `/kds` ask for it once per device. Leave empty only for local development. |
| `TZ_OFFSET_MINUTES` | Restaurant timezone offset for "today" analytics (IST = `330`) |

**web/.env.local**

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public URL of the Render service |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the web app, encoded into table QR codes (defaults to the current origin) |

## Deployment

**Backend (Render):** `render.yaml` is a Blueprint that provisions PostgreSQL and the `server/` web service.
It runs `prisma migrate deploy` plus the idempotent seed before each deploy, and generates a random
`STAFF_API_KEY` (find it in the Render dashboard and share it with staff). Set `CORS_ORIGIN` to the Vercel
URL. Socket.IO works on Render web services without extra config.

**Frontend (Vercel):** import the repo, set **Root Directory** to `web`, and add `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_SITE_URL`. Then print the QR codes from `/admin/qr`.

## Realtime events

Clients emit `join` with `{ role: "customer", table }` or `{ role: "admin" | "kds", staffKey }` and are placed
in the matching room (`table:<n>`, `admin`, `kds`).

| Event | Recipients | Payload |
| --- | --- | --- |
| `order:created` | admin, kds, `table:<n>` | full order |
| `order:status_changed` | admin, kds, `table:<n>` | full order |
| `menu:availability_toggled` | everyone | `{ menu_item_id, is_available }` |
| `menu:updated` | everyone | `{ at }` (dish/category edits → clients refetch) |
| `table:bill_requested` | admin (alert sound), `table:<n>` | `{ table_number, amount_due, order_ids }` |
| `table:updated` | admin, `table:<n>` | `{ id, status }` |

## REST API

Public (guest) endpoints are rate-limited where they write; staff endpoints need `x-staff-key` when
`STAFF_API_KEY` is set.

| Method & path | Access | Description |
| --- | --- | --- |
| `GET /api/menu` | public | Categories → items → combo steps |
| `GET /api/tables/:ref` | public | Validate a table by number or QR token |
| `GET /api/tables/:ref/orders` | public | The table's open orders (guest tracking) |
| `POST /api/orders` | public | Place an order (priced server-side) |
| `POST /api/tables/:ref/request-bill` | public | Flag the table `bill_requested` |
| `GET /api/orders?scope=active\|history` | staff | Open tickets / closed history |
| `PATCH /api/orders/:id/status` | staff | `preparing` · `served` · `paid` · `cancelled` |
| `GET /api/tables` | staff | Floor overview with amount due |
| `POST /api/tables/:ref/settle` | staff | Mark every open order on a table paid, reset to vacant |
| `PATCH /api/menu-items/:id/availability` | staff | Instant stock toggle |
| `POST/PUT/DELETE /api/menu-items[/:id]` | staff | Dish CRUD (incl. combo steps) |
| `POST/PUT/DELETE /api/categories[/:id]` | staff | Category CRUD |
| `GET /api/analytics/summary?range=today\|7d\|30d` | staff | Revenue, fulfilled orders, average ticket, top dishes |

## Behaviour notes

* **Mark as Paid** closes the ticket (status `paid`, which archives it into history). When a table has no
  other open orders, it resets to `vacant`. Tapping a table on the floor map settles all of its orders at once.
* Dishes with order history can't be deleted, which keeps reports intact. Mark them out of stock instead.
* Combo steps support mandatory/optional steps and multi-select limits (`is_required`, `max_select` on
  `ComboConfig`). Selected options are snapshotted onto each `OrderItem`, so later menu edits never change
  past orders.
* Browsers block audio until someone interacts with the page, so the KDS and dashboard show a one-tap
  "enable sound" button. The chime is synthesised in the browser and played through HTML5 Audio.
