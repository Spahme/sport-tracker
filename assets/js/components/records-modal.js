import { api } from "../services/api.js";
import { state } from "../state.js";
import { modal } from "./modal.js";
import { fmtDate } from "../utils/format.js";
import { empty, esc } from "../utils/html.js";

function record(label, data, value) {
  return `
    <div class="record">
      <div class="muted">${label}</div>
      <div class="record-value">${value}</div>
      <div class="list-meta">
        ${data?.scheduled_date ? fmtDate(data.scheduled_date) : "Aucune donnée"}
      </div>
    </div>
  `;
}

export async function recordsModal(id) {
  const exercise = state.exercises.find((item) => item.id == id);

  modal(
    `Records — ${esc(exercise?.name || "Exercice")}`,
    '<div class="loading">Calcul des records…</div>',
  );

  try {
    const data = await api(`exercises/${id}/records`);
    const records = data.records;

    document.querySelector(".modal-body").innerHTML = `
      <div class="record-grid">
        ${record(
          "Charge maximale",
          records.max_weight,
          records.max_weight
            ? `${records.max_weight.weight} kg × ${records.max_weight.repetitions || "—"}`
            : "—",
        )}

        ${record(
          "Répétitions maximales",
          records.max_repetitions,
          records.max_repetitions
            ? `${records.max_repetitions.repetitions} reps à ${records.max_repetitions.weight ?? "—"} kg`
            : "—",
        )}

        ${record(
          "Meilleur volume / série",
          records.best_set_volume,
          records.best_set_volume
            ? `${Math.round(records.best_set_volume.value)} kg`
            : "—",
        )}

        ${record(
          "1RM estimé",
          records.best_estimated_one_rep_max,
          records.best_estimated_one_rep_max
            ? `${Number(records.best_estimated_one_rep_max.value).toFixed(1)} kg`
            : "—",
        )}
      </div>
    `;
  } catch (error) {
    document.querySelector(".modal-body").innerHTML = empty(error.message);
  }
}
