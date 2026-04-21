const IG_LINK = "https://www.instagram.com/easy_cars.md/";

/* ⚠️ локальные значения */
const ADMIN_PASSWORD = "Artpop33099";
const TG_USER = "popovroman1982";
const TG_BOT_TOKEN = "8694315636:AAGEY1csPlNOSHRYtUKmwMDcmn2lF_MzATw";
const TG_CHAT_ID = "-5113342887";

const LS_CARS = "easycars_cars_v4";
const LS_PREORDERS = "easycars_preorders_v2";
const LS_ADMIN_AUTH = "easycars_admin_auth_v1";
const LS_LANG = "easycars_lang_v1";

const API_BASE = "https://69a439c0611ecf5bfc2474e3.mockapi.io/cars";
const PREORDER_API_BASE = "https://69a439c0611ecf5bfc2474e3.mockapi.io/preorders";

const useServerPaging = true;



const $ = (id) => document.getElementById(id);

function debounce(func, delay) {
  let timeoutId = null;
  let isRunning = false;
  return async function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      if (!isRunning) {
        isRunning = true;
        try {
          await func.apply(this, args);
        } finally {
          isRunning = false;
        }
      }
    }, delay);
  };
}

/* =========================
   API
========================= */
async function apiRequest(method, path = "", body = null) {
  const url = API_BASE + path;
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${method} ${url} failed (${res.status})`);
  return await res.json();
}

async function preorderRequest(method, path = "", body = null) {
  const url = PREORDER_API_BASE + path;
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${method} ${url} failed (${res.status})`);
  return await res.json();
}

async function fetchAllCars() { return await apiRequest("GET"); }
async function fetchCarById(id) { return await apiRequest("GET", `/${id}`); }
async function createCarRemote(car) { return await apiRequest("POST", "", car); }
async function updateCarRemote(id, car) { return await apiRequest("PUT", `/${id}`, car); }
async function deleteCarRemote(id) { return await apiRequest("DELETE", `/${id}`); }

async function fetchAllPreorders() { return await preorderRequest("GET"); }
async function fetchPreorderById(id) { return await preorderRequest("GET", `/${id}`); }
async function createPreorderRemote(car) { return await preorderRequest("POST", "", car); }
async function updatePreorderRemote(id, car) { return await preorderRequest("PUT", `/${id}`, car); }
async function deletePreorderRemote(id) { return await preorderRequest("DELETE", `/${id}`); }

async function fetchCarsPage({ page = 1, limit = 6, q = "", tag = "", sort = "" } = {}) {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("limit", limit);
  if (q) params.append("search", q);
  if (tag && tag !== "all") params.append("tag", tag);

  switch (sort) {
    case "priceAsc":
      params.append("sortBy", "price");
      params.append("order", "asc");
      break;
    case "priceDesc":
      params.append("sortBy", "price");
      params.append("order", "desc");
      break;
    case "yearDesc":
      params.append("sortBy", "year");
      params.append("order", "desc");
      break;
    default:
      params.append("sortBy", "id");
      params.append("order", "desc");
      break;
  }

  try {
    const data = await apiRequest("GET", "?" + params.toString());
    return dedupeCars((data || []).map((c, i) => normalizeCar(c, i)));
  } catch (err) {
    console.warn("fetchCarsPage failed, fallback to local", err);
    const all = await loadCars();
    let filtered = dedupeCars(all).filter(matches);
    filtered = sortCars(filtered);
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }
}

async function fetchCarsCount({ q = "", tag = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.append("search", q);
  if (tag && tag !== "all") params.append("tag", tag);

  try {
    const arr = await apiRequest("GET", "?" + params.toString());
    return dedupeCars((arr || []).map((c, i) => normalizeCar(c, i))).length;
  } catch (err) {
    console.warn("fetchCarsCount failed, fallback to local", err);
    const all = await loadCars();
    return dedupeCars(all).filter(matches).length;
  }
}

/* =========================
   I18N
========================= */
const I18N = {
  ru: {
    "nav.cars": "Авто",
    "nav.services": "Услуги",
    "nav.contacts": "Контакты",
    "top.premium": "Premium auto selection • Bălți",

    "hero.title": "Продажа и заказ авто из Европы",
    "hero.desc": "Подберём авто под бюджет, привезём, поможем с оформлением. Город: Bălți.",
    "hero.ctaCatalog": "Смотреть авто",
    "hero.ctaRequest": "Оставить заявку",
    "badge.europe": "Европа",
    "badge.selection": "Подбор",
    "badge.delivery": "Доставка",
    "hero.quick.title": "Быстрый контакт",

    "stat.check.title": "Проверка",
    "stat.check.text": "Диагностика и история",
    "stat.delivery.title": "Доставка",
    "stat.delivery.text": "Европа → Bălți",
    "stat.docs.title": "Оформление",
    "stat.docs.text": "Поможем с документами",
    "stat.pick.title": "Подбор",
    "stat.pick.text": "Под бюджет и задачу",

    "services.title": "Услуги",
    "services.s1.title": "Продажа авто",
    "services.s1.text": "Авто в наличии. Осмотр, проверка, оформление.",
    "services.s2.title": "Заказ из Европы",
    "services.s2.text": "Подбор под бюджет, поиск вариантов, доставка.",
    "services.s3.title": "Подбор под клиента",
    "services.s3.text": "Марка/год/пробег/коробка — под твою задачу.",

    "catalog.title": "Авто",
    "catalog.subtitle": "Поиск по марке/модели/году/цене",
    "catalog.searchPh": "Поиск: Skoda Rapid 2017, Ford Fusion 2016...",
    "catalog.empty": "Ничего не найдено.",

    "filter.all": "Все",
    "filter.inStock": "В наличии",
    "filter.soon": "Скоро в продаже",
    "filter.sold": "Продано",

    "sort.new": "Сначала новые",
    "sort.priceAsc": "Цена ↑",
    "sort.priceDesc": "Цена ↓",
    "sort.yearDesc": "Год ↓",

    "request.title": "Заявка",
    "request.subtitle": "Заполни — и отправь нам в личку (WhatsApp или Telegram).",
    "request.namePh": "Имя",
    "request.phonePh": "Телефон",
    "request.cityPh": "Город (например: Bălți)",
    "request.wantPh": "Что ищешь? (марка, год, бюджет)",
    "request.sendBtn": "Выбрать куда отправить",

    "contacts.title": "Контакты",

    "labels.tel": "Тел:",
    "labels.city": "Город:",

    "btn.call": "Позвонить",
    "btn.openIg": "Открыть Instagram",
    "btn.writeIg": "Написать в Instagram",
    "btn.writeIg2": "Написать в Instagram",

    "footer.tagline": "Продажа/заказ авто из Европы",

    "car.inStock": "В наличии",
    "car.soon": "Скоро в продаже",
    "car.sold": "Продано",
    "car.details": "Подробнее",
    "car.write": "Написать",
    "car.priceIg": "Цена в Instagram",
    "car.addPhoto": "Добавь фото",
    "car.km": "км",

    "modal.galleryTitle": "Фото/видео (Instagram)",
    "modal.galleryHint": "листай →",
    "modal.embedNote": "Если не грузит — пост приватный или сайт открыт как file://. Лучше через localhost.",
    "modal.openPhotoTitle": "Открыть фото",

    "send.title": "Куда отправить заявку?",
    "send.sub": "Выбери WhatsApp или Telegram — текст подставится автоматически.",
    "send.previewLabel": "Текст заявки",
    "send.wa": "Открыть WhatsApp",
    "send.tg": "Открыть Telegram",
    "send.hint": "На телефоне откроется приложение. На ПК — WhatsApp Web / Telegram Web или Desktop."
  },

  ro: {
    "nav.cars": "Mașini",
    "nav.services": "Servicii",
    "nav.contacts": "Contacte",
    "top.premium": "Selecție auto premium • Bălți",

    "hero.title": "Vânzare și comandă auto din Europa",
    "hero.desc": "Alegem mașina după buget, o aducem și ajutăm cu actele. Oraș: Bălți.",
    "hero.ctaCatalog": "Vezi mașinile",
    "hero.ctaRequest": "Trimite cerere",
    "badge.europe": "Europa",
    "badge.selection": "Selecție",
    "badge.delivery": "Livrare",
    "hero.quick.title": "Contact rapid",

    "stat.check.title": "Verificare",
    "stat.check.text": "Diagnoză și istoric",
    "stat.delivery.title": "Livrare",
    "stat.delivery.text": "Europa → Bălți",
    "stat.docs.title": "Acte",
    "stat.docs.text": "Ajutăm cu documentele",
    "stat.pick.title": "Selecție",
    "stat.pick.text": "După buget și nevoie",

    "services.title": "Servicii",
    "services.s1.title": "Vânzare auto",
    "services.s1.text": "Mașini în stoc. Verificare, vizionare, acte.",
    "services.s2.title": "Comandă din Europa",
    "services.s2.text": "Selecție după buget, căutare, livrare.",
    "services.s3.title": "Selecție pentru client",
    "services.s3.text": "Marcă/an/km/cutie — pentru necesitatea ta.",

    "catalog.title": "Mașini",
    "catalog.subtitle": "Căutare după marcă/model/an/preț",
    "catalog.searchPh": "Căutare: Skoda Rapid 2017, Ford Fusion 2016...",
    "catalog.empty": "Nu s-a găsit nimic.",

    "filter.all": "Toate",
    "filter.inStock": "Disponibil",
    "filter.soon": "În curând",
    "filter.sold": "Vândut",

    "sort.new": "Cele mai noi",
    "sort.priceAsc": "Preț ↑",
    "sort.priceDesc": "Preț ↓",
    "sort.yearDesc": "An ↓",

    "request.title": "Cerere",
    "request.subtitle": "Completează și trimite-ne în privat (WhatsApp sau Telegram).",
    "request.namePh": "Nume",
    "request.phonePh": "Telefon",
    "request.cityPh": "Oraș (ex: Bălți)",
    "request.wantPh": "Ce cauți? (marcă, an, buget)",
    "request.sendBtn": "Alege unde trimiți",

    "contacts.title": "Contacte",

    "labels.tel": "Tel:",
    "labels.city": "Oraș:",

    "btn.call": "Sună",
    "btn.openIg": "Deschide Instagram",
    "btn.writeIg": "Scrie pe Instagram",
    "btn.writeIg2": "Scrie pe Instagram",

    "footer.tagline": "Vânzare/comandă auto din Europa",

    "car.inStock": "Disponibil",
    "car.soon": "În curând",
    "car.sold": "Vândut",
    "car.details": "Detalii",
    "car.write": "Scrie",
    "car.priceIg": "Preț în Instagram",
    "car.addPhoto": "Adaugă foto",
    "car.km": "km",

    "modal.galleryTitle": "Foto/video (Instagram)",
    "modal.galleryHint": "glisează →",
    "modal.embedNote": "Dacă nu se încarcă — postarea e privată sau site-ul e deschis ca file://. Mai bine prin localhost.",
    "modal.openPhotoTitle": "Deschide foto",

    "send.title": "Unde trimiți cererea?",
    "send.sub": "Alege WhatsApp sau Telegram — textul se completează automat.",
    "send.previewLabel": "Textul cererii",
    "send.wa": "Deschide WhatsApp",
    "send.tg": "Deschide Telegram",
    "send.hint": "Pe telefon se va deschide aplicația. Pe PC — WhatsApp Web / Telegram Web sau Desktop."
  }
};

let currentLang = localStorage.getItem(LS_LANG) || "ru";

/* =========================
   GLOBAL STATE
========================= */
const state = { q: "", tag: "all", sort: "new", page: 1, totalItems: 0 };
const appState = { requestMode: "form", adminMode: "cars", preorderPage: 1 };

let cars = [];
let allCars = null;
let preorders = [];
let allPreorders = null;

/* =========================
   UTILS
========================= */
function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) ? I18N[currentLang][key] : key;
}

