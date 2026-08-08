import { api } from "../services/api.js";
import { ensureCatalogs } from "../services/catalogs.js";
import { state } from "../state.js";
import { esc, empty, loading } from "../utils/html.js";
import { setTitle } from "../components/page-header.js";
import {
  workoutModal,
  duplicateWorkout,
} from "../components/workout-builder.js";
import { bindDayActions } from "../components/day-card.js";

const app = document.querySelector("#app");

export async function renderWorkouts(context) {
  setTitle("Séances types");
  loading();

  await ensureCatalogs();

  app.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Variantes longues et courtes</h2>

        <div class="muted">
          Une journée peut proposer plusieurs séances possibles.
        </div>
      </div>

      <button class="button" type="button" id="new-workout">
        Créer une séance
      </button>
    </div>

    ${
      state.workouts.length
        ? `
          <div class="grid grid-3">
            ${state.workouts
              .map(
                (workout) => `
                  <div class="card">
                    <div class="status in_progress">
                      ${
                        workout.estimated_duration
                          ? `${workout.estimated_duration} min`
                          : "Durée libre"
                      }
                    </div>

                    <h3 style="margin-top:12px">
                      ${esc(workout.name)}
                    </h3>

                    <div class="muted">
                      ${workout.exercise_count} exercices
                    </div>

                    <div class="actions" style="margin-top:18px">
                      <button
                        class="button secondary small"
                        type="button"
                        data-edit-workout="${workout.id}"
                      >
                        Modifier
                      </button>

                      <button
                        class="button secondary small"
                        type="button"
                        data-duplicate-workout="${workout.id}"
                      >
                        Dupliquer
                      </button>

                      <button
                        class="button small"
                        type="button"
                        data-start="${workout.id}"
                        data-date="${new Date().toISOString().slice(0, 10)}"
                      >
                        Lancer
                      </button>
                    </div>
                  </div>
                `,
              )
              .join("")}
          </div>
        `
        : empty("Crée une séance longue et une séance courte.")
    }
  `;

  document.querySelector("#new-workout").onclick = () => {
    workoutModal(undefined, context.rerender);
  };

  app.querySelectorAll("[data-edit-workout]").forEach((button) => {
    button.onclick = async () => {
      workoutModal(
        await api(`workout-templates/${button.dataset.editWorkout}`),
        context.rerender,
      );
    };
  });

  app.querySelectorAll("[data-duplicate-workout]").forEach((button) => {
    button.onclick = () => {
      duplicateWorkout(
        Number(button.dataset.duplicateWorkout),
        context.rerender,
      );
    };
  });

  bindDayActions(app, context);
}
