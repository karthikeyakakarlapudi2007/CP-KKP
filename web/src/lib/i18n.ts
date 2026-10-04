import type { Lang, OrderStatus } from "./types";

const dict = {
  appName: { en: "Kodikura Pappucharu", te: "కోడికూర పప్పుచారు" },
  table: { en: "Table", te: "టేబుల్" },
  searchPlaceholder: { en: "Search dishes…", te: "వంటకాలు వెతకండి…" },
  all: { en: "All", te: "అన్నీ" },
  add: { en: "Add", te: "చేర్చు" },
  customize: { en: "Customize", te: "మార్చుకోండి" },
  outOfStock: { en: "Out of Stock", te: "అయిపోయింది" },
  combo: { en: "Combo", te: "కాంబో" },
  noResults: { en: "No dishes match your search", te: "మీ వెతుకులాటకు వంటకాలు లేవు" },
  items: { en: "items", te: "ఐటమ్స్" },
  viewCart: { en: "View Cart", te: "కార్ట్ చూడండి" },
  yourCart: { en: "Your Order", te: "మీ ఆర్డర్" },
  cartEmpty: { en: "Your cart is empty", te: "మీ కార్ట్ ఖాళీగా ఉంది" },
  prepNotes: { en: "Cooking Instructions / Prep Notes", te: "వంట సూచనలు" },
  prepNotesPlaceholder: { en: "e.g. Less spicy for kids", te: "ఉదా: పిల్లల కోసం తక్కువ కారం" },
  total: { en: "Total", te: "మొత్తం" },
  placeOrder: { en: "Place Order", te: "ఆర్డర్ చేయండి" },
  placing: { en: "Placing…", te: "పంపుతున్నాం…" },
  remove: { en: "Remove", te: "తీసివేయి" },
  step: { en: "Step", te: "దశ" },
  of: { en: "of", te: "లో" },
  next: { en: "Next", te: "తరువాత" },
  back: { en: "Back", te: "వెనుకకు" },
  addToCart: { en: "Add to Cart", te: "కార్ట్‌కి చేర్చు" },
  required: { en: "Required", te: "తప్పనిసరి" },
  optional: { en: "Optional", te: "ఐచ్ఛికం" },
  pickUpTo: { en: "Pick up to", te: "గరిష్టంగా ఎంచుకోండి" },
  selectToContinue: { en: "Please make a selection to continue", te: "కొనసాగడానికి ఒకటి ఎంచుకోండి" },
  yourOrders: { en: "Your Orders", te: "మీ ఆర్డర్లు" },
  orderMore: { en: "Order More", te: "ఇంకా ఆర్డర్ చేయండి" },
  requestBill: { en: "Request Bill", te: "బిల్ అడగండి" },
  billRequested: { en: "Bill requested — a server is on the way", te: "బిల్ అడిగారు — సర్వర్ వస్తున్నారు" },
  payAtTable: { en: "Pay at table: cash / UPI / card with your server", te: "టేబుల్ వద్దే చెల్లించండి: నగదు / UPI / కార్డ్" },
  amountDue: { en: "Amount due", te: "చెల్లించాల్సిన మొత్తం" },
  trackOrders: { en: "Track Orders", te: "ఆర్డర్లు చూడండి" },
  invalidTable: { en: "This table link is not valid. Please scan the QR code on your table again.", te: "ఈ టేబుల్ లింక్ సరైనది కాదు. దయచేసి మీ టేబుల్‌పై ఉన్న QR కోడ్‌ను మళ్లీ స్కాన్ చేయండి." },
  loadError: { en: "Could not load the menu. Check your connection.", te: "మెనూ లోడ్ కాలేదు. మీ కనెక్షన్ చూడండి." },
  retry: { en: "Retry", te: "మళ్ళీ ప్రయత్నించు" },
  offline: { en: "Reconnecting…", te: "మళ్ళీ కనెక్ట్ అవుతోంది…" },
  itemsWentOos: { en: "Some items just went out of stock and were removed from your cart.", te: "కొన్ని ఐటమ్స్ అయిపోయాయి, అవి కార్ట్ నుండి తీసివేయబడ్డాయి." },
  orderFailed: { en: "Could not place the order. Please try again.", te: "ఆర్డర్ పంపలేకపోయాం. మళ్ళీ ప్రయత్నించండి." },
  notes: { en: "Notes", te: "సూచనలు" },
  noOrdersYet: { en: "No orders yet for this table.", te: "ఈ టేబుల్‌కి ఇంకా ఆర్డర్లు లేవు." },
} as const satisfies Record<string, Record<Lang, string>>;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Lang): string {
  return dict[key][lang];
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, Record<Lang, string>> = {
  pending: { en: "Order Received", te: "ఆర్డర్ అందింది" },
  preparing: { en: "Preparing", te: "తయారవుతోంది" },
  served: { en: "Served", te: "వడ్డించారు" },
  paid: { en: "Paid", te: "చెల్లించారు" },
  cancelled: { en: "Cancelled", te: "రద్దు చేయబడింది" },
};
