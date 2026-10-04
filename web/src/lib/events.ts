/** Mirrors server/src/events.ts */
export const EVENTS = {
  JOIN: "join",
  LEAVE: "leave",
  ORDER_CREATE: "order:create",
  ORDER_UPDATE_STATUS: "order:update_status",
  MENU_TOGGLE_AVAILABILITY: "menu:toggle_availability",
  TABLE_REQUEST_BILL: "table:request_bill",

  ORDER_CREATED: "order:created",
  ORDER_STATUS_CHANGED: "order:status_changed",
  MENU_AVAILABILITY_TOGGLED: "menu:availability_toggled",
  MENU_UPDATED: "menu:updated",
  TABLE_BILL_REQUESTED: "table:bill_requested",
  TABLE_STATUS_UPDATED: "table:status_updated",
} as const;
