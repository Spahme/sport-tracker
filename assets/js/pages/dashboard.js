import { api } from "../services/api.js";
import { fmtDuration, fmtDate } from "../utils/format.js";
import { esc, empty, loading } from "../utils/html.js";
import { setTitle } from "../components/page-header.js";
import { glossaryTerm } from "../utils/glossary.js";
import { dayCard, bindDayActions } from "../components/day-card.js";

const app = document.querySelector("#app");

export async function renderDashboard(context) {
  setTitle("Tableau de bord");
  loading();

  const [stats, week] = await Promise.all([
    api("statistics/dashboard"),
    api("current-week"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const day = week.days?.find((item) => item.date === today);

  app.innerHTML = `
    <div class="grid grid-4">
      <div class="card">
        <div class="muted">Séances cette semaine</div>
        <div class="metric">${stats.week.sessions || 0}</div>
      </div>

      <div class="card">
        <div class="muted">${glossaryTerm("Volume hebdomadaire", "volume")}</div>
        <div class="metric">
          ${Math.round(stats.week.volume || 0).toLocaleString("fr-FR")} kg
        </div>
      </div>

      <div class="card">
        <div class="muted">Temps d'entraînement</div>
        <div class="metric">
          ${fmtDuration(stats.week.duration || 0)}
        </div>
      </div>

      <div class="card">
        <div class="muted">Programme actif</div>
        <div class="metric" style="font-size:23px">
          ${esc(week.program?.name || "Aucun")}
        </div>
      </div>
    </div>

    <div class="section-head">
      <h2>Aujourd’hui</h2>

      <button
        class="button secondary"
        type="button"
        id="show-week"
      >
        Voir la semaine
      </button>
    </div>

    ${
      day
        ? dayCard(day, true)
        : empty("Aucune journée configurée pour aujourd’hui.")
    }

    <div class="section-head">
      <h2>Dernière séance</h2>
    </div>

    ${
      stats.last_session
        ? `
          <div class="card">
            <h3>${esc(stats.last_session.template_name_snapshot)}</h3>

            <div class="muted">
              ${fmtDate(stats.last_session.scheduled_date)}
              ·
              ${fmtDuration(stats.last_session.duration_seconds)}
            </div>
          </div>
        `
        : empty("Aucune séance terminée pour le moment.")
    }
  `;

  document.querySelector("#show-week").onclick = () => context.go("week");

  bindDayActions(app, context);
}