function safeText(v) { return String(v ?? "").trim(); }

function formatMoney(n) {
  const s = String(Math.max(0, Number(n) || 0));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatNow() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeTag(tag) {
  const t0 = safeText(tag);
  if (t0 === "sold") return "sold";
  if (t0 === "soon") return "soon";
  return "inStock";
}

function normalizeIgUrl(url) {
  const u = safeText(url);
  if (!u) return "";
  if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(u)) return "";
  return u.endsWith("/") ? u : (u + "/");
}

function normalizeCoverUrl(url) {
  const u = safeText(url);
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) return "";
  return u;
}

function normalizePhotoUrl(url) {
  const u = safeText(url);
  if (!u) return "";
  if (/^data:image\//i.test(u)) return u;
  if (!/^https?:\/\//i.test(u)) return "";
  return u;
}

function parseIgList(text) {
  return safeText(text)
    .split(/[\r\n\s,;]+/g)
    .map(normalizeIgUrl)
    .filter(Boolean)
    .slice(0, 10);
}

function parsePhotoList(text) {
  return safeText(text)
    .split(/[\r\n\s,;]+/g)
    .map(normalizePhotoUrl)
    .filter(Boolean)
    .slice(0, 20);
}

function uniqKeepOrder(list) {
  const seen = new Set();
  const out = [];
  for (const x of (list || [])) {
    const k = String(x || "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function cleanSpec(v) {
  const s = safeText(v);
  return s === "—" ? "" : s;
}

function normalizeEngine(v) {
  let s = safeText(v).replace(",", ".").replace(/[^0-9.]/g, "");
  if (!s) return "";
  if (s.includes(".")) s = s.replace(/0+$/g, "").replace(/\.$/, "");
  return s;
}

function nextLocalId(list) {
  return list.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
}

function buildMetaFromSpecs(car) {
  const specs = car?.specs || {};
  const parts = [];
  const engine = normalizeEngine(specs.engine);
  const power = safeText(specs.power).replace(/[^0-9]/g, "");
  const fuel = cleanSpec(specs.fuel);
  const trans = cleanSpec(specs.trans);
  const drive = cleanSpec(specs.drive);

  if (engine) parts.push(engine);
  if (power) parts.push(`${power} л.с.`);
  if (fuel) parts.push(fuel);
  if (trans) parts.push(trans);
  if (drive) parts.push(drive);

  return parts.join(" • ").trim();
}

function buildSpecsChips(car) {
  const specs = car?.specs || {};
  const chips = [];
  const body = cleanSpec(specs.body);
  const engine = normalizeEngine(specs.engine);
  const power = safeText(specs.power).replace(/[^0-9]/g, "");
  const fuel = cleanSpec(specs.fuel);
  const trans = cleanSpec(specs.trans);
  const drive = cleanSpec(specs.drive);
  const color = cleanSpec(specs.color);
  const vin = cleanSpec(specs.vin);

  if (body) chips.push(body);
  if (engine) chips.push(`${engine} л`);
  if (power) chips.push(`${power} л.с.`);
  if (fuel) chips.push(fuel);
  if (trans) chips.push(trans);
  if (drive) chips.push(drive);
  if (color) chips.push(color);
  if (vin) chips.push(`VIN: ${vin}`);

  return chips;
}

function carMetaAutoOrOld(car) {
  const auto = buildMetaFromSpecs(car);
  const old = safeText(car.meta);
  return auto || old || "";
}

function normalizeCar(raw, index = 0) {
  const specs = (raw && typeof raw.specs === "object" && raw.specs) ? raw.specs : {};
  return {
    id: Number(raw.id) || (index + 1),
    tag: normalizeTag(raw.tag),
    title: safeText(raw.title) || "Без названия",
    year: Number(raw.year) || 2000,
    price: Number(raw.price) || 0,
    currency: safeText(raw.currency) || "€",
    km: Number(raw.km) || 0,
    meta: safeText(raw.meta),
    text: safeText(raw.text),
    coverUrl: normalizeCoverUrl(raw.coverUrl),
    photos: Array.isArray(raw.photos)
      ? raw.photos.map(normalizePhotoUrl).filter(Boolean).slice(0, 20)
      : [],
    igPosts: Array.isArray(raw.igPosts)
      ? raw.igPosts.map(normalizeIgUrl).filter(Boolean)
      : [],
    specs: {
      trans: cleanSpec(specs.trans),
      fuel: cleanSpec(specs.fuel),
      drive: cleanSpec(specs.drive),
      body: cleanSpec(specs.body),
      engine: normalizeEngine(specs.engine),
      power: safeText(specs.power).replace(/[^0-9]/g, ""),
      color: cleanSpec(specs.color),
      vin: cleanSpec(specs.vin)
    },
    sourceUrl: normalizeCoverUrl(raw.sourceUrl)
  };
}

function normalizePreorder(raw, index = 0) {
  const car = normalizeCar(raw, index);
  return {
    ...car,
    tag: "preorder",
    country: safeText(raw.country),
    sourceUrl: normalizeCoverUrl(raw.sourceUrl),
    preorderNote: safeText(raw.preorderNote)
  };
}

/* =========================
   DEDUPE
========================= */
function isSameCar(a, b) {
  const aVin = safeText(a?.specs?.vin).toLowerCase();
  const bVin = safeText(b?.specs?.vin).toLowerCase();
  if (aVin && bVin && aVin === bVin) return true;

  const aSource = safeText(a?.sourceUrl).toLowerCase();
  const bSource = safeText(b?.sourceUrl).toLowerCase();
  if (aSource && bSource && aSource === bSource) return true;

  return (
    safeText(a?.title).toLowerCase() === safeText(b?.title).toLowerCase() &&
    Number(a?.year) === Number(b?.year) &&
    Number(a?.price) === Number(b?.price) &&
    Number(a?.km) === Number(b?.km)
  );
}

function dedupeCars(list) {
  const map = new Map();

  for (const car of (list || [])) {
    const vin = safeText(car?.specs?.vin).toLowerCase();
    const source = safeText(car?.sourceUrl).toLowerCase();
    const key = vin
      ? `vin:${vin}`
      : source
      ? `src:${source}`
      : `fallback:${safeText(car?.title).toLowerCase()}|${car?.year}|${car?.price}|${car?.km}`;

    if (!map.has(key)) {
      map.set(key, car);
    }
  }

  return [...map.values()];
}

/* =========================
   TEXT HELPERS
========================= */
function priceLine(c) {
  const price = Number(c.price) || 0;
  if (!price) return t("car.priceIg");
  const cur = safeText(c.currency || "€") || "€";
  return `${cur} ${formatMoney(price)}`;
}

function titleLine(c) {
  return `${c.title} • ${c.year}`;
}

function tagLabel(tag) {
  if (tag === "sold") return t("car.sold");
  if (tag === "soon") return t("car.soon");
  if (tag === "preorder") return currentLang === "ro" ? "Precomandă" : "Предзаказ";
  return t("car.inStock");
}

function tagClass(tag) {
  if (tag === "sold") return "badgeStatus--sold";
  if (tag === "soon") return "badgeStatus--soon";
  if (tag === "preorder") return "badgeStatus--preorder";
  return "";
}

function preorderTitle() {
  return currentLang === "ro" ? "Precomandă" : "Предзаказ";
}

function preorderSourceText() {
  return currentLang === "ro" ? "Vezi sursa" : "Смотреть источник";
}

function preorderActionText() {
  return currentLang === "ro" ? "Lasă precomandă" : "Оставить предзаказ";
}

function preorderEmptyText() {
  return currentLang === "ro"
    ? "Deocamdată nu există mașini disponibile pentru precomandă."
    : "Пока нет доступных авто для предзаказа.";
}

function preorderIntroTitle() {
  return currentLang === "ro" ? "Mașini din Europa la precomandă" : "Авто из Европы по предзаказу";
}

function preorderIntroText() {
  return currentLang === "ro"
    ? "Aici sunt publicate variante din Europa. Dacă te interesează o anumită mașină — lasă o cerere direct din card."
    : "Здесь размещаются варианты из Европы. Если интересует конкретная машина — оставь заявку на предзаказ прямо по карточке.";
}

/* =========================
   STORAGE FALLBACK
========================= */
function saveCarsLocal(list) {
  try { localStorage.setItem(LS_CARS, JSON.stringify(list || [])); } catch {}
}

function savePreordersLocal(list) {
  try { localStorage.setItem(LS_PREORDERS, JSON.stringify(list || [])); } catch {}
}

/* =========================
   LOADERS
========================= */
async function loadCars() {
  try {
    const apiData = await fetchAllCars();
    const normalized = dedupeCars((apiData || []).map((c, i) => normalizeCar(c, i)));
    saveCarsLocal(normalized);
    return normalized;
  } catch (err) {
    console.warn("Cars API failed, fallback to localStorage", err);
  }

  try {
    const raw = localStorage.getItem(LS_CARS);
    if (!raw) return [];
    const parsed = JSON.parse(raw || "[]");
    return dedupeCars((parsed || []).map((c, i) => normalizeCar(c, i)));
  } catch {
    return [];
  }
}

async function loadPreorders() {
  try {
    const apiData = await fetchAllPreorders();
    const normalized = dedupeCars((apiData || []).map((c, i) => normalizePreorder(c, i)));
    savePreordersLocal(normalized);
    return normalized;
  } catch (err) {
    console.warn("Preorders API failed, fallback to localStorage", err);
  }

  try {
    const raw = localStorage.getItem(LS_PREORDERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw || "[]");
    return dedupeCars((parsed || []).map((c, i) => normalizePreorder(c, i)));
  } catch {
    return [];
  }
}

/* =========================
   FILTER / SORT / PAGER
========================= */
function matches(c) {
  const q = state.q.trim().toLowerCase();
  const metaAuto = carMetaAutoOrOld(c);
  const specsTxt = buildSpecsChips(c).join(" ");
  const text = `${c.title} ${c.year} ${c.price} ${c.currency} ${c.km} ${metaAuto} ${specsTxt} ${c.text} ${c.tag}`.toLowerCase();
  if (state.tag !== "all" && c.tag !== state.tag) return false;
  if (q && !text.includes(q)) return false;
  return true;
}

function sortCars(list) {
  const a = [...list];
  switch (state.sort) {
    case "priceAsc":
      return a.sort((x, y) => (Number(x.price) || 999999) - (Number(y.price) || 999999));
    case "priceDesc":
      return a.sort((x, y) => (Number(y.price) || -1) - (Number(x.price) || -1));
    case "yearDesc":
      return a.sort((x, y) => Number(y.year) - Number(x.year));
    default:
      return a.sort((x, y) => (Number(y.id) || 0) - (Number(x.id) || 0));
  }
}

function perPage() {
  return (window.innerWidth >= 981) ? 6 : 3;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function updateGridMinHeight() {
  const grid = $("grid");
  if (!grid) return;

  if (!grid.children.length) {
    grid.style.minHeight = "0px";
    return;
  }

  const cs = getComputedStyle(grid);
  const cols = (cs.gridTemplateColumns || "").split(" ").filter(Boolean).length || 1;
  const rows = Math.max(1, Math.ceil(perPage() / cols));
  const itemH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--item-height")) || 360;
  const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--grid-gap")) || 12;

  grid.style.minHeight = `${rows * itemH + (rows - 1) * gap}px`;
}

function updatePager(totalItems) {
  const pagerEl = $("pager");
  const prevBtn = $("pagePrev");
  const nextBtn = $("pageNext");
  const info = $("pageInfo");
  if (!pagerEl || !prevBtn || !nextBtn || !info) return;

  const pp = perPage();
  const totalPages = Math.max(1, Math.ceil(totalItems / pp));
  state.page = clamp(state.page, 1, totalPages);

  pagerEl.hidden = (totalItems <= pp);
  info.textContent = `${state.page} / ${totalPages}`;
  prevBtn.disabled = state.page <= 1;
  nextBtn.disabled = state.page >= totalPages;
}

async function keepScrollAndRender(nextPage) {
  state.page = nextPage;
  await render();
  const filters = document.querySelector(".filters");
  if (filters) filters.scrollIntoView({ behavior: "auto" });
}

/* =========================
   IG / LIGHTBOX
========================= */
function buildIgEmbed(url) {
  const safe = normalizeIgUrl(url);
  if (!safe) return "";
  return `<blockquote class="instagram-media" data-instgrm-permalink="${safe}" data-instgrm-version="14" style="width:100%; margin:0;"></blockquote>`;
}

function processIgEmbeds() {
  if (window.instgrm?.Embeds?.process) window.instgrm.Embeds.process();
}

let lbPhotos = [];
let lbIndex = 0;

function openLightbox(list, index = 0) {
  lbPhotos = Array.isArray(list) ? list.filter(Boolean) : [];
  if (!lbPhotos.length) return;

  lbIndex = Math.max(0, Math.min(index, lbPhotos.length - 1));
  const lb = $("lightbox");
  lb.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  updateLightbox();
  updateLightboxNav();
}

function closeLightbox() {
  const lb = $("lightbox");
  if (!lb) return;
  lb.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function updateLightbox() {
  if (!lbPhotos.length) return;
  const src = lbPhotos[lbIndex];
  $("lbImg").src = src;
  $("lbCount").textContent = `${lbIndex + 1} / ${lbPhotos.length}`;
  $("lightbox")?.style?.setProperty("--lb-bg", `url("${src}")`);
}

function updateLightboxNav() {
  const hasMany = lbPhotos.length > 1;
  if ($("lbPrev")) $("lbPrev").style.display = hasMany ? "" : "none";
  if ($("lbNext")) $("lbNext").style.display = hasMany ? "" : "none";
}

function lbNext() {
  if (!lbPhotos.length) return;
  lbIndex = (lbIndex + 1) % lbPhotos.length;
  updateLightbox();
}

function lbPrev() {
  if (!lbPhotos.length) return;
  lbIndex = (lbIndex - 1 + lbPhotos.length) % lbPhotos.length;
  updateLightbox();
}

/* =========================
   SLIDES
========================= */
const cardSlideTimers = new Map();

function stopCardSlides() {
  for (const t of cardSlideTimers.values()) clearInterval(t);
  cardSlideTimers.clear();
}

function startCardSlides() {
  stopCardSlides();
  document.querySelectorAll(".item__media[data-slide='1']").forEach(media => {
    const id = media.getAttribute("data-carid");
    const listRaw = media.getAttribute("data-ph") || "";
    const list = listRaw.split("|").map(s => s.trim()).filter(Boolean);
    if (list.length < 2) return;

    const img = media.querySelector("img");
    if (!img) return;

    let idx = 0;
    const timer = setInterval(() => {
      idx = (idx + 1) % list.length;
      img.src = list[idx];
    }, 2600);

    cardSlideTimers.set(id, timer);
  });
}

/* =========================
   SEND MODAL
========================= */
async function sendTelegramMessage(rawText) {
  const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: TG_CHAT_ID,
    text: rawText,
    disable_web_page_preview: true
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.description || "Telegram error");
  return true;
}

function makeWaLink(text) {
  return `https://wa.me/37378312711?text=${encodeURIComponent(text)}`;
}

function makeRequestText(name, phone, want, city) {
  const lines = [];
  lines.push(`🚗 easy_cars.md`);
  lines.push(currentLang === "ro" ? `📌 Tip: Cerere` : `📌 Тип: Заявка`);
  if (name) lines.push(`${currentLang === "ro" ? "👤 Nume" : "👤 Имя"}: ${name}`);
  if (phone) lines.push(`${currentLang === "ro" ? "📞 Telefon" : "📞 Телефон"}: ${phone}`);
  if (city) lines.push(`${currentLang === "ro" ? "📍 Oraș" : "📍 Город"}: ${city}`);
  if (want) lines.push(`${currentLang === "ro" ? "📌 Caută" : "📌 Что ищет"}: ${want}`);
  lines.push(`🕘 ${currentLang === "ro" ? "Timp" : "Время"}: ${formatNow()}`);
  return lines.join("\n");
}

function makePreorderRequestText(car) {
  const lines = [];
  lines.push(`🚗 easy_cars.md`);
  lines.push(currentLang === "ro" ? `📌 Tip: Precomandă` : `📌 Тип: Предзаказ`);
  lines.push(currentLang === "ro" ? `🚘 Mașină: ${car.title} • ${car.year}` : `🚘 Авто: ${car.title} • ${car.year}`);
  lines.push(currentLang === "ro" ? `💰 Preț: ${priceLine(car)}` : `💰 Цена: ${priceLine(car)}`);
  if (car.country) lines.push(currentLang === "ro" ? `🌍 Țară: ${car.country}` : `🌍 Страна: ${car.country}`);
  if (car.sourceUrl) lines.push(currentLang === "ro" ? `🔗 Sursă: ${car.sourceUrl}` : `🔗 Источник: ${car.sourceUrl}`);
  if (car.preorderNote) lines.push(currentLang === "ro" ? `📝 Notă: ${car.preorderNote}` : `📝 Комментарий: ${car.preorderNote}`);
  lines.push(currentLang === "ro" ? `🕘 Timp: ${formatNow()}` : `🕘 Время: ${formatNow()}`);
  return lines.join("\n");
}

function openSendModal(text) {
  const m = $("sendModal");
  if (!m) return;

  $("sendText").textContent = text;
  const waBtn = $("sendWaBtn");
  const tgBtn = $("sendTgBtn");

  if (waBtn) waBtn.href = makeWaLink(text);

  if (tgBtn) {
    tgBtn.href = "#";
    tgBtn.onclick = async (e) => {
      e.preventDefault();

      const old = tgBtn.textContent;
      tgBtn.textContent = currentLang === "ro" ? "Se trimite..." : "Отправляем...";
      tgBtn.style.pointerEvents = "none";
      tgBtn.style.opacity = "0.75";

      try {
        await sendTelegramMessage(text);
        alert(currentLang === "ro" ? "Trimis în Telegram ✅" : "Отправлено в Telegram ✅");
        closeModal(m);
      } catch (err) {
        console.error(err);
        alert(currentLang === "ro"
          ? "Eroare la trimitere în Telegram."
          : "Ошибка отправки в Telegram. Проверь токен/чат/Start у бота.");
      } finally {
        tgBtn.textContent = old;
        tgBtn.style.pointerEvents = "";
        tgBtn.style.opacity = "";
      }
    };
  }

  m.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

/* =========================
   REQUEST TABS
========================= */
function updateRequestTabsText() {
  document.querySelectorAll(".requestTabs__btn").forEach(btn => {
    const mode = btn.getAttribute("data-request-tab");
    if (mode === "form") btn.textContent = currentLang === "ro" ? "Cerere" : "Заявка";
    if (mode === "preorder") btn.textContent = currentLang === "ro" ? "Precomandă" : "Предзаказ";
  });
}

function setRequestMode(mode) {
  appState.requestMode = mode === "preorder" ? "preorder" : "form";

  document.querySelectorAll(".requestTabs__btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.getAttribute("data-request-tab") === appState.requestMode);
  });

  const formPane = $("requestFormPane");
  const preorderPane = $("requestPreorderPane");
  const lead = $("requestLead");

  if (appState.requestMode === "preorder") {
    formPane.hidden = true;
    preorderPane.hidden = false;
    formPane.classList.remove("requestPane--active");
    preorderPane.classList.add("requestPane--active");
    if (lead) {
      lead.textContent = currentLang === "ro"
        ? "Alege un model din Europa și trimite precomanda."
        : "Выбери вариант из Европы и отправь предзаказ.";
    }
  } else {
    formPane.hidden = false;
    preorderPane.hidden = true;
    formPane.classList.add("requestPane--active");
    preorderPane.classList.remove("requestPane--active");
    if (lead) lead.textContent = t("request.subtitle");
  }
}

/* =========================
   I18N APPLY
========================= */
function applyStaticTranslations() {
  const root = document.documentElement;
  root.setAttribute("data-lang", currentLang);
  root.lang = currentLang === "ro" ? "ro" : "ru";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });

  document.querySelectorAll("option[data-i18n]").forEach(opt => {
    const key = opt.getAttribute("data-i18n");
    if (key) opt.textContent = t(key);
  });

  if ($("mGalleryTitle")) $("mGalleryTitle").textContent = t("modal.galleryTitle");
  if ($("mGalleryHint")) $("mGalleryHint").textContent = t("modal.galleryHint");

  const requestLead = $("requestLead");
  if (requestLead && appState.requestMode === "form") {
    requestLead.textContent = t("request.subtitle");
  }

  updateRequestTabsText();
  updateAdminModeUI();
  renderPreorders();
  render();
}

function setLang(lang) {
  if (lang !== "ru" && lang !== "ro") lang = "ru";
  currentLang = lang;
  localStorage.setItem(LS_LANG, lang);

  document.querySelectorAll(".langSwitch__btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
  });

  applyStaticTranslations();
  state.page = 1;
}

function initLangSwitch() {
  document.querySelectorAll(".langSwitch__btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.getAttribute("data-lang") === currentLang);
  });

  document.addEventListener("click", (e) => {
    const b = e.target.closest(".langSwitch__btn");
    if (!b) return;
    setLang(b.getAttribute("data-lang"));
  });

  applyStaticTranslations();
}

/* =========================
   ADMIN
========================= */
function isAdminAuthed() {
  return localStorage.getItem(LS_ADMIN_AUTH) === "1";
}

function setAdminAuthed(val) {
  localStorage.setItem(LS_ADMIN_AUTH, val ? "1" : "0");
}

function openAdminModal() {
  $("adminModal").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  renderAdminList();
  updateMetaPreviewFromForm();
  updateAdminModeUI();
}

function tryOpenAdmin() {
  const pass = prompt("Пароль админки:");
  if (pass !== ADMIN_PASSWORD) {
    alert("Неверный пароль");
    return;
  }
  openAdminModal();
}

function setAdminMode(mode) {
  appState.adminMode = mode === "preorder" ? "preorder" : "cars";
  if ($("aMode")) $("aMode").value = appState.adminMode;
  clearAdminForm();
  updateAdminModeUI();
  renderAdminList();
}

function updateAdminModeUI() {
  document.querySelectorAll(".adminTabs__btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.getAttribute("data-admin-tab") === appState.adminMode);
    const mode = btn.getAttribute("data-admin-tab");
    btn.textContent = mode === "preorder"
      ? (currentLang === "ro" ? "Precomandă" : "Предзаказ")
      : (currentLang === "ro" ? "Mașini" : "Авто");
  });

  const title = $("adminListTitle");
  const sub = $("adminHeadSub");
  const preorderFields = $("adminPreorderFields");

  if (appState.adminMode === "preorder") {
    if (title) title.textContent = currentLang === "ro" ? "Lista precomenzilor" : "Список предзаказа";
    if (sub) sub.textContent = currentLang === "ro"
      ? "Adaugă mașini din Europa pentru precomandă. Ele vor apărea în secțiunea Cerere → Precomandă."
      : "Добавляй авто для предзаказа. Они будут показываться в разделе Заявка → Предзаказ.";
    if (preorderFields) preorderFields.hidden = false;
  } else {
    if (title) title.textContent = currentLang === "ro" ? "Lista mașinilor" : "Список авто";
    if (sub) sub.textContent = currentLang === "ro"
      ? "Adaugă mașini + copertă (link direct). Meta se formează automat din câmpuri."
      : "Добавляй авто + обложку (прямая ссылка). Meta собирается автоматически из полей.";
    if (preorderFields) preorderFields.hidden = true;
  }
}

