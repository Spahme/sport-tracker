import { api } from "../services/api.js";
import { fmtDate } from "../utils/format.js";
import { esc, empty, loading } from "../utils/html.js";
import { setTitle } from "../components/page-header.js";
import { dayCard, bindDayActions } from "../components/day-card.js";

const app = document.querySelector("#app");

export async function renderWeek(context) {
  setTitle("Ma semaine", "Planning récurrent");
  loading();

  const week = await api("current-week");

  app.innerHTML = `
    <div class="section-head">
      <div>
        <h2>${esc(week.program?.name || "Aucun programme actif")}</h2>

        <div class="muted">
          ${
            week.week_start
              ? `${fmtDate(week.week_start)} au ${fmtDate(week.week_end)}`
              : ""
          }
        </div>
      </div>

      <button
        class="button secondary"
        type="button"
        id="configure-program"
      >
        Configurer
      </button>
    </div>

    ${
      week.days?.length
        ? `
          <div class="week-grid">
            ${week.days.map((day) => dayCard(day)).join("")}
          </div>
        `
        : empty("Crée puis active un programme pour afficher ta semaine.")
    }
  `;

  document.querySelector("#configure-program").onclick = () => {
    context.go("programs");
  };

  bindDayActions(app, context);
}
