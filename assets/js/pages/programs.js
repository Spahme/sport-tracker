import { api } from "../services/api.js";
import { ensureCatalogs } from "../services/catalogs.js";
import { state } from "../state.js";
import { esc, empty, loading } from "../utils/html.js";
import { setTitle } from "../components/page-header.js";
import { programModal } from "../components/program-modal.js";
import {
  scheduleDayEditor,
  bindScheduleEditor,
  saveSchedule,
} from "../components/schedule-editor.js";
import { toast } from "../components/toast.js";

const app = document.querySelector("#app");

export async function renderPrograms(context) {
  setTitle("Programme et semaine");
  loading();

  await ensureCatalogs();

  const active = state.programs.find(
    (program) => Number(program.is_active) === 1,
  );

  const schedule = active
    ? await api(`training-programs/${active.id}/weekly-schedule`)
    : [];

  app.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Programmes</h2>

        <div class="muted">
          Active un programme sans supprimer les performances passées.
        </div>
      </div>

      <button
        class="button"
        type="button"
        id="new-program"
      >
        Nouveau programme
      </button>
    </div>

    ${
      state.programs.length
        ? `
          <div class="list">
            ${state.programs
              .map(
                (program) => `
                  <div class="list-item">
                    <div>
                      <div class="list-title">
                        ${esc(program.name)}

                        ${
                          Number(program.is_active)
                            ? '<span class="status completed">Actif</span>'
                            : ""
                        }
                      </div>

                      <div class="list-meta">
                        ${esc(program.description || "Aucune description")}
                      </div>
                    </div>

                    ${
                      !Number(program.is_active)
                        ? `
                          <button
                            class="button secondary small"
                            type="button"
                            data-activate="${program.id}"
                          >
                            Activer
                          </button>
                        `
                        : ""
                    }
                  </div>
                `,
              )
              .join("")}
          </div>
        `
        : empty("Crée ton premier programme.")
    }

    ${
      active
        ? `
          <div class="section-head">
            <div>
              <h2>Semaine type — ${esc(active.name)}</h2>

              <div class="muted">
                Ajoute jusqu’à deux variantes ou davantage par jour.
              </div>
            </div>

            <button
              class="button"
              type="button"
              id="save-schedule"
            >
              Enregistrer la semaine
            </button>
          </div>

          <div id="schedule-editor" class="grid">
            ${schedule.map(scheduleDayEditor).join("")}
          </div>
        `
        : ""
    }
  `;

  document.querySelector("#new-program").onclick = () => {
    programModal(context.rerender);
  };

  app.querySelectorAll("[data-activate]").forEach((button) => {
    button.onclick = async () => {
      await api(
        `training-programs/${button.dataset.activate}/activate`,
        {
          method: "PATCH",
        },
      );

      toast("Programme activé");
      await context.rerender();
    };
  });

  if (active) {
    document.querySelector("#save-schedule").onclick = () => {
      saveSchedule(active.id, context.rerender);
    };

    bindScheduleEditor();
  }
}
