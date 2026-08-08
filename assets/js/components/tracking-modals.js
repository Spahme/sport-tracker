import { api } from "../services/api.js";
import { formData, numOrNull } from "../utils/form.js";
import { modal, closeModal } from "./modal.js";
import { toast } from "./toast.js";

export function measurementModal(onSaved = null) {
  modal(
    "Nouvelle mesure",
    `
      <form id="measure-form" class="form-grid">
        <div class="field">
          <label>Poids (kg)</label>
          <input class="input" name="weight">
        </div>

        <div class="field">
          <label>Masse grasse (%)</label>
          <input class="input" name="body_fat_percentage">
        </div>

        <div class="field">
          <label>Tour de taille (cm)</label>
          <input class="input" name="waist">
        </div>

        <div class="field">
          <label>Tour de poitrine (cm)</label>
          <input class="input" name="chest">
        </div>

        <div class="field full">
          <label>Notes</label>
          <textarea class="textarea" name="notes"></textarea>
        </div>
      </form>
    `,
    {
      footer: `
        <button class="button secondary" type="button" data-close>
          Annuler
        </button>

        <button class="button" type="button" id="save-measure">
          Enregistrer
        </button>
      `,
    },
  );

  document.querySelector("#save-measure").onclick = async () => {
    const data = formData(
      document.querySelector("#measure-form"),
    );

    [
      "weight",
      "body_fat_percentage",
      "waist",
      "chest",
    ].forEach((key) => {
      data[key] = numOrNull(data[key]);
    });

    await api("body-measurements", {
      method: "POST",
      body: JSON.stringify(data),
    });

    closeModal();
    toast("Mesure ajoutée");

    if (onSaved) {
      await onSaved();
    }
  };
}

export function recoveryModal(onSaved = null) {
  modal(
    "Suivi de récupération",
    `
      <form id="recovery-form" class="form-grid">
        <div class="field">
          <label>Date</label>

          <input
            class="input"
            type="date"
            name="log_date"
            value="${new Date().toISOString().slice(0, 10)}"
          >
        </div>

        <div class="field">
          <label>Sommeil (heures)</label>
          <input class="input" name="sleep_hours">
        </div>

        <div class="field">
          <label>Fatigue / 10</label>
          <input class="input" name="fatigue_level">
        </div>

        <div class="field">
          <label>Énergie / 10</label>
          <input class="input" name="energy_level">
        </div>

        <div class="field">
          <label>Motivation / 10</label>
          <input class="input" name="motivation_level">
        </div>

        <div class="field">
          <label>Courbatures / 10</label>
          <input class="input" name="soreness_level">
        </div>

        <div class="field full">
          <label>Notes</label>
          <textarea class="textarea" name="notes"></textarea>
        </div>
      </form>
    `,
    {
      footer: `
        <button class="button secondary" type="button" data-close>
          Annuler
        </button>

        <button class="button" type="button" id="save-recovery">
          Enregistrer
        </button>
      `,
    },
  );

  document.querySelector("#save-recovery").onclick = async () => {
    const data = formData(
      document.querySelector("#recovery-form"),
    );

    [
      "sleep_hours",
      "fatigue_level",
      "energy_level",
      "motivation_level",
      "soreness_level",
    ].forEach((key) => {
      data[key] = numOrNull(data[key]);
    });

    await api("recovery-logs", {
      method: "POST",
      body: JSON.stringify(data),
    });

    closeModal();
    toast("Récupération enregistrée");

    if (onSaved) {
      await onSaved();
    }
  };
}
