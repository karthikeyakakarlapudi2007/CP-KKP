/** Socket.IO event names shared by the gateway and the web client. */
export const EVENTS = {
  /** client -> server: join role-specific rooms */
  JOIN: "join",
  ORDER_CREATED: "order:created",
  ORDER_STATUS_CHANGED: "order:status_changed",
  MENU_AVAILABILITY_TOGGLED: "menu:availability_toggled",
  /** any structural menu edit (price, name, new dish) — clients refetch */
  MENU_UPDATED: "menu:updated",
  TABLE_BILL_REQUESTED: "table:bill_requested",
  /** table status changed (occupied / vacant / bill_requested) */
  TABLE_UPDATED: "table:updated",
} as const;

export const ROOMS = {
  admin: "admin",
  kds: "kds",
  table: (n: number) => `table:${n}`,
} as const;
