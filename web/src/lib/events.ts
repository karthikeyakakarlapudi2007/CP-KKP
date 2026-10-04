/** Mirrors server/src/events.ts */
export const EVENTS = {
  JOIN: "join",
  ORDER_CREATED: "order:created",
  ORDER_STATUS_CHANGED: "order:status_changed",
  MENU_AVAILABILITY_TOGGLED: "menu:availability_toggled",
  MENU_UPDATED: "menu:updated",
  TABLE_BILL_REQUESTED: "table:bill_requested",
  TABLE_UPDATED: "table:updated",
} as const;
