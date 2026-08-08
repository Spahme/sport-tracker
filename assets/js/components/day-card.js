import { api } from "../services/api.js";
import { createSession } from "../services/session.js";
import { fmtDate } from "../utils/format.js";
import { esc } from "../utils/html.js";
import { toast } from "./toast.js";

export function statusLabel(status) {
  return (
    {
      completed: "Réalisée",
      missed: "Non réalisée",
      skipped: "Ignorée",
      replaced: "Remplacée",
      in_progress: "En cours",
    }[status] || status
  );
}

export function dayCard(day, single = false) {
  const status = day.status?.status;
  const today = new Date().toISOString().slice(0, 10);

  return `
    <div
      class="${single ? "card" : "day-card"} ${
        day.date === today ? "today" : ""
      }"
    >
      <div class="day-head">
        <div>
          <div class="day-name">
            ${day.day_name}
            ${day.label ? ` — ${esc(day.label)}` : ""}
          </div>

          <div class="day-date">
            ${fmtDate(day.date)}
          </div>
        </div>

        ${
          status
            ? `<span class="status ${status}">${statusLabel(status)}</span>`
            : ""
        }
      </div>

      ${
        day.is_rest_day
          ? '<div class="muted">Jour de repos</div>'
          : day.options?.length
            ? day.options
                .map(
                  (option) => `
                    <div class="option-card">
                      <strong>
                        ${esc(option.label || option.workout_name)}
                      </strong>

                      <div class="option-meta">
                        ${esc(option.workout_name)}
                        · ${option.exercise_count || 0} exercices
                        ${
                          option.estimated_duration
                            ? ` · ${option.estimated_duration} min`
                            : ""
                        }
                      </div>

                      <button
                        class="button small"
                        type="button"
                        data-start="${option.workout_template_id}"
                        data-date="${day.date}"
                      >
                        Commencer
                      </button>
                    </div>
                  `,
                )
                .join("")
            : '<div class="muted">Aucune séance définie</div>'
      }

      ${
        !day.is_rest_day && !status
          ? `
            <div class="actions" style="margin-top:auto">
              <button
                class="button ghost small"
                type="button"
                data-status="missed"
                data-date="${day.date}"
              >
                Non réalisée
              </button>

              <button
                class="button ghost small"
                type="button"
                data-status="skipped"
                data-date="${day.date}"
              >
                Ignorée
              </button>
            </div>
          `
          : ""
      }
    </div>
  `;
}

export function bindDayActions(root, { go, rerender }) {
  root.querySelectorAll("[data-start]").forEach((button) => {
    button.onclick = async () => {
      try {
        await createSession(
          Number(button.dataset.start),
          button.dataset.date,
        );

        go("session");
      } catch (error) {
        toast(error.message);
      }
    };
  });

  root.querySelectorAll("[data-status]").forEach((button) => {
    button.onclick = async () => {
      await api(`weekly-day-statuses/${button.dataset.date}`, {
        method: "PUT",
        body: JSON.stringify({
          status: button.dataset.status,
        }),
      });

      toast("Statut enregistré");
      await rerender();
    };
  });
}
