import { api } from "../services/api.js";
import { formData } from "../utils/form.js";
import { modal, closeModal } from "./modal.js";
import { toast } from "./toast.js";

export function programModal(onSaved = null) {
  modal(
    "Nouveau programme",
    `
      <form id="program-form" class="form-grid">
        <div class="field full">
          <label>Nom *</label>

          <input
            class="input"
            name="name"
            required
            placeholder="Push Pull Legs"
          >
        </div>

        <div class="field full">
          <label>Description</label>

          <textarea
            class="textarea"
            name="description"
          ></textarea>
        </div>

        <label>
          <input
            type="checkbox"
            name="is_active"
            value="1"
          >
          Activer maintenant
        </label>
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
          id="save-program"
        >
          Créer
        </button>
      `,
    },
  );

  document.querySelector("#save-program").onclick = async () => {
    const data = formData(
      document.querySelector("#program-form"),
    );

    data.is_active = Boolean(data.is_active);

    await api("training-programs", {
      method: "POST",
      body: JSON.stringify(data),
    });

    closeModal();
    toast("Programme créé");

    if (onSaved) {
      await onSaved();
    }
  };
}
