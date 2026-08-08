import {
  getActiveSession,
  rememberSession,
  stopSessionRequest,
  deleteSessionRequest,
} from "../services/session.js";
import { state } from "../state.js";
import { fmtDate } from "../utils/format.js";
import { esc } from "../utils/html.js";
import { toast } from "./toast.js";

const app = document.querySelector("#app");

export async function renderActiveSessionBar({ go, rerender }) {
  if (state.route === "session") {
    return;
  }

  const activeSession = await getActiveSession();

  if (!activeSession) {
    sessionStorage.removeItem("sessionId");
    return;
  }

  rememberSession(activeSession.id);

  app.insertAdjacentHTML(
    "afterbegin",
    `
      <div class="card active-session-card">
        <div>
          <div class="status in_progress">
            Séance en cours
          </div>

          <h3 style="margin:10px 0 4px">
            ${esc(
              activeSession.template_name_snapshot ||
                activeSession.workout_name ||
                "Séance",
            )}
          </h3>

          <div class="muted">
            ${fmtDate(activeSession.scheduled_date)}
          </div>
        </div>

        <div class="actions">
          <button
            class="button"
            type="button"
            data-resume-session="${activeSession.id}"
          >
            Reprendre
          </button>

          <button
            class="button secondary"
            type="button"
            data-stop-session="${activeSession.id}"
          >
            Stopper
          </button>

          <button
            class="button danger"
            type="button"
            data-delete-session="${activeSession.id}"
          >
            Supprimer
          </button>
        </div>
      </div>
    `,
  );

  app.querySelector("[data-resume-session]").onclick = (event) => {
    rememberSession(event.currentTarget.dataset.resumeSession);
    go("session");
  };

  app.querySelector("[data-stop-session]").onclick = async (event) => {
    const id = Number(event.currentTarget.dataset.stopSession);

    if (!window.confirm(
      "Voulez-vous stopper cette séance ? Elle restera dans l’historique.",
    )) {
      return;
    }

    try {
      await stopSessionRequest(id);
      await rerender();
    } catch (error) {
      toast(error.message);
    }
  };

  app.querySelector("[data-delete-session]").onclick = async (event) => {
    const id = Number(event.currentTarget.dataset.deleteSession);

    if (!window.confirm(
      "Supprimer définitivement cette séance et toutes ses séries ?",
    )) {
      return;
    }

    try {
      await deleteSessionRequest(id);
      await rerender();
    } catch (error) {
      toast(error.message);
    }
  };
}
