/* eslint-disable no-console */
import { randomBytes } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const TABLE_COUNT = 20;

type Opt = { id: string; name_en: string; name_te: string; additional_price: number };
type Step = { step_number: number; step_title_en: string; step_title_te: string; is_required?: boolean; max_select?: number; options: Opt[] };
type Dish = {
  name_en: string;
  name_te: string;
  description_en?: string;
  description_te?: string;
  price: number;
  image_url?: string;
  is_available?: boolean;
  combo_steps?: Step[];
};

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

/* Shared combo steps for the signature Kodikura Pappucharu combos */
const BASES: Opt[] = [
  { id: "base_white_rice", name_en: "Steamed White Rice", name_te: "తెల్ల అన్నం", additional_price: 0 },
  { id: "base_bagara", name_en: "Bagara Rice", name_te: "బగారా రైస్", additional_price: 30 },
  { id: "base_jonna_roti", name_en: "Jonna Rotte (2 pcs)", name_te: "జొన్న రొట్టె (2)", additional_price: 20 },
  { id: "base_ragi_sangati", name_en: "Ragi Sangati", name_te: "రాగి సంగటి", additional_price: 25 },
];
const CURRIES_CHICKEN: Opt[] = [
  { id: "curry_kodikura", name_en: "Kodi Kura (Chicken Curry)", name_te: "కోడి కూర", additional_price: 0 },
  { id: "curry_natu_kodi", name_en: "Natu Kodi Pulusu", name_te: "నాటు కోడి పులుసు", additional_price: 60 },
  { id: "curry_chicken_fry", name_en: "Chicken Vepudu", name_te: "చికెన్ వేపుడు", additional_price: 40 },
];
const PAPPU: Opt[] = [
  { id: "pappu_charu", name_en: "Pappucharu", name_te: "పప్పుచారు", additional_price: 0 },
  { id: "pappu_tomato", name_en: "Tomato Pappu", name_te: "టమాటా పప్పు", additional_price: 0 },
  { id: "pappu_gongura", name_en: "Gongura Pappu", name_te: "గోంగూర పప్పు", additional_price: 15 },
  { id: "pappu_mudda", name_en: "Mudda Pappu with Ghee", name_te: "ముద్దపప్పు నెయ్యితో", additional_price: 20 },
];
const ADDONS: Opt[] = [
  { id: "addon_omelette", name_en: "Egg Omelette", name_te: "ఆమ్లెట్", additional_price: 30 },
  { id: "addon_appadam", name_en: "Appadam", name_te: "అప్పడం", additional_price: 10 },
  { id: "addon_ghee", name_en: "Extra Ghee", name_te: "అదనపు నెయ్యి", additional_price: 20 },
  { id: "addon_perugu", name_en: "Curd", name_te: "పెరుగు", additional_price: 20 },
  { id: "addon_avakaya", name_en: "Avakaya Pickle", name_te: "ఆవకాయ పచ్చడి", additional_price: 15 },
];