function clearAdminForm() {
  if ($("aId")) $("aId").value = "";
  if ($("aTitle")) $("aTitle").value = "";
  if ($("aYear")) $("aYear").value = "";
  if ($("aPrice")) $("aPrice").value = "";
  if ($("aCurrency")) $("aCurrency").value = "€";
  if ($("aKm")) $("aKm").value = "";
  if ($("aTag")) $("aTag").value = appState.adminMode === "preorder" ? "soon" : "inStock";
  if ($("aCover")) $("aCover").value = "";
  if ($("aPhotos")) $("aPhotos").value = "";
  if ($("aIg")) $("aIg").value = "";
  if ($("aText")) $("aText").value = "";

  if ($("aTrans")) $("aTrans").value = "";
  if ($("aFuel")) $("aFuel").value = "";
  if ($("aDrive")) $("aDrive").value = "";
  if ($("aBody")) $("aBody").value = "";
  if ($("aEngine")) $("aEngine").value = "";
  if ($("aPower")) $("aPower").value = "";
  if ($("aColor")) $("aColor").value = "";
  if ($("aVin")) $("aVin").value = "";

  if ($("aMeta")) $("aMeta").value = "";
  if ($("aCountry")) $("aCountry").value = "";
  if ($("aSourceUrl")) $("aSourceUrl").value = "";
  if ($("aPreorderNote")) $("aPreorderNote").value = "";

  updateMetaPreviewFromForm();
  if ($("saveBtn")) $("saveBtn").textContent = currentLang === "ro" ? "Salvează" : "Сохранить";
}

