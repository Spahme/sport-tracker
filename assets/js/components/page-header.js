export function setTitle(title, kicker = "Suivi sportif") {
  document.querySelector("#page-title").textContent = title;
  document.querySelector("#page-kicker").textContent = kicker;
}
