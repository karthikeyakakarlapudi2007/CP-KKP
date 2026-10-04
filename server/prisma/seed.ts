/* eslint-disable no-console */
/**
 * Kodikura Pappucharu seed: tables 1–10 and the bilingual menu.
 * Idempotent — tables are upserted (QR tokens kept) and the menu is only created
 * when the database has none, so re-running never wipes merchant edits.
 * Use `npm run db:reset` for a clean slate.
 */
import { randomBytes } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TABLE_COUNT = 10;

type Option = { id: string; name_en: string; name_te: string; additional_price: number };
type Step = {
  step_number: number;
  step_title_en: string;
  step_title_te: string;
  is_required?: boolean;
  max_select?: number;
  options: Option[];
};
type Dish = {
  name_en: string;
  name_te: string;
  description_en: string;
  description_te: string;
  price: number;
  image_url?: string;
  is_available?: boolean;
  combo_steps?: Step[];
};

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

/** Flagship combo: Step 1 Base → Step 2 Curry */
const SPECIAL_COMBO_STEPS: Step[] = [
  {
    step_number: 1,
    step_title_en: "Select Base",
    step_title_te: "బేస్ ఎంచుకోండి",
    options: [
      { id: "base_bagara_rice", name_en: "Bagara Rice", name_te: "బగారా రైస్", additional_price: 30 },
      { id: "base_ragi_mudda", name_en: "Ragi Mudda", name_te: "రాగి ముద్ద", additional_price: 20 },
      { id: "base_steamed_rice", name_en: "Steamed Rice", name_te: "తెల్ల అన్నం", additional_price: 0 },
    ],
  },
  {
    step_number: 2,
    step_title_en: "Select Curry",
    step_title_te: "కూర ఎంచుకోండి",
    options: [
      { id: "curry_natu_kodi_pulusu", name_en: "Natu Kodi Pulusu", name_te: "నాటు కోడి పులుసు", additional_price: 0 },
      { id: "curry_royyala_iguru", name_en: "Royyala Iguru", name_te: "రొయ్యల ఇగురు", additional_price: 60 },
      { id: "curry_kodi_vepudu", name_en: "Kodi Vepudu", name_te: "కోడి వేపుడు", additional_price: 0 },
    ],
  },
];