function fillAdminForm(car) {
  $("aId").value = String(car.id);
  $("aTitle").value = safeText(car.title);
  $("aYear").value = String(car.year || "");
  $("aPrice").value = String(car.price || "");
  $("aCurrency").value = safeText(car.currency || "€") || "€";
  $("aKm").value = String(car.km || "");
  $("aTag").value = car.tag === "preorder" ? "soon" : normalizeTag(car.tag);
  $("aCover").value = safeText(car.coverUrl);

  if ($("aPhotos")) {
    const list = uniqKeepOrder([...(car.photos || [])]).map(normalizePhotoUrl).filter(Boolean);
    $("aPhotos").value = list.join("\n");
  }

  const s = car.specs || {};
  $("aTrans").value = cleanSpec(s.trans);
  $("aFuel").value = cleanSpec(s.fuel);
  $("aDrive").value = cleanSpec(s.drive);
  $("aBody").value = cleanSpec(s.body);
  $("aEngine").value = normalizeEngine(s.engine);
  $("aPower").value = safeText(s.power);
  $("aColor").value = cleanSpec(s.color);
  $("aVin").value = cleanSpec(s.vin);

  $("aIg").value = (Array.isArray(car.igPosts) ? car.igPosts.join("\n") : "");
  $("aText").value = safeText(car.text);

  $("aMeta").value = buildMetaFromSpecs(car) || safeText(car.meta) || "";
  if ($("aCountry")) $("aCountry").value = safeText(car.country);
  if ($("aSourceUrl")) $("aSourceUrl").value = safeText(car.sourceUrl);
  if ($("aPreorderNote")) $("aPreorderNote").value = safeText(car.preorderNote);

  updateMetaPreviewFromForm();
  $("saveBtn").textContent = currentLang === "ro" ? "Actualizează" : "Обновить";
}

