/* eslint-disable no-console */
/**
 * End-to-end check of the realtime engine against a running server + seeded DB:
 *   npm run dev            (terminal 1)
 *   npm run test:socket    (terminal 2)   — SOCKET_URL / STAFF_API_KEY override defaults
 */
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";

const URL = process.env.SOCKET_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
const STAFF_KEY = process.env.STAFF_API_KEY ?? "";
const TABLE = Number(process.env.TEST_TABLE ?? 3);

type AckRes<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function connect(name: string, log: string[]): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ["websocket"], reconnection: false });
    s.onAny((event) => log.push(`${name} <- ${event}`));
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
}

const call = <T>(s: Socket, event: string, payload: unknown) =>
  s.timeout(5000).emitWithAck(event, payload) as Promise<AckRes<T>>;

function ok<T>(res: AckRes<T>, label: string): T {
  if (!res.ok) throw new Error(`${label} failed: ${res.status} ${res.error}`);
  console.log(`  ✓ ${label}`);
  return res.data;
}

const settle = () => new Promise((r) => setTimeout(r, 300));

async function main() {
  console.log(`Socket smoke test → ${URL} (table ${TABLE})`);
  const log: string[] = [];
  const [admin, kds, guest, other] = await Promise.all([
    connect("admin", log),
    connect("kds", log),
    connect("guest", log),
    connect("other", log),
  ]);

  ok(await call(admin, "join", { role: "admin", staffKey: STAFF_KEY }), "admin joined");
  ok(await call(kds, "join", { role: "kds", staffKey: STAFF_KEY }), "kds joined");
  ok(await call(guest, "join", { role: "customer", table: TABLE }), `guest joined table:${TABLE}`);
  ok(await call(other, "join", { role: "customer", table: TABLE + 1 }), `other guest joined table:${TABLE + 1}`);
  const badJoin = await call(guest, "join", { role: "customer", table: 999 });
  assert.equal(badJoin.ok, false, "unknown table must be rejected");
  console.log("  ✓ unknown table rejected");

  const menu = (await (await fetch(`${URL}/api/menu`)).json()) as {
    categories: { items: { id: number; name_en: string; is_available: boolean }[] }[];
  };
  const items = menu.categories.flatMap((c) => c.items);
  const find = (name: string) => {
    const it = items.find((i) => i.name_en === name);
    assert.ok(it, `seed dish missing: ${name}`);
    return it;
  };
  const combo = find("Kodikura Pappucharu Special Combo");
  const biryani = find("Gongura Mutton Biryani");
  const majjiga = find("Majjiga");

  // ---- order:create (validation first)
  const missingCurry = await call(guest, "order:create", {
    table_number: TABLE,
    items: [{ menu_item_id: combo.id, quantity: 1, combo_selections: { "1": ["base_bagara_rice"] } }],
  });
  assert.equal(missingCurry.ok, false);
  console.log("  ✓ combo without mandatory curry rejected");

  // start from an empty table so this is Round 1
  await fetch(`${URL}/api/tables/${TABLE}/settle`, { method: "POST", headers: STAFF_KEY ? { "x-staff-key": STAFF_KEY } : {} });

  log.length = 0;
  const order = ok(
    await call<{ id: string; total_amount: number; status: string; round: number }>(guest, "order:create", {
      table_number: TABLE,
      customer_notes: "Less spicy for kids",
      items: [
        { menu_item_id: combo.id, quantity: 2, combo_selections: { "1": ["base_bagara_rice"], "2": ["curry_royyala_iguru"] } },
        { menu_item_id: biryani.id, quantity: 1 },
        { menu_item_id: majjiga.id, quantity: 2 },
      ],
    }),
    "order:create saved",
  );
  // (299 + 30 + 60) × 2 + 399 + 49 × 2
  assert.equal(order.total_amount, 778 + 399 + 98);
  console.log(`  ✓ server-side total ₹${order.total_amount}`);
  await settle();
  assert.ok(log.includes("admin <- order:created") && log.includes("kds <- order:created"), "order:created to admin + kds");
  assert.ok(!log.includes("other <- order:created"), "other tables must not see the order");
  console.log("  ✓ order:created reached admin + kds only (plus its own table)");
  assert.equal(order.round, 1);

  // ---- Round 2: a second guest at the same table adds a dish mid-meal
  log.length = 0;
  const addon = ok(
    await call<{ id: string; round: number; total_amount: number }>(other, "order:create", {
      table_number: TABLE,
      items: [{ menu_item_id: majjiga.id, quantity: 1 }],
    }),
    "add-on order:create saved",
  );
  assert.equal(addon.round, 2, "second open ticket must be round 2");
  await settle();
  assert.ok(log.includes("kds <- order:addon_created") && log.includes("admin <- order:addon_created"));
  assert.ok(log.includes("guest <- order:addon_created"), "guests at the table see the add-on");
  assert.ok(!log.includes("kds <- order:created"), "add-on is not announced as a fresh order");
  console.log("  ✓ order:addon_created (round 2) reached kds, admin and the table");
  ok(await call(kds, "order:update_status", { order_id: addon.id, status: "cancelled" }), "add-on cancelled (cleanup)");

  // ---- order:update_status
  const denied = await call(guest, "order:update_status", { order_id: order.id, status: "preparing" });
  assert.equal(denied.ok, false);
  console.log("  ✓ guest cannot change order status");

  log.length = 0;
  ok(await call(kds, "order:update_status", { order_id: order.id, status: "preparing" }), "kds → preparing");
  await settle();
  assert.ok(log.includes("guest <- order:status_changed") && log.includes("kds <- order:status_changed"));
  assert.ok(!log.includes("other <- order:status_changed"));
  console.log("  ✓ order:status_changed reached table:" + TABLE + " + kds");
  const skip = await call(kds, "order:update_status", { order_id: order.id, status: "preparing" });
  assert.equal(skip.ok, false);
  console.log("  ✓ invalid transition rejected");
  ok(await call(kds, "order:update_status", { order_id: order.id, status: "served" }), "kds → served");

  // ---- menu:toggle_availability
  const kdsToggle = await call(kds, "menu:toggle_availability", { menu_item_id: majjiga.id, is_available: false });
  assert.equal(kdsToggle.ok, false);
  console.log("  ✓ kds cannot toggle stock (admin only)");
  log.length = 0;
  ok(await call(admin, "menu:toggle_availability", { menu_item_id: majjiga.id, is_available: false }), "admin toggled Majjiga off");
  await settle();
  for (const who of ["admin", "kds", "guest", "other"]) {
    assert.ok(log.includes(`${who} <- menu:availability_toggled`), `${who} should get the toggle`);
  }
  console.log("  ✓ menu:availability_toggled broadcast to every client");
  const oos = await call(guest, "order:create", { table_number: TABLE, items: [{ menu_item_id: majjiga.id, quantity: 1 }] });
  assert.equal(oos.ok, false);
  console.log("  ✓ out-of-stock dish cannot be ordered");
  ok(await call(admin, "menu:toggle_availability", { menu_item_id: majjiga.id, is_available: true }), "admin toggled Majjiga back on");

  // ---- table:request_bill
  log.length = 0;
  const bill = ok(await call<{ amount_due: number }>(guest, "table:request_bill", { table_number: TABLE }), "table:request_bill");
  assert.equal(bill.amount_due, order.total_amount);
  await settle();
  assert.ok(log.includes("admin <- table:bill_requested"));
  assert.ok(!log.includes("kds <- table:bill_requested"));
  console.log("  ✓ table:bill_requested reached admin");
  const table = (await (await fetch(`${URL}/api/tables/${TABLE}`)).json()) as { status: string };
  assert.equal(table.status, "bill_requested");
  console.log("  ✓ table status in DB = bill_requested");

  // ---- close the ticket
  ok(await call(admin, "order:update_status", { order_id: order.id, status: "paid" }), "admin → paid");
  const after = (await (await fetch(`${URL}/api/tables/${TABLE}`)).json()) as { status: string };
  assert.equal(after.status, "vacant");
  console.log("  ✓ table reset to vacant");

  [admin, kds, guest, other].forEach((s) => s.disconnect());
  console.log("\nAll realtime checks passed ✔");
}

main().catch((e) => {
  console.error("\n✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
