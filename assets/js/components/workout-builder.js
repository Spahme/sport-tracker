import { api } from "../services/api.js";
import { state } from "../state.js";
import { formData, numOrNull } from "../utils/form.js";
import { esc } from "../utils/html.js";
import { modal, closeModal } from "./modal.js";
import { toast } from "./toast.js";

export function builderRow(item = {}) {
  return `
    <div class="builder-row">
      <div class="field">
        <label>Exercice</label>

        <select class="select" name="exercise_id">
          <option value="">Choisir</option>

          ${state.exercises
            .map(
              (exercise) => `
                <option
                  value="${exercise.id}"
                  ${exercise.id == item.exercise_id ? "selected" : ""}
                >
                  ${esc(exercise.name)}
                </option>
              `,
            )
            .join("")}
        </select>
      </div>

      <div class="field">
        <label>Séries</label>
        <input
          class="input"
          type="number"
          name="planned_sets"
          value="${item.planned_sets ?? ""}"
        >
      </div>

      <div class="field">
        <label>Reps min.</label>
        <input
          class="input"
          type="number"
          name="min_reps"
          value="${item.min_reps ?? ""}"
        >
      </div>

      <div class="field">
        <label>Reps max.</label>
        <input
          class="input"
          type="number"
          name="max_reps"
          value="${item.max_reps ?? ""}"
        >
      </div>

      <div class="field">
        <label>Repos (s)</label>
        <input
          class="input"
          type="number"
          name="rest_seconds"
          value="${item.rest_seconds ?? ""}"
        >
      </div>

      <button
        class="button danger small remove-builder"
        type="button"
      >
        ×
      </button>
    </div>
  `;
}

export function workoutModal(
  workout = { exercises: [] },
  onSaved = null,
) {
  modal(
    workout.id ? "Configurer la séance" : "Nouvelle séance",
    `
      <form id="workout-form" class="form-grid">
        <div class="field">
          <label>Nom *</label>

          <input
            class="input"
            name="name"
            value="${esc(workout.name || "")}"
            required
          >
        </div>

        <div class="field">
          <label>Durée estimée</label>

          <input
            class="input"
            type="number"
            name="estimated_duration"
            value="${workout.estimated_duration ?? ""}"
          >
        </div>

        <div class="field full">
          <label>Description</label>

          <textarea
            class="textarea"
            name="description"
          >${esc(workout.description || "")}</textarea>
        </div>
      </form>

      <div class="section-head">
        <h3>Exercices</h3>

        <button
          class="button secondary small"
          id="add-builder"
          type="button"
        >
          Ajouter un exercice
        </button>
      </div>

      <div id="exercise-builder" class="exercise-builder">
        ${(workout.exercises || []).map(builderRow).join("")}
      </div>
    `,
    {
      large: true,
      footer: `
        <button
          class="button secondary"
          type="button"
          data-close
        >
          Annuler
        </button>

        <button
          class="button"
          id="save-workout"
          type="button"
        >
          Enregistrer
        </button>
      `,
    },
  );

  const builder = document.querySelector("#exercise-builder");
  const workoutForm = document.querySelector("#workout-form");

  if (!(builder instanceof HTMLElement)) {
    throw new Error("Le constructeur d’exercices est introuvable.");
  }

  if (!(workoutForm instanceof HTMLFormElement)) {
    throw new Error("Le formulaire de séance est introuvable.");
  }

  const bindRemove = () => {
    builder.querySelectorAll(".remove-builder").forEach((button) => {
      button.onclick = () => {
        button.closest(".builder-row")?.remove();
      };
    });
  };

  bindRemove();

  document.querySelector("#add-builder").onclick = () => {
    builder.insertAdjacentHTML("beforeend", builderRow());
    bindRemove();
  };

  document.querySelector("#save-workout").onclick = async () => {
    const data = formData(workoutForm);
    data.estimated_duration = numOrNull(data.estimated_duration);

    let id = workout.id;

    if (!id) {
      const response = await api("workout-templates", {
        method: "POST",
        body: JSON.stringify(data),
      });

      id = response.id;
    } else {
      await api(`workout-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    }

    const exercises = [...builder.querySelectorAll(".builder-row")]
      .map((row, index) => {
        const getValue = (name) =>
          row.querySelector(`[name="${name}"]`)?.value ?? "";

        return {
          exercise_id: Number(getValue("exercise_id")),
          position: index + 1,
          planned_sets: numOrNull(getValue("planned_sets")),
          min_reps: numOrNull(getValue("min_reps")),
          max_reps: numOrNull(getValue("max_reps")),
          rest_seconds: numOrNull(getValue("rest_seconds")),
        };
      })
      .filter((exercise) => exercise.exercise_id);

    await api(`workout-templates/${id}/exercises`, {
      method: "PUT",
      body: JSON.stringify({ exercises }),
    });

    closeModal();
    toast("Séance enregistrée");

    if (onSaved) {
      await onSaved();
    }
  };
}

export async function duplicateWorkout(id, onSaved = null) {
  try {
    const workout = await api(`workout-templates/${id}`);

    workoutModal(
      {
        ...workout,
        id: null,
        name: `${workout.name} (copie)`,
        exercises: (workout.exercises || []).map((exercise) => ({
          exercise_id: exercise.exercise_id,
          planned_sets: exercise.planned_sets,
          min_reps: exercise.min_reps,
          max_reps: exercise.max_reps,
          rest_seconds: exercise.rest_seconds,
        })),
      },
      onSaved,
    );
  } catch (error) {
    toast(error.message);
  }
}