function getSpecsFromForm() {
  return {
    trans: cleanSpec($("aTrans").value),
    fuel: cleanSpec($("aFuel").value),
    drive: cleanSpec($("aDrive").value),
    body: cleanSpec($("aBody").value),
    engine: normalizeEngine($("aEngine").value),
    power: safeText($("aPower").value).replace(/[^0-9]/g, ""),
    color: cleanSpec($("aColor").value),
    vin: cleanSpec($("aVin").value)
  };
}

function updateMetaPreviewFromForm() {
  const carLike = { specs: getSpecsFromForm() };
  const meta = buildMetaFromSpecs(carLike);
  if ($("aMeta")) $("aMeta").value = meta;
  if ($("aMetaPreview")) $("aMetaPreview").textContent = `Meta: ${meta || "—"}`;
}

async function ensureAllCars() {
  if (allCars === null) {
    try {
      const arr = await fetchAllCars();
      allCars = dedupeCars((arr || []).map((c, i) => normalizeCar(c, i)));
    } catch (err) {
      console.warn("failed to load all cars for admin", err);
      allCars = await loadCars();
    }
  }
  return allCars;
}

async function ensureAllPreorders() {
  if (allPreorders === null) {
    try {
      const arr = await fetchAllPreorders();
      allPreorders = dedupeCars((arr || []).map((c, i) => normalizePreorder(c, i)));
    } catch (err) {
      console.warn("failed to load all preorders for admin", err);
      allPreorders = await loadPreorders();
    }
  }
  return allPreorders;
}

async function renderAdminList() {
  const box = $("adminItems");
  if (!box) return;
  box.innerHTML = "";

  if (appState.adminMode === "preorder") {
    const list = [...await ensureAllPreorders()].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

    if (!list.length) {
      const div = document.createElement("div");
      div.className = "muted";
      div.textContent = currentLang === "ro" ? "Nu există încă mașini pentru precomandă." : "Пока нет авто для предзаказа.";
      box.appendChild(div);
      return;
    }

    list.forEach(c => {
      const igCount = Array.isArray(c.igPosts) ? c.igPosts.length : 0;
      const phCount = Array.isArray(c.photos) ? c.photos.length : 0;
      const metaLine = carMetaAutoOrOld(c);

      const item = document.createElement("div");
      item.className = "adminItem";
      item.innerHTML = `
        <div class="adminItem__left">
          <div class="adminItem__title">${escapeHtml(titleLine(c))}</div>
          <div class="adminItem__meta">${escapeHtml(priceLine(c))}${c.country ? " • " + escapeHtml(c.country) : ""}</div>
          <div class="adminItem__meta">${escapeHtml(metaLine || "—")}${igCount ? " • IG: " + igCount : ""}${phCount ? " • Фото: " + phCount : " • Фото: ✗"}</div>
        </div>
        <div class="adminItem__right">
          <button class="btn btn--ghost" data-edit-preorder="${c.id}">${currentLang === "ro" ? "Editează" : "Изменить"}</button>
          <button class="btn btn--ghost" data-del-preorder="${c.id}">${currentLang === "ro" ? "Șterge" : "Удалить"}</button>
        </div>
      `;
      box.appendChild(item);
    });
    return;
  }

  let list = cars;
  if (useServerPaging) list = await ensureAllCars();
  const sorted = [...dedupeCars(list)].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

  if (!sorted.length) {
    const div = document.createElement("div");
    div.className = "muted";
    div.textContent = currentLang === "ro" ? "Nu există încă mașini." : "Пока нет авто. Добавь первое слева.";
    box.appendChild(div);
    return;
  }

  sorted.forEach(c => {
    const st = c.tag === "sold" ? "Продано" : c.tag === "soon" ? "Скоро в продаже" : "В наличии";
    const tt = c.tag === "inStock" ? "Сделать: Скоро" : c.tag === "soon" ? "Сделать: Продано" : "Сделать: В наличии";
    const igCount = Array.isArray(c.igPosts) ? c.igPosts.length : 0;
    const phCount = Array.isArray(c.photos) ? c.photos.length : 0;
    const metaLine = carMetaAutoOrOld(c);

    const item = document.createElement("div");
    item.className = "adminItem";
    item.innerHTML = `
      <div class="adminItem__left">
        <div class="adminItem__title">${escapeHtml(titleLine(c))}</div>
        <div class="adminItem__meta">${escapeHtml(priceLine(c))} • <b>${escapeHtml(st)}</b>${c.km ? " • " + formatMoney(c.km) + " км" : ""}</div>
        <div class="adminItem__meta">${escapeHtml(metaLine || "—")}${igCount ? " • IG: " + igCount : ""}${phCount ? " • Фото: " + phCount : " • Фото: ✗"}${c.coverUrl ? " • Обложка: ✓" : " • Обложка: ✗"}</div>
      </div>
      <div class="adminItem__right">
        <button class="btn btn--ghost" data-toggle="${c.id}">${tt}</button>
        <button class="btn btn--ghost" data-edit="${c.id}">${currentLang === "ro" ? "Editează" : "Изменить"}</button>
        <button class="btn btn--ghost" data-del="${c.id}">${currentLang === "ro" ? "Șterge" : "Удалить"}</button>
      </div>
    `;
    box.appendChild(item);
  });
}

async function upsertCarFromForm() {
  const mode = $("aMode")?.value || appState.adminMode;
  const idRaw = safeText($("aId").value);
  const isEdit = !!idRaw;

  const title = safeText($("aTitle").value);
  const year = Number($("aYear").value);
  const price = Number($("aPrice").value || 0);
  const currency = safeText($("aCurrency").value || "€") || "€";
  const km = Number($("aKm").value || 0);
  const tag = normalizeTag($("aTag").value);

  let coverUrl = normalizeCoverUrl($("aCover").value);
  const photos = uniqKeepOrder(parsePhotoList($("aPhotos")?.value || "")).slice(0, 20);
  if (!coverUrl && photos.length) coverUrl = photos[0];

  const specs = getSpecsFromForm();
  const text = safeText($("aText").value);
  const igPosts = parseIgList($("aIg").value);
  const metaAuto = buildMetaFromSpecs({ specs }) || "";

  if (!title) {
    alert(currentLang === "ro" ? "Completează titlul." : "Заполни заголовок");
    return;
  }
  if (!year || year < 1950 || year > 2100) {
    alert(currentLang === "ro" ? "An incorect." : "Неправильный год");
    return;
  }

  if (mode === "preorder") {
    const country = safeText($("aCountry")?.value);
    const sourceUrl = normalizeCoverUrl($("aSourceUrl")?.value);
    const preorderNote = safeText($("aPreorderNote")?.value);

    const payload = normalizePreorder({
      id: isEdit ? Number(idRaw) : nextLocalId(preorders),
      title, year, price, currency, km,
      tag: "preorder",
      coverUrl,
      photos,
      meta: metaAuto ? "" : safeText($("aMeta").value),
      text,
      igPosts,
      specs,
      country,
      sourceUrl,
      preorderNote
    });

    const existing = dedupeCars(await ensureAllPreorders());
    const duplicate = existing.find(x => Number(x.id) !== Number(idRaw || 0) && isSameCar(x, payload));
    if (duplicate) {
      alert(currentLang === "ro" ? "Această mașină există deja în precomandă." : "Такое авто уже есть в предзаказе");
      return;
    }

    try {
      if (isEdit) {
        await updatePreorderRemote(Number(idRaw), payload);
      } else {
        await createPreorderRemote(payload);
      }

      allPreorders = null;
      preorders = await loadPreorders();
      appState.preorderPage = 1;
      renderPreorders();
      renderAdminList();
      clearAdminForm();

      $("saveBtn").textContent = "✅";
      setTimeout(() => {
        $("saveBtn").textContent = currentLang === "ro" ? "Salvează" : "Сохранить";
      }, 700);
    } catch (err) {
      console.error(err);
      alert(currentLang === "ro" ? "Eroare la salvarea precomenzii." : "Ошибка при сохранении предзаказа");
    }
    return;
  }

  const payload = {
    title, year, price, currency, km, tag,
    coverUrl, photos,
    meta: metaAuto ? "" : safeText($("aMeta").value),
    text, igPosts, specs,
    sourceUrl: normalizeCoverUrl($("aSourceUrl")?.value)
  };

  const existing = dedupeCars(await ensureAllCars());
  const duplicate = existing.find(x => Number(x.id) !== Number(idRaw || 0) && isSameCar(x, payload));
  if (duplicate) {
    alert(currentLang === "ro" ? "Această mașină există deja." : "Такое авто уже есть");
    return;
  }

  try {
    if (isEdit) {
      await updateCarRemote(Number(idRaw), payload);
    } else {
      await createCarRemote(payload);
    }

    allCars = null;
    cars = await loadCars();
    state.page = 1;
    await render();
    renderAdminList();
    clearAdminForm();

    $("saveBtn").textContent = "✅";
    setTimeout(() => {
      $("saveBtn").textContent = currentLang === "ro" ? "Salvează" : "Сохранить";
    }, 700);
  } catch (err) {
    console.error(err);
    alert(currentLang === "ro" ? "Eroare la salvarea pe server." : "Ошибка при сохранении на сервере");
  }
}

function nextTagCycle(tag) {
  if (tag === "inStock") return "soon";
  if (tag === "soon") return "sold";
  return "inStock";
}

async function toggleCarTag(id) {
  try {
    let payload = {};
    const existing = cars.find(x => Number(x.id) === Number(id));
    if (existing) payload = { ...existing, tag: nextTagCycle(normalizeTag(existing.tag)) };
    else {
      const raw = await fetchCarById(id);
      const norm = normalizeCar(raw, 0);
      payload = { ...norm, tag: nextTagCycle(normalizeTag(norm.tag)) };
    }

    await updateCarRemote(id, payload);
    allCars = null;
    cars = await loadCars();
    await render();
    renderAdminList();
  } catch (err) {
    console.error(err);
    alert(currentLang === "ro" ? "Nu s-a putut actualiza statusul." : "Не удалось обновить статус на сервере");
  }
}

