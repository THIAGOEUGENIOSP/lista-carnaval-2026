const CATEGORY_ORDER = [
  "Limpeza e Higiene",
  "Padaria e Laticínios",
  "Hortifruti",
  "Bebidas",
  "Mercearia",
  "Proteínas e Ovos",
  "Geral",
];

const CATEGORY_META = {
  "Limpeza e Higiene": { icon: "🧽", className: "cat-clean" },
  "Padaria e Laticínios": { icon: "🥖", className: "cat-bakery" },
  Hortifruti: { icon: "🥬", className: "cat-produce" },
  Bebidas: { icon: "🥤", className: "cat-drinks" },
  Mercearia: { icon: "🛒", className: "cat-grocery" },
  "Proteínas e Ovos": { icon: "🥚", className: "cat-protein" },
  Geral: { icon: "📦", className: "cat-general" },
};

const CATEGORY_KEYWORDS = {
  "Limpeza e Higiene": [
    "papel higienico",
    "papel toalha",
    "detergente",
    "esponja",
    "desinfetante",
    "agua sanitaria",
    "sabao",
    "amaciante",
    "pano de prato",
    "vassoura",
    "rodo",
    "alcool",
    "multiuso",
  ],
  "Padaria e Laticínios": [
    "pao",
    "pao de queijo",
    "pao pullman",
    "bisnaguinha",
    "queijo",
    "mussarela",
    "requeijao",
    "iogurte",
    "yogurt",
    "danone",
    "leite",
    "margarina",
    "presunto",
  ],
  Hortifruti: [
    "banana",
    "maca",
    "mamao",
    "manga",
    "abacaxi",
    "tomate",
    "alface",
    "pepino",
    "cenoura",
    "limao",
    "cebola",
    "alho",
    "batata",
  ],
  Bebidas: [
    "suco",
    "agua",
    "refrigerante",
    "coca",
    "cafe",
    "cha",
    "cerveja",
  ],
  Mercearia: [
    "maionese",
    "mostarda",
    "azeite",
    "arroz",
    "feijao",
    "macarrao",
    "molho de tomate",
    "ketchup",
    "oleo",
    "acucar",
    "sal",
    "tapioca",
    "granola",
  ],
  "Proteínas e Ovos": ["ovo", "ovos", "frango", "carne", "peixe", "sardinha"],
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(token) {
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function fuzzyTokenMatch(token, keyword) {
  const t = singularize(token);
  const k = singularize(keyword);
  if (!t || !k) return false;
  if (t === k) return true;
  if (t.length >= 4 && k.length >= 4) {
    if (t.startsWith(k) || k.startsWith(t)) return true;
  }
  return false;
}

export function classifyShoppingCategory(name) {
  const normalized = normalizeText(name);
  if (!normalized) return "Geral";

  const tokens = normalized.split(" ").filter(Boolean);
  let bestCategory = "Geral";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;

    for (const rawKeyword of keywords) {
      const keyword = normalizeText(rawKeyword);
      if (!keyword) continue;

      if (normalized.includes(keyword)) {
        score += keyword.includes(" ") ? 4 : 3;
        continue;
      }

      if (!keyword.includes(" ")) {
        const matched = tokens.some((t) => fuzzyTokenMatch(t, keyword));
        if (matched) score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore >= 2 ? bestCategory : "Geral";
}

export function getShoppingCategories() {
  return [...CATEGORY_ORDER];
}

export function normalizeShoppingCategory(category) {
  const raw = String(category || "").trim();
  if (!raw) return "Geral";

  const normalized = normalizeText(raw);
  const found = CATEGORY_ORDER.find((cat) => normalizeText(cat) === normalized);
  return found || "Geral";
}

export function groupShoppingItemsByCategory(items) {
  const map = new Map(CATEGORY_ORDER.map((cat) => [cat, []]));

  for (const it of items || []) {
    const cat = normalizeShoppingCategory(it?.categoria);
    map.get(cat).push(it);
  }

  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: map.get(cat) || [],
  })).filter((g) => g.items.length > 0);
}

export function getShoppingCategoryMeta(category) {
  const normalized = normalizeShoppingCategory(category);
  return CATEGORY_META[normalized] || CATEGORY_META.Geral;
}
