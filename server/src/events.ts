/** Socket.IO event names shared by the gateway and the web client. */
export const EVENTS = {
  /* ---- client -> server commands (each replies through a Socket.IO ack) ---- */
  /** join role-specific rooms: { role: "customer", table } | { role: "admin" | "kds", staffKey } */
  JOIN: "join",
  /** leave a room joined earlier (same payload as join) */
  LEAVE: "leave",
  /** guest places an order (public) */
  ORDER_CREATE: "order:create",
  /** staff advances / pays / cancels an order (admin or kds sockets only) */
  ORDER_UPDATE_STATUS: "order:update_status",
  /** staff toggles a dish's stock (admin sockets only) */
  MENU_TOGGLE_AVAILABILITY: "menu:toggle_availability",
  /** guest asks for the bill (public) */
  TABLE_REQUEST_BILL: "table:request_bill",

  /* ---- server -> client broadcasts ---- */
  ORDER_CREATED: "order:created",
  /** a second (third…) round ordered while the table already has open tickets */
  ORDER_ADDON_CREATED: "order:addon_created",
  ORDER_STATUS_CHANGED: "order:status_changed",
  MENU_AVAILABILITY_TOGGLED: "menu:availability_toggled",
  /** any structural menu edit (price, name, new dish) — clients refetch */
  MENU_UPDATED: "menu:updated",
  TABLE_BILL_REQUESTED: "table:bill_requested",
  /** table status changed (occupied / vacant / bill_requested) */
  TABLE_STATUS_UPDATED: "table:status_updated",
} as const;

export const ROOMS = {
  admin: "admin",
  kds: "kds",
  table: (n: number) => `table:${n}`,
} as const;
