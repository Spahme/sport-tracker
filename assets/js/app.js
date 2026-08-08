import { initRouter } from "./router.js";

function initTheme() {
  const themeToggle = document.querySelector("#theme-toggle");

  document.documentElement.dataset.theme =
    localStorage.getItem("theme") || "light";

  themeToggle.onclick = () => {
    const current =
      document.documentElement.dataset.theme;

    const next =
      current === "dark"
        ? "light"
        : "dark";

    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  };
}

function init() {
  initTheme();
  initRouter();
}

init();
