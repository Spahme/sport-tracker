import { api } from "../services/api.js";
import { fmtDate } from "../utils/format.js";
import { esc, empty, loading } from "../utils/html.js";
import { setTitle } from "../components/page-header.js";
import { statusLabel } from "../components/day-card.js";

const app = document.querySelector("#app");

export async function renderHistory() {
  setTitle("Historique");
  loading();

  const sessions = await api("workout-sessions");

  app.innerHTML = `
    <div class="section-head">
      <div>
        <h2>${sessions.length} séances enregistrées</h2>

        <div class="muted">
          Les anciennes performances restent intactes après modification du programme.
        </div>
      </div>
    </div>

    ${
      sessions.length
        ? `
          <div class="list">
            ${sessions
              .map(
                (session) => `
                  <div class="list-item">
                    <div>
                      <div class="list-title">
                        ${esc(
                          session.template_name_snapshot ||
                            "Séance libre",
                        )}
                      </div>

                      <div class="list-meta">
                        ${fmtDate(session.scheduled_date)}
                        · ${session.exercise_count} exercices
                        · ${session.set_count} séries
                      </div>
                    </div>

                    <div>
                      <span class="status ${session.status}">
                        ${statusLabel(session.status)}
                      </span>

                      <div class="list-meta">
                        ${Math.round(
                          session.volume || 0,
                        ).toLocaleString("fr-FR")} kg
                      </div>
                    </div>
                  </div>
                `,
              )
              .join("")}
          </div>
        `
        : empty("Aucune séance enregistrée.")
    }
  `;
}