const MENU: { name_en: string; name_te: string; dishes: Dish[] }[] = [
  {
    name_en: "Combos & Thalis",
    name_te: "కాంబోలు & థాలీలు",
    dishes: [
      {
        name_en: "Kodikura Pappucharu Special Combo",
        name_te: "కోడికూర పప్పుచారు స్పెషల్ కాంబో",
        description_en: "Our signature plate: choose your base and curry, served with pappucharu, appadam and pickle.",
        description_te: "మా ప్రత్యేక ప్లేట్: మీకు నచ్చిన బేస్ మరియు కూర, పప్పుచారు, అప్పడం మరియు పచ్చడితో.",
        price: 299,
        image_url: img("photo-1603133872878-684f208fb84b"),
        combo_steps: SPECIAL_COMBO_STEPS,
      },
      {
        name_en: "Andhra Veg Meals",
        name_te: "ఆంధ్ర శాకాహార భోజనం",
        description_en: "Unlimited rice with pappu, two curries, sambar, rasam, curd, podi and ghee.",
        description_te: "అపరిమిత అన్నం, పప్పు, రెండు కూరలు, సాంబారు, రసం, పెరుగు, పొడి మరియు నెయ్యి.",
        price: 199,
        image_url: img("photo-1546833999-b9f581a1996d"),
      },
      {
        name_en: "Non-Veg Andhra Thali",
        name_te: "మాంసాహార ఆంధ్ర థాలీ",
        description_en: "Rice, kodi kura, mutton curry, fish pulusu, pappucharu, curd and a sweet.",
        description_te: "అన్నం, కోడి కూర, మటన్ కూర, చేపల పులుసు, పప్పుచారు, పెరుగు మరియు ఒక స్వీటు.",
        price: 349,
        image_url: img("photo-1585937421612-70a008356fbe"),
      },
    ],
  },
  {
    name_en: "Non-Veg Starters",
    name_te: "మాంసాహార స్టార్టర్లు",
    dishes: [
      {
        name_en: "Kodi Vepudu",
        name_te: "కోడి వేపుడు",
        description_en: "Country-style chicken fry roasted with curry leaves, garlic and guntur chilli.",
        description_te: "కరివేపాకు, వెల్లుల్లి మరియు గుంటూరు మిరపకాయలతో వేయించిన కోడి వేపుడు.",
        price: 269,
        image_url: img("photo-1604908176997-125f25cc6f3d"),
      },
      {
        name_en: "Royyala Vepudu",
        name_te: "రొయ్యల వేపుడు",
        description_en: "Spicy dry-roasted prawns tossed with onions and curry leaves.",
        description_te: "ఉల్లిపాయలు, కరివేపాకుతో కారంగా వేయించిన రొయ్యలు.",
        price: 389,
        image_url: img("photo-1565557623262-b51c2513a641"),
      },
      {
        name_en: "Chicken 65",
        name_te: "చికెన్ 65",
        description_en: "Crispy, fiery red chicken bites tempered with green chillies.",
        description_te: "పచ్చిమిర్చి పోపుతో కరకరలాడే కారమైన చికెన్ ముక్కలు.",
        price: 249,
      },
      {
        name_en: "Apollo Fish",
        name_te: "అపోలో ఫిష్",
        description_en: "Boneless fish fry tossed in a tangy chilli-garlic glaze, Hyderabad style.",
        description_te: "పుల్లని మిర్చి-వెల్లుల్లి మసాలాలో వేయించిన ముళ్ళు లేని చేప ముక్కలు.",
        price: 329,
      },
      {
        name_en: "Mutton Sukka",
        name_te: "మటన్ సుక్కా",
        description_en: "Slow-roasted dry mutton with crushed black pepper and coconut.",
        description_te: "మిరియాలు మరియు కొబ్బరితో నెమ్మదిగా వేయించిన మటన్.",
        price: 369,
      },
    ],
  },
  {
    name_en: "Biryanis & Rice",
    name_te: "బిర్యానీలు & అన్నం",
    dishes: [
      {
        name_en: "Gongura Mutton Biryani",
        name_te: "గోంగూర మటన్ బిర్యానీ",
        description_en: "Tender mutton dum-cooked with tangy gongura leaves and basmati rice.",
        description_te: "పుల్లని గోంగూర ఆకులు మరియు బాస్మతి బియ్యంతో దమ్ చేసిన మెత్తటి మటన్.",
        price: 399,
        image_url: img("photo-1563379091339-03b21ab4a4f8"),
      },
      {
        name_en: "Natu Kodi Biryani",
        name_te: "నాటు కోడి బిర్యానీ",
        description_en: "Country chicken biryani with whole spices — limited batches daily.",
        description_te: "మసాలా దినుసులతో నాటు కోడి బిర్యానీ — రోజూ పరిమితంగా మాత్రమే.",
        price: 379,
        image_url: img("photo-1589302168068-964664d93dc0"),
        is_available: false,
      },
      {
        name_en: "Bagara Rice",
        name_te: "బగారా రైస్",
        description_en: "Fragrant rice tempered with whole spices, mint and fried onions.",
        description_te: "మసాలా దినుసులు, పుదీనా మరియు వేయించిన ఉల్లిపాయలతో సువాసన అన్నం.",
        price: 129,
      },
      {
        name_en: "Pulihora",
        name_te: "పులిహోర",
        description_en: "Tamarind rice with roasted peanuts, curry leaves and mustard seeds.",
        description_te: "వేయించిన వేరుశెనగలు, కరివేపాకు మరియు ఆవాలతో చింతపండు పులిహోర.",
        price: 109,
      },
      {
        name_en: "Pappucharu Annam",
        name_te: "పప్పుచారు అన్నం",
        description_en: "Steamed rice with our house pappucharu, ghee and appadam.",
        description_te: "మా ప్రత్యేక పప్పుచారు, నెయ్యి మరియు అప్పడంతో తెల్ల అన్నం.",
        price: 119,
      },
    ],
  },
  {
    name_en: "Beverages",
    name_te: "పానీయాలు",
    dishes: [
      {
        name_en: "Majjiga",
        name_te: "మజ్జిగ",
        description_en: "Chilled buttermilk spiced with ginger, green chilli and coriander.",
        description_te: "అల్లం, పచ్చిమిర్చి మరియు కొత్తిమీరతో చల్లటి మజ్జిగ.",
        price: 49,
      },
      {
        name_en: "Nannari Sharbat",
        name_te: "నన్నారి షర్బత్",
        description_en: "Cooling sarsaparilla root sherbet with lemon.",
        description_te: "నిమ్మరసంతో చల్లదనాన్నిచ్చే నన్నారి షర్బత్.",
        price: 69,
      },
      {
        name_en: "Ragi Java",
        name_te: "రాగి జావ",
        description_en: "Traditional finger-millet drink, lightly salted with buttermilk.",
        description_te: "మజ్జిగతో కలిపిన సాంప్రదాయ రాగి జావ.",
        price: 59,
      },
      {
        name_en: "Filter Coffee",
        name_te: "ఫిల్టర్ కాఫీ",
        description_en: "Strong decoction coffee with frothy hot milk.",
        description_te: "నురుగు పాలతో చిక్కటి డికాక్షన్ కాఫీ.",
        price: 49,
      },
    ],
  },
];

async function seedTables() {
  for (let id = 1; id <= TABLE_COUNT; id++) {
    await prisma.restaurantTable.upsert({
      where: { id },
      update: {},
      create: { id, qr_code_token: `kp-t${id}-${randomBytes(6).toString("hex")}` },
    });
  }
}

async function seedMenu() {
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
            description_en: d.description_en,
            description_te: d.description_te,
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
}

async function main() {
  console.log("🌶  Seeding Kodikura Pappucharu…");
  await seedTables();
  console.log(`✓ Tables 1–${TABLE_COUNT}`);

  if ((await prisma.category.count()) > 0) {
    console.log("• Menu already present — skipped (run `npm run db:reset` for a fresh menu).");
    return;
  }
  await seedMenu();
  const dishes = MENU.reduce((n, c) => n + c.dishes.length, 0);
  console.log(`✓ ${MENU.length} categories, ${dishes} dishes (1 configurable combo with ${SPECIAL_COMBO_STEPS.length} steps)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
