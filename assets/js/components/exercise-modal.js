import { api } from "../services/api.js";
import { state } from "../state.js";
import { formData, numOrNull } from "../utils/form.js";
import { esc } from "../utils/html.js";
import { modal, closeModal } from "./modal.js";
import { toast } from "./toast.js";

export function exerciseModal(exercise = {}, onSaved = null) {
  modal(
    exercise.id ? "Modifier l’exercice" : "Nouvel exercice",
    `
      <form id="exercise-form" class="form-grid">
        <div class="field full">
          <label>Nom *</label>
          <input
            class="input"
            name="name"
            value="${esc(exercise.name || "")}"
            required
          >
        </div>

        <div class="field">
          <label>Groupe principal</label>
          <select class="select" name="primary_muscle_group_id">
            <option value="">Aucun</option>
            ${state.muscles
              .map(
                (muscle) => `
                  <option
                    value="${muscle.id}"
                    ${
                      muscle.id == exercise.primary_muscle_group_id
                        ? "selected"
                        : ""
                    }
                  >
                    ${esc(muscle.name)}
                  </option>
                `,
              )
              .join("")}
          </select>
        </div>

        <div class="field">
          <label>Matériel</label>
          <input
            class="input"
            name="equipment"
            value="${esc(exercise.equipment || "")}"
          >
        </div>

        <div class="field">
          <label>Type</label>
          <input
            class="input"
            name="exercise_type"
            value="${esc(exercise.exercise_type || "")}"
          >
        </div>

        <div class="field">
          <label>Difficulté</label>
          <input
            class="input"
            name="difficulty"
            value="${esc(exercise.difficulty || "")}"
          >
        </div>

        <div class="field full">
          <label>Description</label>
          <textarea
            class="textarea"
            name="description"
          >${esc(exercise.description || "")}</textarea>
        </div>

        <div class="field full">
          <label>Instructions</label>
          <textarea
            class="textarea"
            name="instructions"
          >${esc(exercise.instructions || "")}</textarea>
        </div>

        <div class="field full">
          <label>Notes</label>
          <textarea
            class="textarea"
            name="notes"
          >${esc(exercise.notes || "")}</textarea>
        </div>
      </form>
    `,
    {
      footer: `
        <button class="button secondary" type="button" data-close>
          Annuler
        </button>

        <button class="button" type="button" id="save-exercise">
          Enregistrer
        </button>
      `,
    },
  );

  document.querySelector("#save-exercise").onclick = async () => {
    const data = formData(document.querySelector("#exercise-form"));
    data.primary_muscle_group_id = numOrNull(
      data.primary_muscle_group_id,
    );

    await api(
      exercise.id ? `exercises/${exercise.id}` : "exercises",
      {
        method: exercise.id ? "PUT" : "POST",
        body: JSON.stringify(data),
      },
    );

    closeModal();
    toast("Exercice enregistré");

    if (onSaved) {
      await onSaved();
    }
  };
}
