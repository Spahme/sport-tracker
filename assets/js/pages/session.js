import { api } from "../services/api.js";
import {
  stopSessionRequest,
  deleteSessionRequest,
  rememberSession,
} from "../services/session.js";
import { state } from "../state.js";
import { fmtDate } from "../utils/format.js";
import { esc, loading } from "../utils/html.js";
import { setTitle } from "../components/page-header.js";
import { recordsModal } from "../components/records-modal.js";
import { exerciseTrackingModal } from "../components/exercise-tracking-modal.js";
import { addSetModal } from "../components/set-modal.js";
import { completeSessionModal } from "../components/complete-session-modal.js";
import { toast } from "../components/toast.js";
import { glossaryTerm } from "../utils/glossary.js";

const app = document.querySelector("#app");

function setRow(set) {
  return `
    <div class="set-row">
      <div class="set-number">${set.set_number}</div>

      <div>
        <strong>${set.weight ?? "—"}</strong>
        <div class="list-meta">kg</div>
      </div>

      <div>
        <strong>${set.repetitions ?? "—"}</strong>
        <div class="list-meta">${glossaryTerm("reps", "reps")}</div>
      </div>

      <div class="optional-mobile">
        <strong>${set.rir ?? "—"}</strong>
        <div class="list-meta">${glossaryTerm("RIR", "rir")}</div>
      </div>

      <div class="optional-mobile">
        <strong>${set.rpe ?? "—"}</strong>
        <div class="list-meta">${glossaryTerm("RPE", "rpe")}</div>
      </div>

      <button
        class="button ghost small"
        type="button"
        data-delete-set="${set.id}"
      >
        Suppr.
      </button>
    </div>
  `;
}

function sessionExercise(exercise) {
  return `
    <article class="session-exercise">
      <div class="session-exercise-head">
        <div>
          <h3>${esc(exercise.exercise_name_snapshot)}</h3>

          <div class="muted">
            ${
              exercise.planned_sets_snapshot
                ? `${exercise.planned_sets_snapshot} séries`
                : ""
            }

            ${
              exercise.min_reps_snapshot
                ? ` · ${exercise.min_reps_snapshot}-${
                    exercise.max_reps_snapshot ||
                    exercise.min_reps_snapshot
                  } reps`
                : ""
            }
          </div>
        </div>

        <div class="actions">
          <button
            class="button secondary small"
            type="button"
            data-exercise-tracking="${exercise.exercise_id}"
          >
            Tracking
          </button>

          <button
            class="button ghost small"
            type="button"
            data-records="${exercise.exercise_id}"
          >
            Records
          </button>

          <button
            class="button small"
            type="button"
            data-add-set="${exercise.id}"
          >
            Ajouter une série
          </button>
        </div>
      </div>

      <div class="sets">
        ${
          exercise.sets.length
            ? exercise.sets.map(setRow).join("")
            : '<div class="empty" style="margin:14px">Aucune série enregistrée.</div>'
        }
      </div>
    </article>
  `;
}

export async function renderSession(context) {
  const id =
    state.currentSession ||
    sessionStorage.getItem("sessionId");

  if (!id) {
    context.go("week");
    return;
  }

  rememberSession(id);

  setTitle("Séance en cours", "Entraînement");
  loading();

  const session = await api(`workout-sessions/${id}`);

  app.innerHTML = `
    <div class="section-head">
      <div>
        <h2>${esc(session.template_name_snapshot)}</h2>

        <div class="muted">
          Commencée le ${fmtDate(session.scheduled_date)}
        </div>
      </div>

      <div class="actions">
        <button class="button" type="button" id="complete-session">
          Terminer
        </button>

        <button class="button secondary" type="button" id="stop-session">
          Stopper
        </button>

        <button class="button danger" type="button" id="delete-session">
          Supprimer
        </button>
      </div>
    </div>

    <div class="grid">
      ${session.exercises.map(sessionExercise).join("")}
    </div>
  `;

  app.querySelectorAll("[data-add-set]").forEach((button) => {
    button.onclick = () => {
      addSetModal(
        Number(button.dataset.addSet),
        context.rerender,
      );
    };
  });

  app.querySelectorAll("[data-records]").forEach((button) => {
    button.onclick = () => {
      recordsModal(Number(button.dataset.records));
    };
  });

  app.querySelectorAll("[data-exercise-tracking]").forEach((button) => {
    button.onclick = () => {
      exerciseTrackingModal(Number(button.dataset.exerciseTracking));
    };
  });

  app.querySelectorAll("[data-delete-set]").forEach((button) => {
    button.onclick = async () => {
      try {
        await api(`workout-sets/${button.dataset.deleteSet}`, {
          method: "DELETE",
        });

        toast("Série supprimée");
        await context.rerender();
      } catch (error) {
        toast(error.message);
      }
    };
  });

  document.querySelector("#complete-session").onclick = () => {
    completeSessionModal(() => context.go("history"));
  };

  document.querySelector("#stop-session").onclick = async () => {
    if (!window.confirm(
      "Voulez-vous stopper cette séance ? Elle restera dans l’historique.",
    )) {
      return;
    }

    try {
      await stopSessionRequest(Number(id));
      context.go("history");
    } catch (error) {
      toast(error.message);
    }
  };

  document.querySelector("#delete-session").onclick = async () => {
    if (!window.confirm(
      "Supprimer définitivement cette séance et toutes ses séries ?",
    )) {
      return;
    }

    try {
      await deleteSessionRequest(Number(id));
      context.go("history");
    } catch (error) {
      toast(error.message);
    }
  };
}
