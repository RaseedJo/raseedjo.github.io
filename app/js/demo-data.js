// Sample data for "Mama Huda's Kitchen", a fictional home kitchen in Amman.
// Every name is made up. Dates are worked out from today, so the demo always
// looks active. Text is stored in both languages so the demo switches with the
// language toggle.

import { emptyData } from "./store.js";
import { isoDay } from "./model.js";
import { issueInvoice, sellerSnapshot } from "./invoice-model.js";

const AREAS = {
  khalda: { en: "Khalda", ar: "خلدا" },
  abdoun: { en: "Abdoun", ar: "عبدون" },
  jubeiha: { en: "Jubeiha", ar: "الجبيهة" },
  sweifieh: { en: "Sweifieh", ar: "الصويفية" },
  tlaa: { en: "Tla' Al-Ali", ar: "تلاع العلي" },
  dabouq: { en: "Dabouq", ar: "دابوق" },
};

// Prices in fils (1 JD = 1000 fils)
const PRODUCTS = {
  maqluba: { name: { en: "Maqluba tray", ar: "صدر مقلوبة" }, price: 22000 },
  mansaf: { name: { en: "Mansaf (serves 4)", ar: "منسف (4 أشخاص)" }, price: 38000 },
  musakhan: { name: { en: "Musakhan rolls (dozen)", ar: "مسخن رولات (دزينة)" }, price: 6000 },
  warak: { name: { en: "Stuffed grape leaves (1 kg)", ar: "ورق عنب (1 كغ)" }, price: 9500 },
  kubbeh: { name: { en: "Fried kubbeh (dozen)", ar: "كبة مقلية (دزينة)" }, price: 5500 },
  fatayer: { name: { en: "Spinach fatayer (dozen)", ar: "فطاير سبانخ (دزينة)" }, price: 4500 },
  mulukhiyah: { name: { en: "Mulukhiyah with chicken", ar: "ملوخية بالدجاج" }, price: 12000 },
  kunafa: { name: { en: "Kunafa tray", ar: "صينية كنافة" }, price: 15000 },
  maamoul: { name: { en: "Date ma'amoul (1 kg)", ar: "معمول بالتمر (1 كغ)" }, price: 10000 },
  mahshi: { name: { en: "Stuffed zucchini (1 kg)", ar: "محشي كوسا (1 كغ)" }, price: 10500 },
  shishbarak: { name: { en: "Shish barak", ar: "شيش برك" }, price: 14000 },
  hummus: { name: { en: "Hummus (large box)", ar: "حمص (علبة كبيرة)" }, price: 2500 },
};

// [key, English name, Arabic name, area, phone, notes]
const CUSTOMERS = [
  ["c01", "Rania Khoury", "رانيا خوري", "abdoun", "0795550101", { en: "Orders for family gatherings on Fridays", ar: "تطلب لتجمّعات العائلة يوم الجمعة" }],
  ["c02", "Omar Nasser", "عمر ناصر", "khalda", "0785550102", ""],
  ["c03", "Dana Al-Masri", "دانا المصري", "sweifieh", "0775550103", { en: "Allergic to nuts", ar: "لديها حساسية من المكسرات" }],
  ["c04", "Yazan Haddad", "يزن حداد", "jubeiha", "0795550104", ""],
  ["c05", "Sara Obeidat", "سارة عبيدات", "tlaa", "0785550105", { en: "Prefers delivery after 5 pm", ar: "تفضّل التوصيل بعد الساعة 5 مساءً" }],
  ["c06", "Khaled Zoubi", "خالد الزعبي", "khalda", "0795550106", { en: "Office order most Thursdays", ar: "طلب للمكتب معظم أيام الخميس" }],
  ["c07", "Noor Hamdan", "نور حمدان", "jubeiha", "0775550107", ""],
  ["c08", "Faris Tamimi", "فارس التميمي", "abdoun", "0795550108", ""],
  ["c09", "Hala Saadeh", "هالة سعادة", "sweifieh", "0785550109", ""],
  ["c10", "Mais Qudah", "ميس القضاة", "tlaa", "0795550110", ""],
  ["c11", "Tariq Shami", "طارق الشامي", "dabouq", "0775550111", { en: "Call before arriving", ar: "يرجى الاتصال قبل الوصول" }],
  ["c12", "Leen Rawashdeh", "لين الرواشدة", "khalda", "0785550112", ""],
];

