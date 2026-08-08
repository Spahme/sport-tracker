import { api } from "../services/api.js";
import { state } from "../state.js";
import { esc } from "../utils/html.js";
import { toast } from "./toast.js";

export function optionEditor(option = {}) {
  return `
    <div class="builder-row schedule-option">
      <div class="field">
        <label>Séance type</label>

        <select class="select workout-select">
          <option value="">Choisir</option>

          ${state.workouts
            .map(
              (workout) => `
                <option
                  value="${workout.id}"
                  ${
                    workout.id == option.workout_template_id
                      ? "selected"
                      : ""
                  }
                >
                  ${esc(workout.name)}
                </option>
              `,
            )
            .join("")}
        </select>
      </div>

      <div class="field">
        <label>Libellé</label>

        <input
          class="input option-label"
          value="${esc(option.label || "")}"
          placeholder="Séance courte"
        >
      </div>

      <button
        class="button danger small remove-option"
        type="button"
      >
        ×
      </button>
    </div>
  `;
}

export function scheduleDayEditor(day) {
  const names = [
    "",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
  ];

  return `
    <div
      class="card schedule-day"
      data-day="${day.day_of_week}"
    >
      <div class="section-head" style="margin:0 0 12px">
        <div>
          <h3>${names[day.day_of_week]}</h3>

          <input
            class="input day-label"
            placeholder="Nom du jour : Push"
            value="${esc(day.label || "")}"
          >
        </div>

        <label>
          <input
            type="checkbox"
            class="rest-check"
            ${Number(day.is_rest_day) ? "checked" : ""}
          >
          Repos
        </label>
      </div>

      <div class="options-editor">
        ${(day.options || []).map(optionEditor).join("")}
      </div>

      <button
        class="button secondary small add-option"
        type="button"
      >
        Ajouter une variante
      </button>
    </div>
  `;
}

export function bindScheduleEditor() {
  document.querySelectorAll(".schedule-day").forEach((day) => {
    const editor = day.querySelector(".options-editor");

    const bindRemove = () => {
      editor.querySelectorAll(".remove-option").forEach((button) => {
        button.onclick = () => {
          button.closest(".schedule-option")?.remove();
        };
      });
    };

    bindRemove();

    day.querySelector(".add-option").onclick = () => {
      editor.insertAdjacentHTML("beforeend", optionEditor());
      bindRemove();
    };
  });
}

export async function saveSchedule(programId, onSaved = null) {
  const days = [...document.querySelectorAll(".schedule-day")].map(
    (day) => ({
      day_of_week: Number(day.dataset.day),
      label: day.querySelector(".day-label").value || null,
      is_rest_day: day.querySelector(".rest-check").checked,
      options: [...day.querySelectorAll(".schedule-option")]
        .map((option, index) => ({
          workout_template_id: Number(
            option.querySelector(".workout-select").value,
          ),
          label:
            option.querySelector(".option-label").value || null,
          position: index + 1,
        }))
        .filter((option) => option.workout_template_id),
    }),
  );

  await api(`training-programs/${programId}/weekly-schedule`, {
    method: "PUT",
    body: JSON.stringify({ days }),
  });

  toast("Semaine enregistrée");

  if (onSaved) {
    await onSaved();
  }
}
