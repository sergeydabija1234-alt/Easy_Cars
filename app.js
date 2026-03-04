const IG_LINK = "https://www.instagram.com/easy_cars.md/";

/* ⚠️ НЕ ПАЛЮ СЕКРЕТЫ В ЧАТЕ — вставь свои значения локально */
const ADMIN_PASSWORD = "Artpop33";

/* ✅ Telegram username (без @) */
const TG_USER = "popovroman1982";
/* ⚠️ вставь свой токен */
const TG_BOT_TOKEN = "8694315636:AAGEY1csPlNOSHRYtUKmwMDcmn2lF_MzATw";
const TG_CHAT_ID = "-5113342887"; // твой chat_id

const LS_CARS = "easycars_cars_v4";
const LS_ADMIN_AUTH = "easycars_admin_auth_v1";

// remote API base for cars
const API_BASE = "https://69a439c0611ecf5bfc2474e3.mockapi.io/cars";
// enable server‑side pagination / search etc
const useServerPaging = true;

// helper to debounce async functions and prevent race conditions
function debounce(func, delay) {
  let timeoutId = null;
  let isRunning = false;
  return async function(...args) {
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

// helpers for talking to the mockapi
async function apiRequest(method, path = "", body = null) {
  const url = API_BASE + path;
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${method} ${url} failed (${res.status})`);
  return await res.json();
}

async function fetchAllCars() { return await apiRequest("GET"); }
async function fetchCarById(id) { return await apiRequest("GET", `/${id}`); }
async function fetchCarsPage({page=1, limit=6, q="", tag="", sort=""} = {}) {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("limit", limit);
  if (q) params.append("search", q);
  if (tag && tag !== "all") params.append("tag", tag);
  if (sort) {
    switch (sort) {
      case "priceAsc": params.append("sortBy", "price"); params.append("order", "asc"); break;
      case "priceDesc": params.append("sortBy", "price"); params.append("order", "desc"); break;
      case "yearDesc": params.append("sortBy", "year"); params.append("order", "desc"); break;
      default: // new -> sort by id desc
        params.append("sortBy", "id"); params.append("order", "desc");
    }
  }
  const url = "?" + params.toString();
  try {
    const data = await apiRequest("GET", url);
    return data.map((c, i) => normalizeCar(c, i));
  } catch (err) {
    console.warn("fetchCarsPage failed, falling back to local", err);
    // fallback to local storage if API unreachable
    const all = await loadCars();
    // apply filters/sort locally
    let filtered = all.filter(matches);
    filtered = sortCars(filtered);
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }
}
async function fetchCarsCount({q="", tag=""} = {}) {
  const params = new URLSearchParams();
  if (q) params.append("search", q);
  if (tag && tag !== "all") params.append("tag", tag);
  const url = "?" + params.toString();
  try {
    const arr = await apiRequest("GET", url);
    return Array.isArray(arr) ? arr.length : 0;
  } catch (err) {
    console.warn("fetchCarsCount failed, falling back to local", err);
    const all = await loadCars();
    return all.filter(matches).length;
  }
}

async function createCarRemote(car) { return await apiRequest("POST", "", car); }
async function updateCarRemote(id, car) { return await apiRequest("PUT", `/${id}`, car); }
async function deleteCarRemote(id) { return await apiRequest("DELETE", `/${id}`); }

// normalize a raw object (from API or localStorage) into the internal shape
function normalizeCar(raw, index) {
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
    igPosts: Array.isArray(raw.igPosts) ? raw.igPosts.map(normalizeIgUrl).filter(Boolean) : [],
    specs: {
      trans: cleanSpec(specs.trans),
      fuel: cleanSpec(specs.fuel),
      drive: cleanSpec(specs.drive),
      body: cleanSpec(specs.body),
      engine: normalizeEngine(specs.engine),
      power: safeText(specs.power).replace(/[^0-9]/g, ""),
      color: cleanSpec(specs.color),
      vin: cleanSpec(specs.vin)
    }
  };
}

const $ = (id) => document.getElementById(id);
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

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
  
  if (!data.ok) {
    console.log(data);
    console.error("Telegram error:", data);
    throw new Error(data.description || "Telegram error");
  }

  return true;
}

/* =========================
   ✅ I18N (RU / RO) — ADMIN НЕ ТРОГАЕМ
========================= */
const LS_LANG = "easycars_lang_v1";

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

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) ? I18N[currentLang][key] : key;
}

function applyStaticTranslations() {
  const root = document.documentElement;
  root.setAttribute("data-lang", currentLang);
  root.lang = currentLang === "ro" ? "ro" : "ru";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    el.setAttribute("placeholder", t(key));
  });

  document.querySelectorAll("option[data-i18n]").forEach(opt => {
    const key = opt.getAttribute("data-i18n");
    if (!key) return;
    opt.textContent = t(key);
  });

  const gt = $("mGalleryTitle");
  const gh = $("mGalleryHint");
  if (gt) gt.textContent = t("modal.galleryTitle");
  if (gh) gh.textContent = t("modal.galleryHint");
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
  render();
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
   SEED
========================= */
const seedCars = [
  {
    id: 1,
    tag: "inStock",
    title: "Skoda Rapid",
    year: 2017,
    price: 5850,
    currency: "€",
    km: 150000,
    meta: "1.6 • Механика • Бензин",
    text: "Пиши в Instagram — скину видео/осмотр/документы.",
    coverUrl: "",
    photos: [],
    igPosts: [],
    specs: {
      trans: "Механика",
      fuel: "Бензин",
      drive: "FWD",
      body: "Седан",
      engine: "1.6",
      power: "105",
      color: "",
      vin: ""
    }
  }
];

const state = { q: "", tag: "all", sort: "new", page: 1, totalItems: 0 };

let cars = []; // current page contents (or full list when not using server paging)
let allCars = null; // cache of full dataset for admin

async function ensureAllCars() {
  if (allCars === null) {
    try {
      const arr = await fetchAllCars();
      allCars = arr.map((c,i) => normalizeCar(c,i));
    } catch (err) {
      console.warn("failed to load all cars for admin", err);
      allCars = [];
    }
  }
  return allCars;
}

async function initData() {
  if (useServerPaging) {
    // pre‑fetch total count so pager shows something quickly
    try { state.totalItems = await fetchCarsCount({}); } catch(e){ state.totalItems = 0; }
  } else {
    cars = await loadCars();
  }
  await render();
}


/* =========================
   UTILS
========================= */
function formatMoney(n) {
  const s = String(Math.max(0, Number(n) || 0));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function safeText(v) { return String(v ?? "").trim(); }

function formatNow() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function priceLine(c) {
  const price = Number(c.price) || 0;
  if (!price) return t("car.priceIg");
  const cur = (c.currency || "€").trim();
  return `${cur} ${formatMoney(price)}`;
}
function titleLine(c) { return `${c.title} • ${c.year}`; }

function tagLabel(tag) {
  if (tag === "sold") return t("car.sold");
  if (tag === "soon") return t("car.soon");
  return t("car.inStock");
}
function tagClass(tag) {
  if (tag === "sold") return "badgeStatus--sold";
  if (tag === "soon") return "badgeStatus--soon";
  return "";
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
function parseIgList(text) {
  return safeText(text)
    .split(/[\r\n\s,;]+/g)
    .map(s => normalizeIgUrl(s))
    .filter(Boolean)
    .slice(0, 10);
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
function parsePhotoList(text) {
  return safeText(text)
    .split(/[\r\n\s,;]+/g)
    .map(s => normalizePhotoUrl(s))
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

/* =========================
   SPECS + AUTO META
========================= */
function cleanSpec(v) {
  const s = safeText(v);
  return s === "—" ? "" : s;
}
function normalizeEngine(v) {
  let s = safeText(v).replace(",", ".").replace(/[^0-9.]/g, "");
  if (!s) return "";
  if (s.includes(".")) {
    s = s.replace(/0+$/g, "").replace(/\.$/, "");
  }
  return s;
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

/* =========================
   STORAGE
========================= */
async function loadCars() {
  // try to fetch from remote API first
  try {
    const apiData = await fetchAllCars();
    if (Array.isArray(apiData) && apiData.length) {
      // cache remote data locally for offline
      try { localStorage.setItem(LS_CARS, JSON.stringify(apiData)); } catch {}
      return apiData.map((c, i) => normalizeCar(c, i));
    }
  } catch (err) {
    console.warn("API request failed, falling back to localStorage/seed", err);
  }

  // fallback to existing localStorage logic if API not available or returned empty
  try {
    const raw = localStorage.getItem(LS_CARS);

    if (!raw) {
      const oldRaw = localStorage.getItem("easycars_cars_v3");
      if (oldRaw) {
        localStorage.setItem(LS_CARS, oldRaw);
      } else {
        localStorage.setItem(LS_CARS, JSON.stringify(seedCars));
        return [...seedCars];
      }
    }

    const parsed = JSON.parse(localStorage.getItem(LS_CARS) || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LS_CARS, JSON.stringify(seedCars));
      return [...seedCars];
    }

    return parsed.map((c, i) => normalizeCar(c, i));
  } catch (e) {
    localStorage.setItem(LS_CARS, JSON.stringify(seedCars));
    return [...seedCars];
  }
}
function saveCars() { localStorage.setItem(LS_CARS, JSON.stringify(cars)); }
function nextId() {
  const maxId = cars.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0);
  return maxId + 1;
}

/* =========================
   FILTER/SORT
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
    case "priceAsc": return a.sort((x, y) => (Number(x.price) || 999999) - (Number(y.price) || 999999));
    case "priceDesc": return a.sort((x, y) => (Number(y.price) || -1) - (Number(x.price) || -1));
    case "yearDesc": return a.sort((x, y) => Number(y.year) - Number(x.year));
    default: return a.sort((x, y) => (Number(y.id) || 0) - (Number(x.id) || 0));
  }
}

/* =========================
   ✅ PAGINATION
========================= */
function perPage() {
  return (window.innerWidth >= 981) ? 6 : 3;
}
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// Ensure grid keeps equal height regardless of items count
function updateGridMinHeight() {
  const grid = $("grid");
  if (!grid) return;

  const cs = getComputedStyle(grid);
  const gap = parseFloat(cs.gap) || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-gap')) || 12;
  // try to get item height from CSS var, fallback to first .item
  const root = getComputedStyle(document.documentElement);
  let itemH = parseFloat(root.getPropertyValue('--item-height')) || 0;
  if (!itemH) {
    const sample = grid.querySelector('.item');
    if (sample) itemH = sample.getBoundingClientRect().height;
  }
  if (!itemH) itemH = 360;

  // compute number of columns from computed grid template
  let cols = 1;
  try {
    cols = (cs.gridTemplateColumns || '').split(' ').filter(Boolean).length || cols;
  } catch (e) { cols = 1; }

  const rows = Math.max(1, Math.ceil(perPage() / cols));
  
  
}

function ensurePager() {
  const pager = $("pager");
  if (!pager) return;
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

function slicePage(list) {
  const pp = perPage();
  const totalPages = Math.max(1, Math.ceil(list.length / pp));
  state.page = clamp(state.page, 1, totalPages);

  const start = (state.page - 1) * pp;
  return list.slice(start, start + pp);
}
async function keepScrollAndRender(nextPage) {
  state.page = nextPage;
  await render();

  // после переключения страницы прокрутить к фильтрам
  const filters = document.querySelector('.filters');
  if (filters) {
    // instant jump to filters, not smooth
    filters.scrollIntoView({ behavior: 'auto' });
  }
}
/* =========================
   INSTAGRAM EMBEDS
========================= */
function buildIgEmbed(url) {
  const safe = normalizeIgUrl(url);
  if (!safe) return "";
  return `<blockquote class="instagram-media" data-instgrm-permalink="${safe}" data-instgrm-version="14" style="width:100%; margin:0;"></blockquote>`;
}
function processIgEmbeds() {
  if (window.instgrm && window.instgrm.Embeds && typeof window.instgrm.Embeds.process === "function") {
    window.instgrm.Embeds.process();
  }
}

/* =========================
   LIGHTBOX
========================= */
let lbPhotos = [];
let lbIndex = 0;

function ensureLightbox() {
  if ($("lightbox")) return;

  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.id = "lightbox";
  lb.setAttribute("aria-hidden", "true");
  lb.innerHTML = `
    <div class="lightbox__bg" data-lb-close="1"></div>
    <button class="lightbox__close" data-lb-close="1">✕</button>
    <button class="lightbox__nav lightbox__nav--prev" id="lbPrev">‹</button>
    <button class="lightbox__nav lightbox__nav--next" id="lbNext">›</button>
    <img id="lbImg" alt="Фото авто">
    <div class="lightbox__count" id="lbCount">1 / 1</div>
  `;
  document.body.appendChild(lb);

  $("lbNext").addEventListener("click", lbNext);
  $("lbPrev").addEventListener("click", lbPrev);
}

function openLightbox(list, index = 0) {
  ensureLightbox();
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
  if (!$("lightbox")) return;
  $("lightbox").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function updateLightbox() {
  if (!lbPhotos.length) return;
  const src = lbPhotos[lbIndex];
  $("lbImg").src = src;
  $("lbCount").textContent = `${lbIndex + 1} / ${lbPhotos.length}`;
  const lb = $("lightbox");
  if (lb) lb.style.setProperty("--lb-bg", `url("${src}")`);
}
function updateLightboxNav() {
  const hasMany = lbPhotos.length > 1;
  const prev = $("lbPrev");
  const next = $("lbNext");
  if (prev) prev.style.display = hasMany ? "" : "none";
  if (next) next.style.display = hasMany ? "" : "none";
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
   AUTO PHOTO SWAP IN CATALOG
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
   RENDER CATALOG
========================= */
async function render() {
  const grid = $("grid");
  const empty = $("empty");
  grid.innerHTML = "";

  if (useServerPaging) {
    const pp = perPage();
    // fetch page with current filters/sort
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

    // ensure we know total count for pager
    try {
      state.totalItems = await fetchCarsCount({ q: state.q, tag: state.tag });
    } catch (err) {
      console.warn("count fetch failed", err);
      state.totalItems = pageCars.length;
    }

    updatePager(state.totalItems || pageCars.length);

    if (!pageCars.length) {
      empty.hidden = false;
      renderAdminList();
      stopCardSlides();
      return;
    }
    empty.hidden = true;

    cars = pageCars; // keep current page for other logic

    pageCars.forEach(c => {
      const list = uniqKeepOrder([c.coverUrl, ...(c.photos || [])])
        .map(normalizePhotoUrl)
        .filter(Boolean);

      const mainPhoto = list[0] || "";
      const hasCover = !!mainPhoto;

      const metaLine = carMetaAutoOrOld(c);

      const el = document.createElement("div");
      el.className = "item";

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
        <div class="badgeStatus ${tagClass(c.tag)}">
          ${tagLabel(c.tag)}
        </div>
        ${hasCover ? `<img src="${mainPhoto}" alt="Фото авто"> <div class="media__shade"></div>` : ""}
        <div class="media__label">${hasCover ? "" : t("car.addPhoto")}</div>
      `;

      const body = document.createElement("div");
      body.className = "item__body";
      body.innerHTML = `
        <div class="item__title">${titleLine(c)}</div>
        <div class="item__price">${priceLine(c)}</div>
        <div class="item__meta">${safeText(metaLine)}</div>
        <div class="item__meta">${tagLabel(c.tag)}${c.km ? " • " + formatMoney(c.km) + " " + t("car.km") : ""}</div>
        <div class="item__row">
          <button class="btn btn--ghost" data-open="${c.id}">${t("car.details")}</button>
          <a class="btn" href="${IG_LINK}" target="_blank" rel="noreferrer">${t("car.write")}</a>
        </div>
      `;

      el.appendChild(media);
      el.appendChild(body);
      grid.appendChild(el);
    });

    renderAdminList();
    startCardSlides();
    updateGridMinHeight();
    return;
  }

  // fallback to local rendering
  const fullFiltered = sortCars(cars.filter(matches));
  const pageList = slicePage(fullFiltered);

  updatePager(fullFiltered.length);

  if (!pageList.length) {
    empty.hidden = false;
    renderAdminList();
    stopCardSlides();
    return;
  }
  empty.hidden = true;

  pageList.forEach(c => {
    const list = uniqKeepOrder([c.coverUrl, ...(c.photos || [])])
      .map(normalizePhotoUrl)
      .filter(Boolean);

    const mainPhoto = list[0] || "";
    const hasCover = !!mainPhoto;

    const metaLine = carMetaAutoOrOld(c);

    const el = document.createElement("div");
    el.className = "item";

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
      <div class="badgeStatus ${tagClass(c.tag)}">
        ${tagLabel(c.tag)}
      </div>
      ${hasCover ? `<img src="${mainPhoto}" alt="Фото авто"> <div class="media__shade"></div>` : ""}
      <div class="media__label">${hasCover ? "" : t("car.addPhoto")}</div>
    `;

    const body = document.createElement("div");
    body.className = "item__body";
    body.innerHTML = `
      <div class="item__title">${titleLine(c)}</div>
      <div class="item__price">${priceLine(c)}</div>
      <div class="item__meta">${safeText(metaLine)}</div>
      <div class="item__meta">${tagLabel(c.tag)}${c.km ? " • " + formatMoney(c.km) + " " + t("car.km") : ""}</div>
      <div class="item__row">
        <button class="btn btn--ghost" data-open="${c.id}">${t("car.details")}</button>
        <a class="btn" href="${IG_LINK}" target="_blank" rel="noreferrer">${t("car.write")}</a>
      </div>
    `;

    el.appendChild(media);
    el.appendChild(body);
    grid.appendChild(el);
  });

  renderAdminList();
  startCardSlides();
  updateGridMinHeight();
}

/* =========================
   MODAL (CAR)
========================= */
function openCarModal(car) {
  ensureLightbox();

  $("mTitle").textContent = titleLine(car);
  $("mPrice").textContent = priceLine(car);

  const metaParts = [];
  const metaLine = carMetaAutoOrOld(car);
  if (metaLine) metaParts.push(metaLine);
  if (car.km) metaParts.push(`${formatMoney(car.km)} ${t("car.km")}`);
  metaParts.push(tagLabel(car.tag));
  $("mMeta").textContent = metaParts.join(" • ");

  const chips = buildSpecsChips(car);
  const specsBox = $("mSpecs");
  if (specsBox) {
    if (chips.length) {
      specsBox.innerHTML = chips.map(tt => `<span class="spec">${tt}</span>`).join("");
      specsBox.hidden = false;
    } else {
      specsBox.innerHTML = "";
      specsBox.hidden = true;
    }
  }

  $("mText").textContent = safeText(car.text);

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

  const gt = $("mGalleryTitle");
  const gh = $("mGalleryHint");
  if (gt) gt.textContent = t("modal.galleryTitle");
  if (gh) gh.textContent = t("modal.galleryHint");

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
   ✅ SEND MODAL
========================= */
function makeRequestText(name, phone, want, city) {
  const lines = [];
  lines.push(`🚗 easy_cars.md`);
  if (name) lines.push(`${currentLang === "ro" ? "👤 Nume" : "👤 Имя"}: ${name}`);
  if (phone) lines.push(`${currentLang === "ro" ? "📞 Telefon" : "📞 Телефон"}: ${phone}`);
  if (city) lines.push(`${currentLang === "ro" ? "📍 Oraș" : "📍 Город"}: ${city}`);
  if (want) lines.push(`${currentLang === "ro" ? "📌 Caută" : "📌 Что ищет"}: ${want}`);
  lines.push(`🕘 ${currentLang === "ro" ? "Timp" : "Время"}: ${formatNow()}`);
  return lines.join("\n");
}

function makeWaLink(text) {
  return `https://wa.me/37378312711?text=${encodeURIComponent(text)}`;
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
      tgBtn.textContent = (currentLang === "ro") ? "Se trimite..." : "Отправляем...";
      tgBtn.style.pointerEvents = "none";
      tgBtn.style.opacity = "0.75";

      try {
        await sendTelegramMessage(text);
        alert(currentLang === "ro" ? "Trimis în Telegram ✅" : "Отправлено в Telegram ✅");
        closeModal(m);
      } catch (err) {
        console.error(err);
        alert((currentLang === "ro")
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
   ADMIN AUTH
========================= */
function isAdminAuthed() { return localStorage.getItem(LS_ADMIN_AUTH) === "1"; }
function setAdminAuthed(val) { localStorage.setItem(LS_ADMIN_AUTH, val ? "1" : "0"); }

function openAdminModal() {
  $("adminModal").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  renderAdminList();
  updateMetaPreviewFromForm();
}
function tryOpenAdmin() {
  const pass = prompt("Пароль админки:");
  if (pass !== ADMIN_PASSWORD) {
    alert("Неверный пароль");
    return;
  }
  openAdminModal();
}

/* =========================
   ADMIN FORM
========================= */
function clearAdminForm() {
  $("aId").value = "";
  $("aTitle").value = "";
  $("aYear").value = "";
  $("aPrice").value = "";
  $("aCurrency").value = "€";
  $("aKm").value = "";
  $("aTag").value = "inStock";
  $("aCover").value = "";
  if ($("aPhotos")) $("aPhotos").value = "";
  $("aIg").value = "";
  $("aText").value = "";

  $("aTrans").value = "";
  $("aFuel").value = "";
  $("aDrive").value = "";
  $("aBody").value = "";
  $("aEngine").value = "";
  $("aPower").value = "";
  $("aColor").value = "";
  $("aVin").value = "";

  $("aMeta").value = "";
  updateMetaPreviewFromForm();

  $("saveBtn").textContent = "Сохранить";
}

function fillAdminForm(car) {
  $("aId").value = String(car.id);
  $("aTitle").value = safeText(car.title);
  $("aYear").value = String(car.year || "");
  $("aPrice").value = String(car.price || "");
  $("aCurrency").value = safeText(car.currency || "€") || "€";
  $("aKm").value = String(car.km || "");
  $("aTag").value = normalizeTag(car.tag);
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
  updateMetaPreviewFromForm();

  $("saveBtn").textContent = "Обновить";
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

  const box = $("aMetaPreview");
  if (box) box.textContent = `Meta: ${meta || "—"}`;
}

async function upsertCarFromForm() {
  const idRaw = $("aId").value.trim();
  const isEdit = !!idRaw;

  const title = safeText($("aTitle").value);
  const year = Number($("aYear").value);
  const price = Number($("aPrice").value || 0);
  const currency = safeText($("aCurrency").value);
  const km = Number($("aKm").value || 0);
  const tag = normalizeTag($("aTag").value);

  let coverUrl = normalizeCoverUrl($("aCover").value);

  const photosFromText = $("aPhotos") ? parsePhotoList($("aPhotos").value) : [];
  const photos = uniqKeepOrder(photosFromText)
    .map(normalizePhotoUrl)
    .filter(Boolean)
    .slice(0, 20);

  if (!coverUrl && photos.length) coverUrl = photos[0];

  const specs = getSpecsFromForm();
  const text = safeText($("aText").value);
  const igPosts = parseIgList($("aIg").value);

  if (!title) { alert("Заполни заголовок"); return; }
  if (!year || year < 1950 || year > 2100) { alert("Неправильный год"); return; }

  const metaAuto = buildMetaFromSpecs({ specs }) || "";

  // prepare payload that mirrors internal structure; note: API may ignore extra fields
  const payload = {
    title, year, price, currency, km, tag,
    coverUrl, photos, meta: metaAuto ? "" : safeText($("aMeta").value),
    text, igPosts, specs
  };

  try {
    if (isEdit) {
      const id = Number(idRaw);
      const idx = cars.findIndex(c => Number(c.id) === id);
      if (idx === -1) { alert("Авто не найдено"); return; }

      const updated = await updateCarRemote(id, payload);
      cars[idx] = normalizeCar(updated, idx);

      allCars = null;
      saveCars();
      await render();
      fillAdminForm(cars[idx]);

      $("saveBtn").textContent = "✅ Обновлено";
      setTimeout(() => { $("saveBtn").textContent = "Обновить"; }, 700);
      return;
    }

    const created = await createCarRemote(payload);
    cars.unshift(normalizeCar(created, 0));

    allCars = null;
    saveCars();
    clearAdminForm();
    state.page = 1;
    await render();

    $("saveBtn").textContent = "✅ Сохранено";
    setTimeout(() => { $("saveBtn").textContent = "Сохранить"; }, 700);
  } catch (err) {
    console.error(err);
    alert("Ошибка при сохранении на сервере");
  }
}

/* =========================
   ADMIN LIST
========================= */
function nextTagCycle(tag) {
  // цикл: inStock -> soon -> sold -> inStock
  if (tag === "inStock") return "soon";
  if (tag === "soon") return "sold";
  return "inStock";
}
function statusTextRu(tag) {
  if (tag === "sold") return "Продано";
  if (tag === "soon") return "Скоро в продаже";
  return "В наличии";
}
function toggleTextRu(tag) {
  if (tag === "inStock") return "Сделать: Скоро";
  if (tag === "soon") return "Сделать: Продано";
  return "Сделать: В наличии";
}

async function renderAdminList() {
  const box = $("adminItems");
  if (!box) return;

  box.innerHTML = "";
  let list = cars;
  if (useServerPaging) {
    list = await ensureAllCars();
  }

  const sorted = [...list].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

  if (sorted.length === 0) {
    const div = document.createElement("div");
    div.className = "muted";
    div.textContent = "Пока нет авто. Добавь первое слева.";
    box.appendChild(div);
    return;
  }

  sorted.forEach(c => {
    const st = statusTextRu(c.tag);
    const tt = toggleTextRu(c.tag);

    const igCount = Array.isArray(c.igPosts) ? c.igPosts.length : 0;
    const phCount = Array.isArray(c.photos) ? c.photos.length : 0;

    const metaLine = carMetaAutoOrOld(c);

    const item = document.createElement("div");
    item.className = "adminItem";
    item.innerHTML = `
      <div class="adminItem__left">
        <div class="adminItem__title">${titleLine(c)}</div>
        <div class="adminItem__meta">${priceLine(c)} • <b>${st}</b>${c.km ? " • " + formatMoney(c.km) + " км" : ""}</div>
        <div class="adminItem__meta">${safeText(metaLine) || "—"}${igCount ? " • IG: " + igCount : ""}${phCount ? " • Фото: " + phCount : " • Фото: ✗"}${c.coverUrl ? " • Обложка: ✓" : " • Обложка: ✗"}</div>
      </div>
      <div class="adminItem__right">
        <button class="btn btn--ghost" data-toggle="${c.id}">${tt}</button>
        <button class="btn btn--ghost" data-edit="${c.id}">Изменить</button>
        <button class="btn btn--ghost" data-del="${c.id}">Удалить</button>
      </div>
    `;
    box.appendChild(item);
  });
}

// async helpers for operations that hit the API
async function toggleCarTag(id) {
  // update server first
  try {
    // fetch current state if we don't have it locally
    let payload = {};
    const existing = cars.find(x => Number(x.id) === Number(id));
    if (existing) payload = { ...existing, tag: nextTagCycle(normalizeTag(existing.tag)) };
    else if (useServerPaging) {
      const raw = await fetchCarById(id);
      const norm = normalizeCar(raw, 0);
      payload = { ...norm, tag: nextTagCycle(normalizeTag(norm.tag)) };
    }
    const updated = await updateCarRemote(id, payload);
    // refresh page and admin cache
    allCars = null;
    await render();
  } catch (err) {
    console.error(err);
    alert("Не удалось обновить статус на сервере");
  }
}

async function deleteCarById(id) {
  let car = cars.find(x => Number(x.id) === Number(id));
  if (!car && useServerPaging) {
    try {
      const raw = await fetchCarById(id);
      car = normalizeCar(raw, 0);
    } catch (e) {}
  }
  if (!car) return;
  const ok = confirm(`Удалить "${car.title} • ${car.year}"?`);
  if (!ok) return;
  try {
    await deleteCarRemote(id);
  } catch (err) {
    console.error(err);
    alert("Ошибка удаления на сервере");
  }
  // refresh current page
  state.page = 1;
  allCars = null;
  await render();
  clearAdminForm();
}

/* =========================
   EXPORT / IMPORT
========================= */
function exportJson() {
  const data = JSON.stringify(cars, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "easy_cars_data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    (async () => {
      try {
        const parsed = JSON.parse(String(reader.result || "[]"));
        if (!Array.isArray(parsed)) throw new Error("not array");

        const cleaned = parsed
          .filter(x => x && typeof x === "object")
          .map((x, i) => {
            const specs = (x && typeof x.specs === "object" && x.specs) ? x.specs : {};
            const car = {
              id: Number(x.id) || (i + 1),
              title: safeText(x.title) || "Без названия",
              year: Number(x.year) || 2000,
              price: Number(x.price) || 0,
              currency: safeText(x.currency) || "€",
              km: Number(x.km) || 0,
              tag: normalizeTag(x.tag),
              coverUrl: normalizeCoverUrl(x.coverUrl),
              photos: Array.isArray(x.photos)
                ? x.photos.map(normalizePhotoUrl).filter(Boolean).slice(0, 20)
                : parsePhotoList(x.photos || ""),
              meta: safeText(x.meta),
              text: safeText(x.text),
              igPosts: Array.isArray(x.igPosts) ? x.igPosts.map(normalizeIgUrl).filter(Boolean) : parseIgList(x.igPosts || ""),
              specs: {
                trans: cleanSpec(specs.trans),
                fuel: cleanSpec(specs.fuel),
                drive: cleanSpec(specs.drive),
                body: cleanSpec(specs.body),
                engine: normalizeEngine(specs.engine),
                power: safeText(specs.power).replace(/[^0-9]/g, ""),
                color: cleanSpec(specs.color),
                vin: cleanSpec(specs.vin)
              }
            };

            car.photos = uniqKeepOrder(car.photos || []).slice(0, 20);
            if (!car.coverUrl && car.photos.length) car.coverUrl = car.photos[0];

            return car;
          });

        cars = cleaned;

        // push imported cars to remote API
        try {
          await Promise.all(cars.map(c => createCarRemote(c)));
        } catch (err) {
          console.error("Error uploading imported cars", err);
        }

        saveCars();
        clearAdminForm();
        state.page = 1;
        render();
        alert("Импорт успешно");
      } catch (e) {
        alert("Не получилось импортировать JSON");
      }
    })();
  };
  reader.readAsText(file);
}

/* =========================
   FLOATING SOCIAL MENU
========================= */
function initFloatingWhatsApp() {
  const old = document.querySelector(".floatWa");
  if (old) old.remove();

  if (document.getElementById("floatFab")) return;

  const wrap = document.createElement("div");
  wrap.className = "floatFab";
  wrap.id = "floatFab";

  wrap.innerHTML = `
    <div class="floatFab__items">
      <a class="floatFab__btn floatFab__btn--ig" data-tip="Instagram"
         href="https://www.instagram.com/easy_cars.md/" target="_blank" rel="noreferrer" aria-label="Instagram">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 4.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 2A1.8 1.8 0 1 0 13.8 12 1.8 1.8 0 0 0 12 10.2zM17.6 6.5a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9z"/>
        </svg>
      </a>

      <a class="floatFab__btn floatFab__btn--tg" data-tip="Telegram"
         href="https://t.me/${TG_USER}" target="_blank" rel="noreferrer" aria-label="Telegram">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21.8 4.6 2.9 11.9c-1 .4-.9 1.9.2 2.1l4.7 1.4 1.8 5.4c.3.9 1.4 1.1 2 .4l2.7-3.2 4.9 3.6c.8.6 1.9.1 2.1-.9l3-14.6c.2-1.2-1-2.1-2.3-1.5zM9.2 14.8l9.9-7.2c.2-.1.4.2.2.4l-8.2 8.1-.3 3.9-1.7-5.1-.1-.1z"/>
        </svg>
      </a>

      <a class="floatFab__btn floatFab__btn--tel" data-tip="Позвонить"
         href="tel:+37378312711" aria-label="Позвонить">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.4.6 3.7.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11.6 21 3 12.4 3 2c0-.6.4-1 1-1h3.1c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.7.1.4 0 .8-.3 1.1L6.6 10.8z"/>
        </svg>
      </a>
    </div>

    <button class="floatFab__btn floatFab__btn--wa" id="fabMain" aria-label="WhatsApp меню">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M19.11 17.53c-.28-.14-1.63-.8-1.88-.89-.25-.09-.43-.14-.61.14-.18.28-.7.89-.86 1.07-.16.18-.32.21-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.37-1.63-1.53-1.91-.16-.28-.02-.43.12-.57.12-.12.28-.32.41-.48.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.44-.46-.61-.46h-.52c-.18 0-.46.07-.7.35-.25.28-.95.93-.95 2.26s.98 2.62 1.12 2.8c.14.18 1.93 2.95 4.68 4.14.65.28 1.16.45 1.55.58.65.21 1.24.18 1.71.11.52-.08 1.63-.66 1.86-1.3.23-.64.23-1.18.16-1.3-.07-.12-.25-.18-.52-.32z"/>
        <path d="M16.02 3C9.39 3 4 8.39 4 15.02c0 2.12.55 4.19 1.6 6.02L4 29l8.16-1.55c1.77.96 3.77 1.47 5.86 1.47 6.63 0 12.02-5.39 12.02-12.02S22.65 3 16.02 3zm0 23.9c-1.93 0-3.78-.52-5.36-1.51l-.38-.23-4.84.92.94-4.71-.25-.39c-1.03-1.64-1.57-3.54-1.57-5.51C4.56 9.49 9.49 4.56 16.02 4.56s11.46 4.93 11.46 11.46-4.93 11.46-11.46 11.46z"/>
      </svg>
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
   BIND MAIN UI
========================= */
const debouncedRender = debounce(render, 300);
$("q")?.addEventListener("input", async (e) => { state.q = e.target.value; state.page = 1; await debouncedRender(); });
$("tag")?.addEventListener("change", async (e) => { state.tag = e.target.value; state.page = 1; await render(); });
$("sort")?.addEventListener("change", async (e) => { state.sort = e.target.value; state.page = 1; await render(); });

function bindPager(btn, change) {
  if (!btn) return;
  const handler = async (e) => {
    e.preventDefault();
    // blur early to avoid mobile viewport jump
    (e.target || e.currentTarget)?.blur();
    const next = change(Number(state.page) || 1);
    await keepScrollAndRender(next);
  };
  btn.addEventListener("click", handler);
  // also handle touchend which sometimes triggers focus changes differently
  btn.addEventListener("touchend", handler);
}

bindPager($("pagePrev"), (p) => Math.max(1, p - 1));
bindPager($("pageNext"), (p) => p + 1);

let lastPP = perPage();
window.addEventListener("resize", () => {
  const pp = perPage();
  if (pp !== lastPP) {
    lastPP = pp;
    render();
    // ensure grid height recalculated after render
    setTimeout(updateGridMinHeight, 80);
  }
  // always adjust grid min height for small resizes
  updateGridMinHeight();
}, { passive: true });

document.addEventListener("click", async (e) => {
  const tEl = e.target;

  const openId =
    tEl?.getAttribute?.("data-open") ||
    tEl?.closest?.("[data-open]")?.getAttribute?.("data-open");

  if (openId) {
    let car = cars.find(x => Number(x.id) === Number(openId));
    if (!car && useServerPaging) {
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
    let car = cars.find(x => Number(x.id) === Number(editId));
    if (!car && useServerPaging) {
      try {
        const raw = await fetchCarById(editId);
        car = normalizeCar(raw, 0);
      } catch (err) {
        console.warn("failed to fetch car for edit", err);
      }
    }
    if (car) {
      fillAdminForm(car);
      updateMetaPreviewFromForm();
    }
    return;
  }

  const delId = tEl?.getAttribute?.("data-del");
  if (delId) {
    await deleteCarById(delId);
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

/* =========================
   REQUEST FORM -> SEND MODAL
========================= */
(function initRequestSendModal(){
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

    const text = makeRequestText(name, phone, want, city);
    openSendModal(text);
  });
})();

/* admin actions */
$("adminForm")?.addEventListener("submit", async (e) => { e.preventDefault(); await upsertCarFromForm(); });
$("resetAdminBtn")?.addEventListener("click", clearAdminForm);

$("exportBtn")?.addEventListener("click", exportJson);
$("importBtn")?.addEventListener("click", () => $("importFile")?.click());
$("importFile")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) importJsonFile(file);
  e.target.value = "";
});
$("clearAllBtn")?.addEventListener("click", async () => {
  const ok = confirm("Точно очистить ВСЕ авто? Это удалит их из localStorage и на сервере.");
  if (!ok) return;
  try {
    await Promise.all(cars.map(c => deleteCarRemote(c.id)));
  } catch (err) {
    console.error(err);
    alert("Ошибка при очистке на сервере");
  }
  cars = [];
  saveCars();
  clearAdminForm();
  state.page = 1;
  render();
});

["aTrans", "aFuel", "aDrive", "aBody", "aEngine", "aPower", "aColor", "aVin"].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.addEventListener("input", updateMetaPreviewFromForm);
  el.addEventListener("change", updateMetaPreviewFromForm);
});

/* secret logo: 5 clicks */
let logoClicks = 0;
let logoTimer = null;
$("secretLogo")?.addEventListener("click", (e) => {
  e.preventDefault();
  logoClicks += 1;
  if (logoTimer) clearTimeout(logoTimer);
  logoTimer = setTimeout(() => { logoClicks = 0; }, 1200);
  if (logoClicks >= 5) {
    logoClicks = 0;
    tryOpenAdmin();
  }
});

/* footer year */
$("year") && ($("year").textContent = new Date().getFullYear());

/* scroll reveal */
function initReveal() {
  const targets = document.querySelectorAll(
    ".section, .card, .item, .hero__card, .contacts__box"
  );
  targets.forEach(el => el.classList.add("reveal"));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("show");
      else entry.target.classList.remove("show");
    });
  }, { threshold: 0.12 });

  targets.forEach(el => observer.observe(el));
}

/* back to top */
function initBackToTop() {
  let btn = document.getElementById("toTop");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "toTop";
    btn.className = "toTop";
    btn.type = "button";
    btn.setAttribute("aria-label", "Наверх");
    btn.innerHTML = `
      <svg class="toTop__svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5l-6 6 1.4 1.4L11 8.8V20h2V8.8l3.6 3.6L18 11z"/>
      </svg>
    `;
    document.body.appendChild(btn);
  }

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  const toggle = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    btn.classList.toggle("show", y > 420);
  };

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", toggle, { passive: true });
  window.addEventListener("load", toggle);
  toggle();
}

/* mobile header hide */
function initMobileHeaderHide() {
  const top = document.querySelector(".top");
  if (!top) return;

  let lastY = window.scrollY || 0;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY || 0;
    const delta = y - lastY;

    if (y < 60) {
      top.classList.remove("is-hidden");
      lastY = y;
      ticking = false;
      return;
    }

    if (delta > 6) top.classList.add("is-hidden");
    if (delta < -6) top.classList.remove("is-hidden");

    lastY = y;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (window.innerWidth > 980) return;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });
}

/* hide toTop when FAB open */
function syncToTopWithFab() {
  const fab = document.getElementById("floatFab");
  const toTop = document.getElementById("toTop");
  if (!fab || !toTop) return;

  const apply = () => {
    const open = fab.classList.contains("open");
    toTop.classList.toggle("fabOpen", open);
  };

  apply();
  const main = document.getElementById("fabMain");
  if (main) main.addEventListener("click", () => setTimeout(apply, 0));
  document.addEventListener("click", () => setTimeout(apply, 0));
}

/* =========================
   INIT
========================= */
ensureLightbox();
ensurePager();
initLangSwitch();

// load data from API/localStorage and then render
initData().then(() => {
  setTimeout(initReveal, 50);
});

initFloatingWhatsApp();
updateMetaPreviewFromForm();
initBackToTop();
initMobileHeaderHide();
syncToTopWithFab();