const MENU: { name_en: string; name_te: string; dishes: Dish[] }[] = [
  {
    name_en: "Kodikura Pappucharu Combos",
    name_te: "కోడికూర పప్పుచారు కాంబోలు",
    dishes: [
      {
        name_en: "Kodikura Pappucharu Classic Combo",
        name_te: "కోడికూర పప్పుచారు క్లాసిక్ కాంబో",
        description_en: "Build your plate: pick a base, a chicken curry, a pappu and add-ons.",
        description_te: "మీ ప్లేట్ మీరే తయారుచేసుకోండి: బేస్, కోడి కూర, పప్పు మరియు అదనపు వంటకాలు.",
        price: 249,
        image_url: img("photo-1603133872878-684f208fb84b"),
        combo_steps: [
          { step_number: 1, step_title_en: "Select Base", step_title_te: "రైస్ / బేస్ ఎంచుకోండి", options: BASES },
          { step_number: 2, step_title_en: "Choose Curry", step_title_te: "కూర ఎంచుకోండి", options: CURRIES_CHICKEN },
          { step_number: 3, step_title_en: "Choose Pappu", step_title_te: "పప్పు ఎంచుకోండి", options: PAPPU },
          { step_number: 4, step_title_en: "Add-ons (optional, up to 3)", step_title_te: "అదనపు వంటకాలు (ఐచ్ఛికం, 3 వరకు)", is_required: false, max_select: 3, options: ADDONS },
        ],
      },
      {
        name_en: "Veg Pappucharu Combo",
        name_te: "వెజ్ పప్పుచారు కాంబో",
        description_en: "Rice, pappu, a seasonal vegetable fry and podi.",
        description_te: "అన్నం, పప్పు, సీజనల్ కూరగాయల వేపుడు మరియు పొడి.",
        price: 179,
        image_url: img("photo-1546833999-b9f581a1996d"),
        combo_steps: [
          { step_number: 1, step_title_en: "Select Base", step_title_te: "రైస్ / బేస్ ఎంచుకోండి", options: BASES },
          { step_number: 2, step_title_en: "Choose Pappu", step_title_te: "పప్పు ఎంచుకోండి", options: PAPPU },
          {
            step_number: 3, step_title_en: "Choose Curry", step_title_te: "కూర ఎంచుకోండి",
            options: [
              { id: "veg_bendakaya", name_en: "Bendakaya Vepudu", name_te: "బెండకాయ వేపుడు", additional_price: 0 },
              { id: "veg_vankaya", name_en: "Gutti Vankaya Kura", name_te: "గుత్తి వంకాయ కూర", additional_price: 20 },
              { id: "veg_dondakaya", name_en: "Dondakaya Fry", name_te: "దొండకాయ వేపుడు", additional_price: 0 },
            ],
          },
          { step_number: 4, step_title_en: "Add-ons (optional, up to 3)", step_title_te: "అదనపు వంటకాలు (ఐచ్ఛికం, 3 వరకు)", is_required: false, max_select: 3, options: ADDONS },
        ],
      },
      {
        name_en: "Natu Kodi Family Combo",
        name_te: "నాటు కోడి ఫ్యామిలీ కాంబో",
        description_en: "Serves 3–4. Country chicken pulusu with your choice of two bases.",
        description_te: "3–4 మందికి. నాటు కోడి పులుసుతో మీకు నచ్చిన రెండు బేస్‌లు.",
        price: 899,
        image_url: img("photo-1585937421612-70a008356fbe"),
        combo_steps: [
          { step_number: 1, step_title_en: "Select 2 Bases", step_title_te: "2 బేస్‌లు ఎంచుకోండి", max_select: 2, options: BASES },
          { step_number: 2, step_title_en: "Choose Pappu", step_title_te: "పప్పు ఎంచుకోండి", options: PAPPU },
          { step_number: 3, step_title_en: "Add-ons (optional)", step_title_te: "అదనపు వంటకాలు (ఐచ్ఛికం)", is_required: false, max_select: 5, options: ADDONS },
        ],
      },
    ],
  },
  {
    name_en: "Biryanis",
    name_te: "బిర్యానీలు",
    dishes: [
      {
        name_en: "Gongura Mutton Biryani",
        name_te: "గోంగూర మటన్ బిర్యానీ",
        description_en: "Tender mutton dum-cooked with tangy gongura leaves.",
        description_te: "పుల్లని గోంగూరతో దమ్ చేసిన మెత్తటి మటన్.",
        price: 399,
        image_url: img("photo-1563379091339-03b21ab4a4f8"),
      },
      {
        name_en: "Chicken Dum Biryani",
        name_te: "చికెన్ దమ్ బిర్యానీ",
        description_en: "Hyderabadi style, served with mirchi ka salan and raita.",
        description_te: "హైదరాబాదీ పద్ధతి, మిర్చి సాలన్ మరియు రైతాతో.",
        price: 299,
        image_url: img("photo-1589302168068-964664d93dc0"),
      },
      {
        name_en: "Ulavacharu Chicken Biryani",
        name_te: "ఉలవచారు చికెన్ బిర్యానీ",
        description_en: "Smoky horse-gram reduction layered through the rice.",
        description_te: "ఉలవచారు రుచితో పొరలుగా చేసిన బిర్యానీ.",
        price: 329,
        is_available: false,
      },
    ],
  },
  {
    name_en: "Curries & Pulusu",
    name_te: "కూరలు & పులుసులు",
    dishes: [
      { name_en: "Natu Kodi Pulusu", name_te: "నాటు కోడి పులుసు", description_en: "Country chicken in a fiery tamarind-chilli gravy.", description_te: "చింతపండు కారంతో నాటు కోడి పులుసు.", price: 349, image_url: img("photo-1604908176997-125f25cc6f3d") },
      { name_en: "Kodi Kura", name_te: "కోడి కూర", description_en: "Home-style Andhra chicken curry.", description_te: "ఇంటి పద్ధతి ఆంధ్ర కోడి కూర.", price: 259 },
      { name_en: "Gongura Mamsam", name_te: "గోంగూర మాంసం", description_en: "Mutton cooked with sorrel leaves.", description_te: "గోంగూరతో వండిన మటన్.", price: 379 },
      { name_en: "Chepala Pulusu", name_te: "చేపల పులుసు", description_en: "Godavari-style tangy fish curry.", description_te: "గోదావరి పద్ధతి చేపల పులుసు.", price: 329 },
      { name_en: "Pappucharu", name_te: "పప్పుచారు", description_en: "Thin, tangy lentil rasam with tadka.", description_te: "పోపుతో పుల్లని పప్పుచారు.", price: 99 },
    ],
  },
  {
    name_en: "Fries & Starters",
    name_te: "వేపుళ్ళు & స్టార్టర్లు",
    dishes: [
      { name_en: "Royyala Vepudu", name_te: "రొయ్యల వేపుడు", description_en: "Spicy dry-roasted prawns with curry leaves.", description_te: "కరివేపాకుతో కారంగా వేయించిన రొయ్యలు.", price: 389, image_url: img("photo-1565557623262-b51c2513a641") },
      { name_en: "Chicken 65", name_te: "చికెన్ 65", description_en: "Crispy, red-hot and tossed with green chillies.", description_te: "పచ్చిమిర్చితో కరకరలాడే చికెన్.", price: 249 },
      { name_en: "Mutton Sukka", name_te: "మటన్ సుక్కా", description_en: "Slow-roasted dry mutton with black pepper.", description_te: "మిరియాలతో వేయించిన మటన్.", price: 369 },
      { name_en: "Mirchi Bajji", name_te: "మిర్చి బజ్జీ", description_en: "Stuffed chilli fritters, 4 pcs.", description_te: "స్టఫ్డ్ మిర్చి బజ్జీ, 4 ముక్కలు.", price: 89 },
    ],
  },
  {
    name_en: "Rice & Breads",
    name_te: "అన్నం & రొట్టెలు",
    dishes: [
      { name_en: "Bagara Rice", name_te: "బగారా రైస్", description_en: "Fragrant whole-spice tempered rice.", description_te: "మసాలా పోపుతో సువాసన అన్నం.", price: 129 },
      { name_en: "Steamed Rice", name_te: "తెల్ల అన్నం", price: 69 },
      { name_en: "Jonna Rotte (2 pcs)", name_te: "జొన్న రొట్టె (2)", price: 59 },
      { name_en: "Pulihora", name_te: "పులిహోర", description_en: "Tamarind rice with peanuts.", description_te: "వేరుశెనగలతో చింతపండు పులిహోర.", price: 109 },
    ],
  },
  {
    name_en: "Desserts & Drinks",
    name_te: "స్వీట్లు & పానీయాలు",
    dishes: [
      { name_en: "Double ka Meetha", name_te: "డబుల్ కా మీఠా", price: 119 },
      { name_en: "Bobbatlu (2 pcs)", name_te: "బొబ్బట్లు (2)", price: 99 },
      { name_en: "Majjiga (Spiced Buttermilk)", name_te: "మజ్జిగ", price: 49 },
      { name_en: "Nannari Sharbat", name_te: "నన్నారి షర్బత్", price: 69 },
    ],
  },
];

