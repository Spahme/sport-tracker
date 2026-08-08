import { state } from "../state.js";

export const navigationItems = [
  ["dashboard", "⌂", "Accueil"],
  ["week", "▦", "Semaine"],
  ["workouts", "◫", "Séances"],
  ["exercises", "◉", "Exercices"],
  ["history", "↺", "Historique"],
  ["programs", "⚙", "Programme"],
  ["tracking", "＋", "Suivi"],
];

function navigationHtml() {
  const items = navigationItems;

  return items
    .map(
      ([route, icon, label]) => `
        <button
          class="nav-button ${state.route === route ? "active" : ""}"
          type="button"
          data-route="${route}"
        >
          <span>${icon}</span>
          <span>${label}</span>
        </button>
      `,
    )
    .join("");
}

export function renderNavigation(onNavigate) {
  document.querySelector("#desktop-nav").innerHTML = navigationHtml();
  document.querySelector("#mobile-nav").innerHTML = navigationHtml();

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.onclick = () => {
      onNavigate(button.dataset.route);
    };
  });
}
