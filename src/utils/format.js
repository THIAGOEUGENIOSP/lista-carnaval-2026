export function brl(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function formatQuantidade(kgValue, categoria) {
  const n = Number(kgValue || 0);
  const cat = String(categoria || "").trim().toLowerCase();
  const isChurrasco = cat === "churrasco";

  if (!Number.isFinite(n) || n <= 0) {
    return isChurrasco ? "0g" : "0";
  }

  if (!isChurrasco) {
    return n.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }

  if (n < 1) {
    const grams = n * 1000;
    const formatted = grams.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
    return `${formatted}g`;
  }

  const formatted = n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatted}kg`;
}

export function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
