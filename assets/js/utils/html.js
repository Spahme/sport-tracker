export function esc(value = "") {
  return String(value).replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[char],
  );
}

export function empty(text) {
  return `<div class="empty">${esc(text)}</div>`;
}

export function loading(root = document.querySelector("#app")) {
  root.innerHTML = '<div class="loading">Chargement…</div>';
}
