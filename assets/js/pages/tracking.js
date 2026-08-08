import { api } from "../services/api.js";
import { fmtDate } from "../utils/format.js";
import { empty, loading } from "../utils/html.js";
import { setTitle } from "../components/page-header.js";
import {
  measurementModal,
  recoveryModal,
} from "../components/tracking-modals.js";

const app = document.querySelector("#app");

export async function renderTracking(context) {
  setTitle("Suivi facultatif");
  loading();

  const [measurements, recovery] = await Promise.all([
    api("body-measurements"),
    api("recovery-logs"),
  ]);

  app.innerHTML = `
    <div class="grid grid-2">
      <div>
        <div class="section-head">
          <h2>Mesures corporelles</h2>

          <button
            class="button small"
            type="button"
            id="new-measure"
          >
            Ajouter
          </button>
        </div>

        ${
          measurements.length
            ? `
              <div class="list">
                ${measurements
                  .slice(0, 8)
                  .map(
                    (measurement) => `
                      <div class="list-item">
                        <div>
                          <div class="list-title">
                            ${
                              measurement.weight
                                ? `${measurement.weight} kg`
                                : "Mesure libre"
                            }
                          </div>

                          <div class="list-meta">
                            ${fmtDate(measurement.measured_at)}
                            ${
                              measurement.waist
                                ? ` · Taille ${measurement.waist} cm`
                                : ""
                            }
                          </div>
                        </div>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            `
            : empty("Toutes les données sont facultatives.")
        }
      </div>

      <div>
        <div class="section-head">
          <h2>Récupération</h2>

          <button
            class="button small"
            type="button"
            id="new-recovery"
          >
            Ajouter
          </button>
        </div>

        ${
          recovery.length
            ? `
              <div class="list">
                ${recovery
                  .slice(0, 8)
                  .map(
                    (item) => `
                      <div class="list-item">
                        <div>
                          <div class="list-title">
                            ${fmtDate(item.log_date)}
                          </div>

                          <div class="list-meta">
                            Fatigue ${item.fatigue_level ?? "—"}/10
                            ·
                            Énergie ${item.energy_level ?? "—"}/10
                          </div>
                        </div>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            `
            : empty("Ce suivi peut rester complètement vide.")
        }
      </div>
    </div>
  `;

  document.querySelector("#new-measure").onclick = () => {
    measurementModal(context.rerender);
  };

  document.querySelector("#new-recovery").onclick = () => {
    recoveryModal(context.rerender);
  };
}
