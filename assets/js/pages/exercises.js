import { ensureCatalogs } from "../services/catalogs.js";
import { state } from "../state.js";
import { esc, empty, loading } from "../utils/html.js";
import { setTitle } from "../components/page-header.js";
import { exerciseModal } from "../components/exercise-modal.js";
import { recordsModal } from "../components/records-modal.js";
import { exerciseTrackingModal } from "../components/exercise-tracking-modal.js";

const app = document.querySelector("#app");

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function renderExercises(context) {
  setTitle("Exercices", "Bibliothèque");
  loading();

  await ensureCatalogs();

  app.innerHTML = `
    <div class="section-head">
      <div>
        <h2>${state.exercises.length} exercices</h2>

        <div class="muted">
          L’historique reste lié à l’exercice même après un changement de programme.
        </div>
      </div>

      <button
        class="button"
        type="button"
        id="new-exercise"
      >
        Ajouter
      </button>
    </div>

    ${state.exercises.length ? `
      <div class="exercise-search-bar">
        <label class="field" for="exercise-search">
          <span>Rechercher un exercice</span>
          <input
            class="input"
            id="exercise-search"
            type="search"
            placeholder="Nom, groupe musculaire ou matériel…"
            autocomplete="off"
          >
        </label>
        <div class="muted exercise-search-count" id="exercise-search-count" aria-live="polite">
          ${state.exercises.length} résultat${state.exercises.length !== 1 ? "s" : ""}
        </div>
      </div>
    ` : ""}

    ${
      state.exercises.length
        ? `
          <div class="list">
            ${state.exercises
              .map(
                (exercise) => `
                  <div
                    class="list-item"
                    data-exercise-item
                    data-search="${esc(normalizeSearch(`${exercise.name} ${exercise.primary_muscle_group || ""} ${exercise.equipment || ""}`))}"
                  >
                    <div class="list-main">
                      <div class="list-title">
                        ${esc(exercise.name)}
                      </div>

                      <div class="list-meta">
                        ${esc(exercise.primary_muscle_group || "Groupe libre")}
                        ·
                        ${esc(exercise.equipment || "Matériel non précisé")}
                      </div>
                    </div>

                    <div class="actions">
                      <button
                        class="button secondary small"
                        type="button"
                        data-tracking="${exercise.id}"
                      >
                        Tracking
                      </button>

                      <button
                        class="button ghost small"
                        type="button"
                        data-records="${exercise.id}"
                      >
                        Records
                      </button>

                      <button
                        class="button ghost small"
                        type="button"
                        data-edit-exercise="${exercise.id}"
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                `,
              )
              .join("")}
          </div>
          <div class="empty exercise-search-empty" id="exercise-search-empty" hidden>
            Aucun exercice ne correspond à cette recherche.
          </div>
        `
        : empty("Ajoute ton premier exercice.")
    }
  `;

  document.querySelector("#new-exercise").onclick = () => {
    exerciseModal({}, context.rerender);
  };

  const searchInput = document.querySelector("#exercise-search");
  if (searchInput) {
    searchInput.oninput = () => {
      const query = normalizeSearch(searchInput.value);
      let visible = 0;

      app.querySelectorAll("[data-exercise-item]").forEach((item) => {
        const matches = !query || item.dataset.search.includes(query);
        item.hidden = !matches;
        if (matches) visible += 1;
      });

      document.querySelector("#exercise-search-count").textContent =
        `${visible} résultat${visible !== 1 ? "s" : ""}`;
      document.querySelector("#exercise-search-empty").hidden = visible !== 0;
    };
  }

  app.querySelectorAll("[data-edit-exercise]").forEach((button) => {
    button.onclick = () => {
      const exercise = state.exercises.find(
        (item) => item.id == button.dataset.editExercise,
      );

      exerciseModal(exercise, context.rerender);
    };
  });

  app.querySelectorAll("[data-records]").forEach((button) => {
    button.onclick = () => {
      recordsModal(Number(button.dataset.records));
    };
  });

  app.querySelectorAll("[data-tracking]").forEach((button) => {
    button.onclick = () => {
      exerciseTrackingModal(Number(button.dataset.tracking));
    };
  });
}
