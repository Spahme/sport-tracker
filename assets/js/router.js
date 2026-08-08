import { state } from "./state.js";
import { renderNavigation } from "./components/navigation.js";
import { renderActiveSessionBar } from "./components/active-session-bar.js";
import { esc } from "./utils/html.js";

import { renderDashboard } from "./pages/dashboard.js";
import { renderWeek } from "./pages/week.js";
import { renderWorkouts } from "./pages/workouts.js";
import { renderExercises } from "./pages/exercises.js";
import { renderPrograms } from "./pages/programs.js";
import { renderHistory } from "./pages/history.js";
import { renderTracking } from "./pages/tracking.js";
import { renderSession } from "./pages/session.js";

const app = document.querySelector("#app");

const routes = {
  dashboard: renderDashboard,
  week: renderWeek,
  workouts: renderWorkouts,
  exercises: renderExercises,
  programs: renderPrograms,
  history: renderHistory,
  tracking: renderTracking,
  session: renderSession,
};

const publicRoutes = Object.keys(routes);

export function go(route) {
  const next = routes[route] ? route : "dashboard";

  state.route = next;

  if (location.hash !== `#${next}`) {
    location.hash = next;
    return;
  }

  render();
}

export async function render() {
  renderNavigation(go);

  const renderer =
    routes[state.route] ||
    routes.dashboard;

  const context = {
    go,
    rerender: render,
  };

  try {
    await renderer(context);
    await renderActiveSessionBar(context);
  } catch (error) {
    app.innerHTML = `
      <div class="empty">
        <strong>Erreur</strong>
        <br>
        ${esc(error.message)}
        <br><br>

        <span class="muted">
          Vérifie la configuration de l’API et l’import de la base SQL.
        </span>
      </div>
    `;

    console.error(error);
  }
}

export function initRouter() {
  const initial = location.hash.replace("#", "");

  state.route = publicRoutes.includes(initial)
    ? initial
    : "dashboard";

  window.addEventListener("hashchange", () => {
    const route = location.hash.replace("#", "");

    state.route = publicRoutes.includes(route)
      ? route
      : "dashboard";

    render();
  });

  render();
}
