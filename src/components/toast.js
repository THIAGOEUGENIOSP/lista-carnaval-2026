export function mountToast(root) {
  const el = document.createElement("div");
  el.className = "toast";
  root.appendChild(el);

  function show({ title, message }) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<div class="t">${title}</div><div class="m">${message || ""}</div>`;
    el.appendChild(item);
    setTimeout(() => item.remove(), 3200);
  }

  return { show };
}
