import { api } from "../services/api.js";
import { state } from "../state.js";
import { formData, numOrNull } from "../utils/form.js";
import { modal, closeModal } from "./modal.js";
import { toast } from "./toast.js";
import { forgetSession } from "../services/session.js";

export function completeSessionModal(onCompleted) {
  modal(
    "Terminer la séance",
    `
      <form id="complete-form" class="form-grid">
        <div class="field">
          <label>Énergie / 10</label>

          <input
            class="input"
            type="number"
            min="1"
            max="10"
            name="energy_level"
          >
        </div>

        <div class="field">
          <label>Fatigue / 10</label>

          <input
            class="input"
            type="number"
            min="1"
            max="10"
            name="fatigue_level"
          >
        </div>

        <div class="field full">
          <label>Notes facultatives</label>

          <textarea
            class="textarea"
            name="notes"
          ></textarea>
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
          Continuer
        </button>

        <button
          class="button"
          type="button"
          id="confirm-complete"
        >
          Terminer
        </button>
      `,
    },
  );

  document.querySelector("#confirm-complete").onclick = async () => {
    const data = formData(
      document.querySelector("#complete-form"),
    );

    data.energy_level = numOrNull(data.energy_level);
    data.fatigue_level = numOrNull(data.fatigue_level);

    const id =
      state.currentSession ||
      sessionStorage.getItem("sessionId");

    await api(`workout-sessions/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    forgetSession();
    closeModal();
    toast("Séance terminée");

    onCompleted();
  };
}