async function deleteCarById(id) {
  let car = cars.find(x => Number(x.id) === Number(id));
  if (!car) {
    try {
      const raw = await fetchCarById(id);
      car = normalizeCar(raw, 0);
    } catch {}
  }
  if (!car) return;

  const ok = confirm(`${currentLang === "ro" ? "Ștergi" : "Удалить"} "${car.title} • ${car.year}"?`);
  if (!ok) return;

  try {
    await deleteCarRemote(id);
    allCars = null;
    cars = await loadCars();
    state.page = 1;
    await render();
    renderAdminList();
    clearAdminForm();
  } catch (err) {
    console.error(err);
    alert(currentLang === "ro" ? "Eroare la ștergere pe server." : "Ошибка удаления на сервере");
  }
}

async function deletePreorderById(id) {
  let car = preorders.find(x => Number(x.id) === Number(id));
  if (!car) {
    try {
      const raw = await fetchPreorderById(id);
      car = normalizePreorder(raw, 0);
    } catch {}
  }
  if (!car) return;

  const ok = confirm(`${currentLang === "ro" ? "Ștergi" : "Удалить"} "${car.title} • ${car.year}"?`);
  if (!ok) return;

  try {
    await deletePreorderRemote(id);
    allPreorders = null;
    preorders = await loadPreorders();
    appState.preorderPage = 1;
    renderPreorders();
    renderAdminList();
    clearAdminForm();
  } catch (err) {
    console.error(err);
    alert(currentLang === "ro" ? "Eroare la ștergerea precomenzii." : "Ошибка удаления предзаказа");
  }
}

/* =========================
   EXPORT / IMPORT
========================= */
function exportCurrentJson() {
  const data = appState.adminMode === "preorder" ? preorders : cars;
  const name = appState.adminMode === "preorder" ? "easy_cars_preorders.json" : "easy_cars_data.json";
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(String(reader.result || "[]"));
      if (!Array.isArray(parsed)) throw new Error("not array");

      if (appState.adminMode === "preorder") {
        const cleaned = dedupeCars(parsed.map((x, i) => normalizePreorder({ ...x, id: Number(x.id) || (i + 1) }, i)));
        for (const item of cleaned) {
          const existing = dedupeCars(await ensureAllPreorders());
          const duplicate = existing.find(x => isSameCar(x, item));
          if (!duplicate) await createPreorderRemote(item);
          allPreorders = null;
        }

        preorders = await loadPreorders();
        renderPreorders();
        renderAdminList();
        clearAdminForm();
        alert(currentLang === "ro" ? "Import reușit." : "Импорт успешно");
        return;
      }

      const cleaned = dedupeCars(parsed.map((x, i) => normalizeCar({ ...x, id: Number(x.id) || (i + 1) }, i)));
      for (const item of cleaned) {
        const existing = dedupeCars(await ensureAllCars());
        const duplicate = existing.find(x => isSameCar(x, item));
        if (!duplicate) await createCarRemote(item);
        allCars = null;
      }

      cars = await loadCars();
      clearAdminForm();
      state.page = 1;
      await render();
      renderAdminList();
      alert(currentLang === "ro" ? "Import reușit." : "Импорт успешно");
    } catch (e) {
      alert(currentLang === "ro" ? "Nu s-a putut importa JSON." : "Не получилось импортировать JSON");
    }
  };
  reader.readAsText(file);
}

/* =========================
   CATALOG RENDER
========================= */
function renderCatalogCard(c) {
  const list = uniqKeepOrder([c.coverUrl, ...(c.photos || [])]).map(normalizePhotoUrl).filter(Boolean);
  const mainPhoto = list[0] || "";
  const hasCover = !!mainPhoto;
  const metaLine = carMetaAutoOrOld(c);

  const el = document.createElement("div");
  el.className = "item reveal";

  const media = document.createElement("div");
  media.className = "item__media";
  media.setAttribute("data-open", String(c.id));
  media.style.cursor = "pointer";

  if (list.length >= 2) {
    media.setAttribute("data-slide", "1");
    media.setAttribute("data-carid", String(c.id));
    media.setAttribute("data-ph", list.join("|"));
  }

  media.innerHTML = `
    <div class="badgeStatus ${tagClass(c.tag)}">${tagLabel(c.tag)}</div>
    ${hasCover ? `<img src="${mainPhoto}" alt="Фото авто"><div class="media__shade"></div>` : ""}
    <div class="media__label">${hasCover ? "" : t("car.addPhoto")}</div>
  `;

  const body = document.createElement("div");
  body.className = "item__body";
  body.innerHTML = `
    <div class="item__title">${escapeHtml(titleLine(c))}</div>
    <div class="item__price">${escapeHtml(priceLine(c))}</div>
    <div class="item__meta">${escapeHtml(metaLine)}</div>
    <div class="item__meta">${escapeHtml(tagLabel(c.tag))}${c.km ? " • " + formatMoney(c.km) + " " + t("car.km") : ""}</div>
    <div class="item__row">
      <button class="btn btn--ghost" data-open="${c.id}">${t("car.details")}</button>
      <a class="btn" href="${IG_LINK}" target="_blank" rel="noreferrer">${t("car.write")}</a>
    </div>
  `;

  el.appendChild(media);
  el.appendChild(body);
  return el;
}

async function render() {
  const grid = $("grid");
  const empty = $("empty");
  if (!grid || !empty) return;

  grid.innerHTML = "";

  if (useServerPaging) {
    const pp = perPage();
    let pageCars = [];

    try {
      pageCars = await fetchCarsPage({
        page: state.page,
        limit: pp,
        q: state.q,
        tag: state.tag,
        sort: state.sort
      });
    } catch (err) {
      console.warn("page fetch failed", err);
      pageCars = [];
    }

    try {
      state.totalItems = await fetchCarsCount({ q: state.q, tag: state.tag });
    } catch {
      state.totalItems = pageCars.length;
    }

    updatePager(state.totalItems || pageCars.length);

    if (!pageCars.length) {
      empty.hidden = false;
      if (grid) grid.style.minHeight = "0px";
      stopCardSlides();
      renderAdminList();
      initScrollAnimations();
      return;
    }

    empty.hidden = true;
    cars = dedupeCars(pageCars);

    cars.forEach(c => grid.appendChild(renderCatalogCard(c)));
    startCardSlides();
    updateGridMinHeight();
    renderAdminList();
    initScrollAnimations();
    return;
  }

  const fullFiltered = sortCars(dedupeCars(cars).filter(matches));
  const totalPages = Math.max(1, Math.ceil(fullFiltered.length / perPage()));
  state.page = clamp(state.page, 1, totalPages);
  const start = (state.page - 1) * perPage();
  const pageList = fullFiltered.slice(start, start + perPage());

  updatePager(fullFiltered.length);

  if (!pageList.length) {
    empty.hidden = false;
    if (grid) grid.style.minHeight = "0px";
    stopCardSlides();
    renderAdminList();
    initScrollAnimations();
    return;
  }

  empty.hidden = true;
  pageList.forEach(c => grid.appendChild(renderCatalogCard(c)));
  startCardSlides();
  updateGridMinHeight();
  renderAdminList();
  initScrollAnimations();
}
/* =========================
   PREORDER RENDER
========================= */
function preorderPerPage() {
  return window.innerWidth <= 560 ? 3 : 6;
}

function ensurePreorderPager() {
  let pager = $("preorderPager");
  if (pager) return pager;

  const grid = $("preorderGrid");
  if (!grid || !grid.parentElement) return null;

  pager = document.createElement("div");
  pager.className = "pager";
  pager.id = "preorderPager";
  pager.hidden = true;

  pager.innerHTML = `
    <button class="pager__btn" id="preorderPagePrev" type="button" aria-label="Предыдущая страница">‹</button>
    <div class="pager__info" id="preorderPageInfo">1 / 1</div>
    <button class="pager__btn" id="preorderPageNext" type="button" aria-label="Следующая страница">›</button>
  `;

  grid.insertAdjacentElement("afterend", pager);

  $("preorderPagePrev")?.addEventListener("click", () => {
    appState.preorderPage = Math.max(1, (appState.preorderPage || 1) - 1);
    renderPreorders();
    const section = $("request");
    if (section) section.scrollIntoView({ behavior: "auto", block: "start" });
  });

  $("preorderPageNext")?.addEventListener("click", () => {
    const totalPages = Math.max(
      1,
      Math.ceil(dedupeCars(preorders || []).length / preorderPerPage())
    );

    appState.preorderPage = Math.min(totalPages, (appState.preorderPage || 1) + 1);
    renderPreorders();
    const section = $("request");
    if (section) section.scrollIntoView({ behavior: "auto", block: "start" });
  });

  return pager;
}

