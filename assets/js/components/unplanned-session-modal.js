import { ensureCatalogs } from "../services/catalogs.js";
import { createSession } from "../services/session.js";
import { state } from "../state.js";
import { localToday } from "../utils/format.js";
import { esc, empty } from "../utils/html.js";
import { modal, closeModal } from "./modal.js";
import { toast } from "./toast.js";

export async function unplannedSessionModal(onStarted) {
  modal("Séance imprévue", '<div class="loading">Chargement des séances types…</div>');

  try {
    await ensureCatalogs();
    const body = document.querySelector(".modal-body");
    if (!body) return;

    if (!state.workouts.length) {
      body.innerHTML = empty("Crée d’abord une séance type pour pouvoir la lancer.");
      return;
    }

    body.innerHTML = `
      <p class="muted">Choisis une séance type. Elle sera enregistrée aujourd’hui comme imprévue et comptera dans tes statistiques et ton tracking.</p>
      <div class="list">
        ${state.workouts.map((workout) => `
          <div class="list-item">
            <div>
              <div class="list-title">${esc(workout.name)}</div>
              <div class="list-meta">${workout.exercise_count || 0} exercices${workout.estimated_duration ? ` · ${workout.estimated_duration} min` : ""}</div>
            </div>
            <button class="button small" type="button" data-start-unplanned="${workout.id}">Commencer</button>
          </div>`).join("")}
      </div>`;

    body.querySelectorAll("[data-start-unplanned]").forEach((button) => {
      button.onclick = async () => {
        button.disabled = true;
        try {
          await createSession(Number(button.dataset.startUnplanned), localToday(), true);
          closeModal();
          toast("Séance imprévue démarrée");
          onStarted();
        } catch (error) {
          button.disabled = false;
          toast(error.message);
        }
      };
    });
  } catch (error) {
    const body = document.querySelector(".modal-body");
    if (body) body.innerHTML = empty(error.message);
  }
}
