import type { Lang } from "./types";

/**
 * Static UI labels for the guest app. Dish names, descriptions and combo steps come
 * bilingual from the database (name_en / name_te ...).
 */
export const translations = {
  // Branding & header
  appName: { en: "Kodikura Pappucharu", te: "కోడికూర పప్పుచారు" },
  tagline: { en: "Home-style Andhra meals", te: "ఇంటి రుచి ఆంధ్ర భోజనం" },
  table: { en: "Table", te: "టేబుల్" },
  menu: { en: "Menu", te: "మెనూ" },
  cart: { en: "Cart", te: "కార్ట్" },
  trackOrder: { en: "Track Order", te: "ఆర్డర్ స్థితి" },

  // Menu browsing
  searchPlaceholder: { en: "Search dishes…", te: "వంటకాలు వెతకండి…" },
  clearSearch: { en: "Clear search", te: "వెతుకులాట తీసివేయి" },
  noResults: { en: "No dishes match your search", te: "మీ వెతుకులాటకు వంటకాలు లేవు" },
  add: { en: "Add", te: "చేర్చు" },
  customize: { en: "Customize", te: "ఎంచుకోండి" },
  combo: { en: "Combo", te: "కాంబో" },
  from: { en: "from", te: "నుండి" },
  available: { en: "Available", te: "అందుబాటులో ఉంది" },
  outOfStock: { en: "Out of Stock / అయిపోయింది", te: "అయిపోయింది / Out of Stock" },
  outOfStockShort: { en: "Out of Stock", te: "అయిపోయింది" },

  // Combo builder
  step: { en: "Step", te: "దశ" },
  of: { en: "of", te: "/" },
  selectBase: { en: "Select Base", te: "బేస్ ఎంచుకోండి" },
  selectCurry: { en: "Select Curry", te: "కూర ఎంచుకోండి" },
  required: { en: "Required", te: "తప్పనిసరి" },
  optional: { en: "Optional", te: "ఐచ్ఛికం" },
  pickUpTo: { en: "Pick up to", te: "గరిష్టంగా" },
  selectToContinue: { en: "Select an option to continue", te: "కొనసాగడానికి ఒకటి ఎంచుకోండి" },
  next: { en: "Next", te: "తరువాత" },
  back: { en: "Back", te: "వెనుకకు" },
  addToCart: { en: "Add to Cart", te: "కార్ట్‌కి చేర్చు" },
  itemTotal: { en: "Item Total", te: "ఐటమ్ మొత్తం" },

  // Cart
  items: { en: "items", te: "ఐటమ్స్" },
  item: { en: "item", te: "ఐటమ్" },
  viewCart: { en: "View Cart", te: "కార్ట్ చూడండి" },
  yourCart: { en: "Your Cart", te: "మీ కార్ట్" },
  cartEmpty: { en: "Your cart is empty", te: "మీ కార్ట్ ఖాళీగా ఉంది" },
  remove: { en: "Remove", te: "తీసివేయి" },
  addNote: { en: "Add note", te: "సూచన జోడించు" },
  itemNotePlaceholder: { en: "e.g. No onions", te: "ఉదా: ఉల్లిపాయలు వద్దు" },
  cookingInstructions: { en: "Cooking Instructions", te: "వంట సూచనలు" },
  specialInstructions: { en: "Special Instructions / వంట సూచనలు", te: "వంట సూచనలు / Special Instructions" },
  instructionsPlaceholder: { en: "e.g. Medium spicy, ghee on side", te: "ఉదా: మధ్యస్థ కారం, నెయ్యి విడిగా" },
  total: { en: "Total", te: "మొత్తం" },
  placeOrder: { en: "Place Order / ఆర్డర్ ఇవ్వండి", te: "ఆర్డర్ ఇవ్వండి / Place Order" },
  placing: { en: "Sending to kitchen…", te: "వంటగదికి పంపుతున్నాం…" },

  // Tracking & bill
  yourOrder: { en: "Your Order", te: "మీ ఆర్డర్" },
  statusPending: { en: "Order Received", te: "ఆర్డర్ అందింది" },
  statusPreparing: { en: "Preparing in Kitchen", te: "వంటగదిలో తయారవుతోంది" },
  statusServed: { en: "Served to Table", te: "టేబుల్‌కి వడ్డించారు" },
  orderSummary: { en: "Order Summary", te: "ఆర్డర్ వివరాలు" },
  orderMore: { en: "Order More", te: "ఇంకా ఆర్డర్ చేయండి" },
  amountDue: { en: "Amount Due", te: "చెల్లించాల్సిన మొత్తం" },
  requestBill: { en: "Request Bill / బిల్ అడగండి", te: "బిల్ అడగండి / Request Bill" },
  billRequestedBtn: { en: "Bill Requested", te: "బిల్ అడిగారు" },
  billBanner: {
    en: "Staff notified! A waiter is coming to your table for payment.",
    te: "సిబ్బందికి తెలియజేశాం! చెల్లింపు కోసం వెయిటర్ మీ టేబుల్‌కి వస్తున్నారు.",
  },
  payAtTable: { en: "Pay at the table — cash, UPI or card.", te: "టేబుల్ వద్దే చెల్లించండి — నగదు, UPI లేదా కార్డ్." },
  notes: { en: "Notes", te: "సూచనలు" },
  noOpenOrders: { en: "No open orders for this table yet.", te: "ఈ టేబుల్‌కి ఇంకా ఆర్డర్లు లేవు." },
  thankYou: { en: "Payment received — thank you for dining with us! 🙏", te: "చెల్లింపు అందింది — మా దగ్గర భోజనం చేసినందుకు ధన్యవాదాలు! 🙏" },
  orderCancelled: { en: "An order was cancelled by the restaurant.", te: "ఒక ఆర్డర్‌ను రెస్టారెంట్ రద్దు చేసింది." },

  // Multi-guest / add-on rounds
  activeOrderTitle: { en: "Active Table Order in Progress", te: "టేబుల్ ఆర్డర్ కొనసాగుతోంది" },
  activeOrderHint: { en: "Anyone at this table can add more dishes — they go to the kitchen as a new round.", te: "ఈ టేబుల్ వద్ద ఎవరైనా ఇంకా వంటకాలు జోడించవచ్చు — అవి కొత్త రౌండ్‌గా వంటగదికి వెళ్తాయి." },
  runningBill: { en: "Running bill", te: "ప్రస్తుత బిల్" },
  alreadyOrdered: { en: "Already ordered", te: "ఇప్పటికే ఆర్డర్ చేసినవి" },
  showItems: { en: "Show items", te: "ఐటమ్స్ చూపించు" },
  hideItems: { en: "Hide items", te: "ఐటమ్స్ దాచు" },
  round: { en: "Round", te: "రౌండ్" },
  addOn: { en: "Add-on", te: "అదనపు" },
  placeAddon: { en: "Place Add-on Order", te: "అదనపు ఆర్డర్ ఇవ్వండి" },
  addonNote: { en: "Earlier rounds stay on your bill — this is sent as a new ticket.", te: "మునుపటి ఆర్డర్లు బిల్‌లోనే ఉంటాయి — ఇది కొత్త టికెట్‌గా వెళ్తుంది." },
  inclGst: { en: "incl. GST", te: "GST తో కలిపి" },
  billReopened: { en: "New round added — request the bill again when you're done.", te: "కొత్త రౌండ్ జోడించబడింది — అయ్యాక మళ్ళీ బిల్ అడగండి." },

  // Errors & connectivity
  connecting: { en: "Connecting to restaurant server...", te: "సర్వర్‌కి కనెక్ట్ అవుతోంది..." },
  backOnline: { en: "Back online", te: "మళ్ళీ కనెక్ట్ అయ్యింది" },
  invalidTable: { en: "This table link is not valid. Please scan the QR code on your table again.", te: "ఈ టేబుల్ లింక్ సరైనది కాదు. దయచేసి మీ టేబుల్‌పై ఉన్న QR కోడ్‌ను మళ్లీ స్కాన్ చేయండి." },
  loadError: { en: "Could not load the menu. Check your connection.", te: "మెనూ లోడ్ కాలేదు. మీ కనెక్షన్ చూడండి." },
  offline: { en: "Reconnecting…", te: "మళ్ళీ కనెక్ట్ అవుతోంది…" },
  itemsWentOos: { en: "Some items just went out of stock and were removed from your cart.", te: "కొన్ని ఐటమ్స్ అయిపోయాయి, అవి కార్ట్ నుండి తీసివేయబడ్డాయి." },
  orderFailed: { en: "Could not place the order. Please try again.", te: "ఆర్డర్ పంపలేకపోయాం. మళ్ళీ ప్రయత్నించండి." },
  orderUncertain: { en: "The kitchen didn't confirm in time. Check Track Order before retrying.", te: "వంటగది నుండి నిర్ధారణ రాలేదు. మళ్ళీ ప్రయత్నించే ముందు ఆర్డర్ స్థితి చూడండి." },
  billFailed: { en: "Could not notify staff. Please wave to a waiter.", te: "సిబ్బందికి తెలియజేయలేకపోయాం. దయచేసి వెయిటర్‌ని పిలవండి." },
} as const satisfies Record<string, Record<Lang, string>>;

export type TranslationKey = keyof typeof translations;

export function translate(key: TranslationKey, lang: Lang): string {
  return translations[key][lang];
}