// [days ago, hour, customer, items, status, paid, payment method, delivery (days after ordering), notes]
const ORDERS = [
  [41, 11, "c01", [["maqluba", 1], ["fatayer", 2]], "delivered", true, "cash", 1],
  [40, 15, "c06", [["musakhan", 3], ["kubbeh", 2]], "delivered", true, "cliq", 1],
  [38, 10, "c03", [["warak", 2]], "delivered", true, "cash", 2],
  [36, 18, "c08", [["mansaf", 1]], "delivered", true, "card", 2, { en: "Extra laban on the side", ar: "لبن إضافي على الجانب" }],
  [34, 12, "c02", [["kunafa", 1]], "cancelled", false, "cash", 1],
  [33, 16, "c05", [["mulukhiyah", 1], ["hummus", 2]], "delivered", true, "cliq", 1],
  [31, 9, "c06", [["musakhan", 4]], "delivered", true, "cliq", 1],
  [29, 13, "c10", [["maamoul", 2]], "delivered", true, "cash", 2],
  [28, 17, "c01", [["shishbarak", 1], ["fatayer", 1]], "delivered", true, "cash", 1],
  [26, 11, "c04", [["maqluba", 1]], "delivered", false, "cash", 1],
  [25, 14, "c09", [["mahshi", 2]], "delivered", true, "card", 2],
  [23, 10, "c06", [["kubbeh", 3], ["musakhan", 2]], "delivered", true, "cliq", 1],
  [22, 19, "c12", [["kunafa", 1], ["maamoul", 1]], "delivered", true, "other", 2],
  [20, 12, "c07", [["warak", 1], ["hummus", 1]], "delivered", true, "cash", 1],
  [18, 15, "c11", [["mansaf", 2]], "delivered", true, "cliq", 3, { en: "Family lunch, deliver by 1 pm", ar: "غداء عائلي، التوصيل قبل الساعة 1 ظهراً" }],
  [17, 10, "c03", [["fatayer", 3]], "cancelled", false, "cliq", 1, { en: "Customer cancelled: plans changed", ar: "ألغت العميلة الطلب: تغيّرت خططها" }],
  [16, 16, "c06", [["musakhan", 3], ["kubbeh", 2]], "delivered", true, "cliq", 1],
  [14, 13, "c05", [["maqluba", 1], ["hummus", 1]], "delivered", false, "cash", 1],
  [13, 11, "c08", [["shishbarak", 2]], "delivered", true, "card", 2],
  [11, 18, "c02", [["mulukhiyah", 2]], "delivered", true, "cash", 1],
  [10, 9, "c10", [["maamoul", 3]], "delivered", true, "cliq", 3],
  [9, 14, "c01", [["mansaf", 1], ["kunafa", 1]], "delivered", true, "cash", 2],
  [7, 12, "c09", [["warak", 2], ["fatayer", 1]], "delivered", false, "other", 1],
  [6, 17, "c06", [["musakhan", 4], ["kubbeh", 2]], "delivered", true, "cliq", 1],
  [4, 10, "c04", [["mahshi", 1], ["hummus", 2]], "delivered", true, "cash", 2],
  [3, 15, "c07", [["maqluba", 2]], "in_progress", false, "cash", 3],
  [2, 11, "c12", [["kunafa", 2]], "in_progress", true, "cliq", 3],
  [1, 19, "c11", [["shishbarak", 1], ["warak", 1]], "new", false, "cash", 3, { en: "No pine nuts", ar: "بدون صنوبر" }],
  [0, 9, "c09", [["maamoul", 2], ["fatayer", 2]], "new", true, "cliq", 2],
  [0, 10, "c05", [["mulukhiyah", 1], ["maqluba", 1]], "new", false, "card", 1, { en: "Less salt please", ar: "ملح أقل لو سمحت" }],
];

const TAX_RATE = 16;

// Delivered orders that already have an invoice in the demo
const INVOICED = [1003, 1004, 1008, 1011, 1013, 1015, 1019, 1021, 1022, 1024, 1025];
const FIRST_ORDER_NUMBER = 1001;

function at(daysAgo, hour, minute, now) {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function createDemoData(now = new Date()) {
  const data = emptyData();
  data.settings = { taxEnabled: true, taxRate: TAX_RATE };

  data.customers = CUSTOMERS.map(([key, en, ar, area, phone, notes], i) => ({
    id: `demo-${key}`,
    name: { en, ar },
    phone,
    area: AREAS[area],
    notes,
    createdAt: at(55 - i, 10, 0, now).toISOString(),
  }));
  const areaOf = Object.fromEntries(CUSTOMERS.map(([key, , , area]) => [key, AREAS[area]]));

  data.orders = ORDERS.map(([daysAgo, hour, customer, items, status, paid, method, deliveryAfter, notes = ""], i) => {
    let created = at(daysAgo, hour, (i * 7) % 60, now);
    // Today's orders can't be in the future: place them a little before now
    const latest = new Date(now.getTime() - (ORDERS.length - i) * 4 * 60000);
    if (created > latest) created = latest;
    const delivery = addDays(created, deliveryAfter);
    const changed = status === "delivered" ? at(Math.max(daysAgo - deliveryAfter, 0), 13, 0, now) : created;

    return {
      id: `demo-o${FIRST_ORDER_NUMBER + i}`,
      number: FIRST_ORDER_NUMBER + i,
      customerId: `demo-${customer}`,
      items: items.map(([product, qty], j) => ({
        id: `demo-o${FIRST_ORDER_NUMBER + i}-${j}`,
        name: PRODUCTS[product].name,
        qty,
        unitPrice: PRODUCTS[product].price,
      })),
      taxRate: TAX_RATE,
      deliveryDate: isoDay(delivery),
      deliveryArea: areaOf[customer],
      notes,
      paymentMethod: method,
      paid,
      status,
      createdAt: created.toISOString(),
      updatedAt: changed.toISOString(),
    };
  });

  data.counters.order = FIRST_ORDER_NUMBER + ORDERS.length - 1;

  // Invoices, numbered in the order they were issued (on delivery)
  const seller = sellerSnapshot({ isDemo: true, businessNameKey: "demo.businessName", fullNameKey: "demo.ownerName", businessType: "food" });
  data.orders
    .filter((order) => INVOICED.includes(order.number))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1))
    .forEach((order, i) => issueInvoice(data, order, seller, { date: new Date(order.updatedAt), id: `demo-i${i + 1}` }));

  return data;
}
