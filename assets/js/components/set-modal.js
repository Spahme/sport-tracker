import { api } from "../services/api.js";
import { formData, numOrNull } from "../utils/form.js";
import { modal, closeModal } from "./modal.js";
import { toast } from "./toast.js";
import { glossaryTerm } from "../utils/glossary.js";

export function addSetModal(sessionExerciseId, onSaved = null) {
	modal(
		"Ajouter une série",
		`
      <form id="set-form" class="form-grid">
        <div class="field">
          <label>Charge (kg)</label>
          <input class="input" inputmode="decimal" name="weight">
        </div>

        <div class="field">
          <label>Répétitions</label>
          <input class="input" inputmode="numeric" name="repetitions">
        </div>

        <div class="field">
          <label>${glossaryTerm("RIR", "rir")}</label>
          <input class="input" inputmode="decimal" name="rir">
        </div>

        <div class="field">
          <label>${glossaryTerm("RPE", "rpe")}</label>
          <input class="input" inputmode="decimal" name="rpe">
        </div>

        <div class="field full">
          <label>Notes</label>
          <textarea class="textarea" name="notes"></textarea>
        </div>
      </form>
    `,
		{
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
          type="button"
          id="save-set"
        >
          Valider la série
        </button>
      `,
		},
	);

	document.querySelector("#save-set").onclick = async () => {
		const data = formData(document.querySelector("#set-form"));

		["weight", "repetitions", "rir", "rpe"].forEach((key) => {
			data[key] = numOrNull(data[key]);
		});

		await api(`workout-session-exercises/${sessionExerciseId}/sets`, {
			method: "POST",
			body: JSON.stringify(data),
		});

		closeModal();
		toast("Série enregistrée");

		if (onSaved) {
			await onSaved();
		}
	};
}