function renderPreorders() {
  const grid = $("preorderGrid");
  const empty = $("preorderEmpty");
  if (!grid || !empty) return;

  grid.innerHTML = "";

  const infoTitle = document.querySelector(".preorderInfo__title");
  const infoText = document.querySelector(".preorderInfo__text");
  if (infoTitle) infoTitle.textContent = preorderIntroTitle();
  if (infoText) infoText.textContent = preorderIntroText();

  const allList = [...dedupeCars(preorders || [])].sort(
    (a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)
  );

  const pager = ensurePreorderPager();

  if (!allList.length) {
    empty.hidden = false;
    empty.textContent = preorderEmptyText();
    if (pager) pager.hidden = true;
    return;
  }

  empty.hidden = true;

  const perPageCount = preorderPerPage();
  const totalPages = Math.max(1, Math.ceil(allList.length / perPageCount));

  if (!appState.preorderPage) appState.preorderPage = 1;
  appState.preorderPage = Math.max(1, Math.min(appState.preorderPage, totalPages));

  const start = (appState.preorderPage - 1) * perPageCount;
  const pageList = allList.slice(start, start + perPageCount);

  if (pager) {
    pager.hidden = allList.length <= perPageCount;

    const prevBtn = $("preorderPagePrev");
    const nextBtn = $("preorderPageNext");
    const info = $("preorderPageInfo");

    if (info) info.textContent = `${appState.preorderPage} / ${totalPages}`;
    if (prevBtn) prevBtn.disabled = appState.preorderPage <= 1;
    if (nextBtn) nextBtn.disabled = appState.preorderPage >= totalPages;
  }

  pageList.forEach(car => {
    const allPhotos = uniqKeepOrder([car.coverUrl, ...(car.photos || [])]).filter(Boolean);
    const photo = allPhotos[0] || "";
    const chips = buildSpecsChips(car).slice(0, 5);
    const meta = carMetaAutoOrOld(car);
    const country = safeText(car.country);
    const sourceUrl = safeText(car.sourceUrl);
    const note = safeText(car.preorderNote);

    const el = document.createElement("div");
    el.className = "preorderCard reveal";

    el.innerHTML = `
      <div class="preorderCard__media" data-open-preorder="${car.id}" style="cursor:pointer;">
        <div class="badgeStatus badgeStatus--preorder">${preorderTitle()}</div>
        ${photo ? `<img src="${photo}" alt="Фото авто">` : `<div class="media__label">${t("car.addPhoto")}</div>`}
      </div>

      <div class="preorderCard__body">
        <div class="preorderCard__title">${escapeHtml(titleLine(car))}</div>
        <div class="preorderCard__price">${escapeHtml(priceLine(car))}</div>
        ${meta ? `<div class="preorderCard__meta">${escapeHtml(meta)}</div>` : ""}
        ${country ? `<div class="preorderCard__meta">${currentLang === "ro" ? "Țară" : "Страна"}: ${escapeHtml(country)}</div>` : ""}
        ${chips.length ? `<div class="preorderCard__chips">${chips.map(x => `<span class="preorderChip">${escapeHtml(x)}</span>`).join("")}</div>` : ""}
        ${note ? `<div class="preorderCard__note">${escapeHtml(note)}</div>` : ""}
        ${sourceUrl ? `<a class="preorderSource" href="${sourceUrl}" target="_blank" rel="noreferrer">${preorderSourceText()}</a>` : ""}

        <div class="preorderCard__actions">
          <button class="btn btn--glass" type="button" data-open-preorder="${car.id}">${t("car.details")}</button>
          <button class="btn btn--neon" type="button" data-preorder-request="${car.id}">${preorderActionText()}</button>
        </div>
      </div>
    `;

    grid.appendChild(el);
  });
}

/* =========================
   MODAL
========================= */
function openCarModal(car) {
  $("mTitle").textContent = titleLine(car);
  $("mPrice").textContent = priceLine(car);

  const metaParts = [];
  const metaLine = carMetaAutoOrOld(car);
  if (metaLine) metaParts.push(metaLine);
  if (car.km) metaParts.push(`${formatMoney(car.km)} ${t("car.km")}`);
  if (car.tag) metaParts.push(tagLabel(car.tag));
  if (car.country) metaParts.push(car.country);
  $("mMeta").textContent = metaParts.join(" • ");

  const chips = buildSpecsChips(car);
  const specsBox = $("mSpecs");
  if (chips.length) {
    specsBox.innerHTML = chips.map(tt => `<span class="spec">${escapeHtml(tt)}</span>`).join("");
    specsBox.hidden = false;
  } else {
    specsBox.innerHTML = "";
    specsBox.hidden = true;
  }

  let bodyText = safeText(car.text);
  if (car.preorderNote) {
    bodyText = bodyText ? `${bodyText}\n\n${car.preorderNote}` : car.preorderNote;
  }
  if (car.sourceUrl) {
    bodyText = bodyText ? `${bodyText}\n\nИсточник: ${car.sourceUrl}` : `Источник: ${car.sourceUrl}`;
  }
  $("mText").textContent = bodyText;

  const list = uniqKeepOrder([car.coverUrl, ...(car.photos || [])])
    .map(normalizePhotoUrl)
    .filter(Boolean)
    .slice(0, 20);

  document.querySelectorAll("#modal .photoStrip").forEach(x => x.remove());

  const coverWrap = $("mCoverWrap");
  const coverImg = $("mCover");
  coverWrap.hidden = true;
  coverImg.removeAttribute("src");

  if (list.length) {
    const strip = document.createElement("div");
    strip.className = "photoStrip";

    const mainImg = document.createElement("img");
    mainImg.className = "photoStrip__main";
    mainImg.alt = "Фото авто";
    mainImg.src = list[0];
    mainImg.style.cursor = "zoom-in";
    mainImg.title = t("modal.openPhotoTitle");
    mainImg.addEventListener("click", () => {
      const idx = Math.max(0, list.indexOf(mainImg.src));
      openLightbox(list, idx);
    });
    strip.appendChild(mainImg);

    if (list.length > 1) {
      const thumbs = document.createElement("div");
      thumbs.className = "photoStrip__thumbs";

      list.forEach((src, idx) => {
        const im = document.createElement("img");
        im.src = src;
        im.alt = "Фото";
        if (idx === 0) im.classList.add("active");

        im.addEventListener("click", () => {
          mainImg.src = src;
          thumbs.querySelectorAll("img").forEach(i => i.classList.remove("active"));
          im.classList.add("active");
        });

        im.addEventListener("dblclick", () => openLightbox(list, idx));
        thumbs.appendChild(im);
      });

      strip.appendChild(thumbs);
    }

    const g = $("mGallery");
    g.parentNode.insertBefore(strip, g);
  } else if (car.coverUrl) {
    coverWrap.hidden = false;
    coverImg.src = car.coverUrl;
  }

  const g = $("mGallery");
  const track = $("mGalleryTrack");
  track.innerHTML = "";

  if ($("mGalleryTitle")) $("mGalleryTitle").textContent = t("modal.galleryTitle");
  if ($("mGalleryHint")) $("mGalleryHint").textContent = t("modal.galleryHint");

  if (Array.isArray(car.igPosts) && car.igPosts.length) {
    g.hidden = false;
    car.igPosts.slice(0, 10).forEach((url) => {
      const item = document.createElement("div");
      item.className = "gallery__item";
      item.innerHTML = `
        ${buildIgEmbed(url)}
        <div class="gallery__note">${t("modal.embedNote")}</div>
      `;
      track.appendChild(item);
    });
    setTimeout(processIgEmbeds, 80);
  } else {
    g.hidden = true;
  }

  $("modal").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(el) {
  el.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* =========================
   FLOAT FAB
========================= */
function initFloatingWhatsApp() {
  if (document.getElementById("floatFab")) return;

  const wrap = document.createElement("div");
  wrap.className = "floatFab";
  wrap.id = "floatFab";

  wrap.innerHTML = `
    <div class="floatFab__items">
      <a class="floatFab__btn floatFab__btn--ig" href="https://www.instagram.com/easy_cars.md/" target="_blank" rel="noreferrer" aria-label="Instagram">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 4.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 2A1.8 1.8 0 1 0 13.8 12 1.8 1.8 0 0 0 12 10.2zM17.6 6.5a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9z"/></svg>
      </a>
      <a class="floatFab__btn floatFab__btn--tg" href="https://t.me/${TG_USER}" target="_blank" rel="noreferrer" aria-label="Telegram">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.8 4.6 2.9 11.9c-1 .4-.9 1.9.2 2.1l4.7 1.4 1.8 5.4c.3.9 1.4 1.1 2 .4l2.7-3.2 4.9 3.6c.8.6 1.9.1 2.1-.9l3-14.6c.2-1.2-1-2.1-2.3-1.5zM9.2 14.8l9.9-7.2c.2-.1.4.2.2.4l-8.2 8.1-.3 3.9-1.7-5.1-.1-.1z"/></svg>
      </a>
      <a class="floatFab__btn floatFab__btn--tel" href="tel:+37378312711" aria-label="Позвонить">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.4.6 3.7.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11.6 21 3 12.4 3 2c0-.6.4-1 1-1h3.1c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.7.1.4 0 .8-.3 1.1L6.6 10.8z"/></svg>
      </a>
    </div>
    <button class="floatFab__btn floatFab__btn--wa" id="fabMain" aria-label="WhatsApp меню">
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19.11 17.53c-.28-.14-1.63-.8-1.88-.89-.25-.09-.43-.14-.61.14-.18.28-.7.89-.86 1.07-.16.18-.32.21-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.37-1.63-1.53-1.91-.16-.28-.02-.43.12-.57.12-.12.28-.32.41-.48.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.44-.46-.61-.46h-.52c-.18 0-.46.07-.7.35-.25.28-.95.93-.95 2.26s.98 2.62 1.12 2.8c.14.18 1.93 2.95 4.68 4.14.65.28 1.16.45 1.55.58.65.21 1.24.18 1.71.11.52-.08 1.63-.66 1.86-1.3.23-.64.23-1.18.16-1.3-.07-.12-.25-.18-.52-.32z"/><path d="M16.02 3C9.39 3 4 8.39 4 15.02c0 2.12.55 4.19 1.6 6.02L4 29l8.16-1.55c1.77.96 3.77 1.47 5.86 1.47 6.63 0 12.02-5.39 12.02-12.02S22.65 3 16.02 3zm0 23.9c-1.93 0-3.78-.52-5.36-1.51l-.38-.23-4.84.92.94-4.71-.25-.39c-1.03-1.64-1.57-3.54-1.57-5.51C4.56 9.49 9.49 4.56 16.02 4.56s11.46 4.93 11.46 11.46-4.93 11.46-11.46 11.46z"/></svg>
    </button>
  `;

  document.body.appendChild(wrap);

  const main = document.getElementById("fabMain");
  main.addEventListener("click", (e) => {
    e.preventDefault();
    wrap.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!wrap.classList.contains("open")) return;
    if (wrap.contains(e.target)) return;
    wrap.classList.remove("open");
  });
}

/* =========================
   INIT DATA
========================= */
async function initData() {
  cars = await loadCars();
  preorders = await loadPreorders();

  if (useServerPaging) {
    try { state.totalItems = await fetchCarsCount({}); } catch { state.totalItems = cars.length; }
  }

  await render();
  renderPreorders();
  renderAdminList();
  initScrollAnimations();
}

/* =========================
   BINDINGS
========================= */
const debouncedRender = debounce(render, 300);

$("q")?.addEventListener("input", async (e) => {
  state.q = e.target.value;
  state.page = 1;
  await debouncedRender();
});

$("tag")?.addEventListener("change", async (e) => {
  state.tag = e.target.value;
  state.page = 1;
  await render();
});

$("sort")?.addEventListener("change", async (e) => {
  state.sort = e.target.value;
  state.page = 1;
  await render();
});

function bindPager(btn, change) {
  if (!btn) return;
  const handler = async (e) => {
    e.preventDefault();
    (e.target || e.currentTarget)?.blur();
    const next = change(Number(state.page) || 1);
    await keepScrollAndRender(next);
  };
  btn.addEventListener("click", handler);
  btn.addEventListener("touchend", handler);
}

bindPager($("pagePrev"), (p) => Math.max(1, p - 1));
bindPager($("pageNext"), (p) => p + 1);

let lastPP = perPage();
window.addEventListener("resize", async () => {
  const pp = perPage();
  if (pp !== lastPP) {
    lastPP = pp;
    await render();
    renderPreorders();
    setTimeout(updateGridMinHeight, 80);
  }
  updateGridMinHeight();
}, { passive: true });

document.addEventListener("click", async (e) => {
  const tEl = e.target;

  const requestBtn = tEl.closest(".requestTabs__btn");
  if (requestBtn) {
    setRequestMode(requestBtn.getAttribute("data-request-tab"));
    return;
  }

  const adminTabBtn = tEl.closest(".adminTabs__btn");
  if (adminTabBtn) {
    setAdminMode(adminTabBtn.getAttribute("data-admin-tab"));
    return;
  }

  const preorderRequestId = tEl?.getAttribute?.("data-preorder-request");
  if (preorderRequestId) {
    const car = preorders.find(x => Number(x.id) === Number(preorderRequestId));
    if (car) openSendModal(makePreorderRequestText(car));
    return;
  }

  const openPreorderId =
    tEl?.getAttribute?.("data-open-preorder") ||
    tEl?.closest?.("[data-open-preorder]")?.getAttribute?.("data-open-preorder");

  if (openPreorderId) {
    let car = preorders.find(x => Number(x.id) === Number(openPreorderId));
    if (!car) {
      try {
        const raw = await fetchPreorderById(openPreorderId);
        car = normalizePreorder(raw, 0);
      } catch (err) {
        console.warn("failed to load preorder by id", err);
      }
    }
    if (car) openCarModal(car);
    return;
  }

  const openId =
    tEl?.getAttribute?.("data-open") ||
    tEl?.closest?.("[data-open]")?.getAttribute?.("data-open");

  if (openId) {
    let car = cars.find(x => Number(x.id) === Number(openId));
    if (!car) {
      try {
        const raw = await fetchCarById(openId);
        car = normalizeCar(raw, 0);
      } catch (err) {
        console.warn("failed to load car by id", err);
      }
    }
    if (car) openCarModal(car);
    return;
  }

  if (tEl?.getAttribute?.("data-close") === "1") {
    const modal = tEl.closest(".modal");
    if (modal) closeModal(modal);
    return;
  }

  if (tEl?.getAttribute?.("data-lb-close") === "1") {
    closeLightbox();
    return;
  }

  const toggleId = tEl?.getAttribute?.("data-toggle");
  if (toggleId) {
    await toggleCarTag(toggleId);
    return;
  }

  const editId = tEl?.getAttribute?.("data-edit");
  if (editId) {
    setAdminMode("cars");
    let car = cars.find(x => Number(x.id) === Number(editId));
    if (!car) {
      try {
        const raw = await fetchCarById(editId);
        car = normalizeCar(raw, 0);
      } catch {}
    }
    if (car) fillAdminForm(car);
    return;
  }

  const delId = tEl?.getAttribute?.("data-del");
  if (delId) {
    await deleteCarById(delId);
    return;
  }

  const editPreorderId = tEl?.getAttribute?.("data-edit-preorder");
  if (editPreorderId) {
    setAdminMode("preorder");
    let car = preorders.find(x => Number(x.id) === Number(editPreorderId));
    if (!car) {
      try {
        const raw = await fetchPreorderById(editPreorderId);
        car = normalizePreorder(raw, 0);
      } catch {}
    }
    if (car) fillAdminForm(car);
    return;
  }

  const delPreorderId = tEl?.getAttribute?.("data-del-preorder");
  if (delPreorderId) {
    await deletePreorderById(delPreorderId);
    return;
  }
});

document.addEventListener("keydown", (e) => {
  if ($("lightbox") && $("lightbox").getAttribute("aria-hidden") === "false") {
    if (e.key === "ArrowRight") lbNext();
    if (e.key === "ArrowLeft") lbPrev();
    if (e.key === "Escape") closeLightbox();
    return;
  }

  if (e.key === "Escape") {
    document.querySelectorAll('.modal[aria-hidden="false"]').forEach(m => closeModal(m));
  }
});

(function initRequestForm() {
  const form = $("form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = safeText(form.elements["name"]?.value);
    const phone = safeText(form.elements["phone"]?.value);
    const city = safeText(form.elements["city"]?.value);
    const want = safeText(form.elements["want"]?.value);

    if (!name || !phone) {
      alert(currentLang === "ro" ? "Completează numele și telefonul." : "Заполни имя и телефон.");
      return;
    }

    openSendModal(makeRequestText(name, phone, want, city));
  });
})();