async function main() {
  console.log("Seeding Kodikura Pappucharu…");

  // Tables 1..20 (idempotent; keeps existing QR tokens)
  for (let id = 1; id <= TABLE_COUNT; id++) {
    await prisma.restaurantTable.upsert({
      where: { id },
      update: {},
      create: { id, qr_code_token: `kp-t${id}-${randomBytes(6).toString("hex")}` },
    });
  }

  // Menu is re-created only when empty, so re-running the seed never wipes merchant edits.
  if ((await prisma.category.count()) > 0) {
    console.log("Menu already present — skipping menu seed.");
    return;
  }

  for (const [index, cat] of MENU.entries()) {
    await prisma.category.create({
      data: {
        name_en: cat.name_en,
        name_te: cat.name_te,
        sort_order: (index + 1) * 10,
        items: {
          create: cat.dishes.map((d) => ({
            name_en: d.name_en,
            name_te: d.name_te,
            description_en: d.description_en ?? null,
            description_te: d.description_te ?? null,
            price: new Prisma.Decimal(d.price),
            image_url: d.image_url ?? null,
            is_available: d.is_available ?? true,
            is_combo: Boolean(d.combo_steps?.length),
            combo_steps: {
              create: (d.combo_steps ?? []).map((s) => ({
                step_number: s.step_number,
                step_title_en: s.step_title_en,
                step_title_te: s.step_title_te,
                is_required: s.is_required ?? true,
                max_select: s.max_select ?? 1,
                options: s.options as unknown as Prisma.InputJsonValue,
              })),
            },
          })),
        },
      },
    });
  }
  console.log(`Seeded ${TABLE_COUNT} tables and ${MENU.reduce((n, c) => n + c.dishes.length, 0)} dishes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