$("adminForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await upsertCarFromForm();
});

$("resetAdminBtn")?.addEventListener("click", clearAdminForm);

$("exportBtn")?.addEventListener("click", exportCurrentJson);
$("importBtn")?.addEventListener("click", () => $("importFile")?.click());
$("importFile")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) importJsonFile(file);
  e.target.value = "";
});

$("clearAllBtn")?.addEventListener("click", async () => {
  if (appState.adminMode === "preorder") {
    const ok = confirm(currentLang === "ro"
      ? "Sigur ștergi toate mașinile din precomandă?"
      : "Точно очистить ВСЕ авто из предзаказа?");
    if (!ok) return;

    const fullList = await ensureAllPreorders();
    for (const c of fullList) {
      try { await deletePreorderRemote(c.id); } catch {}
    }

    allPreorders = null;
    preorders = await loadPreorders();
    appState.preorderPage = 1;
    renderPreorders();
    renderAdminList();
    clearAdminForm();
    return;
  }

  const ok = confirm(currentLang === "ro"
    ? "Sigur ștergi TOATE mașinile?"
    : "Точно очистить ВСЕ авто?");
  if (!ok) return;

  const fullList = await ensureAllCars();
  for (const c of fullList) {
    try { await deleteCarRemote(c.id); } catch {}
  }

  allCars = null;
  cars = await loadCars();
  clearAdminForm();
  state.page = 1;
  await render();
  renderAdminList();
});

["aTrans", "aFuel", "aDrive", "aBody", "aEngine", "aPower", "aColor", "aVin"].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.addEventListener("input", updateMetaPreviewFromForm);
  el.addEventListener("change", updateMetaPreviewFromForm);
});

/* =========================
   BOOT
========================= */
(function initSecretLogo() {
  const logo = $("secretLogo");
  if (!logo) return;

  let clicks = 0;
  let timer = null;

  logo.addEventListener("click", (e) => {
    e.preventDefault();
    clicks += 1;

    clearTimeout(timer);
    timer = setTimeout(() => { clicks = 0; }, 700);

    if (clicks >= 5) {
      clicks = 0;
      tryOpenAdmin();
    }
  });
})();

(function initRequestTabs() {
  updateRequestTabsText();
  setRequestMode("form");
})();

(function initAdminTabs() {
  updateAdminModeUI();
})();

(function initYear() {
  const y = $("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

initLangSwitch();
initFloatingWhatsApp();
initData();


/* =========================
   SCROLL ANIMATIONS
========================= */
let scrollAnimObserver = null;

function initScrollAnimations() {
  const elements = Array.from(document.querySelectorAll([
    ".reveal",
    "#services .card",
    "#catalog .head",
    "#catalog .filters",
    "#catalog .item",
    "#catalog .pager",
    "#request .h2",
    "#request #requestLead",
    "#request .requestTabs",
    "#request .form",
    "#request .preorderInfo",
    "#request .preorderCard",
    "#request #preorderPager",
    "#contacts .h2",
    "#contacts .contacts__box",
    "#contacts .premiumMap"
  ].join(", ")));

  if (!elements.length) return;

  if (scrollAnimObserver) {
    scrollAnimObserver.disconnect();
  }

  elements.forEach((el, index) => {
    el.classList.add("reveal");
    el.classList.remove("active");
    el.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
  });

  scrollAnimObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("active");
      obs.unobserve(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: "0px 0px -80px 0px"
  });

  elements.forEach((el) => scrollAnimObserver.observe(el));
}