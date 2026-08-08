import { api } from "./api.js";
import { state } from "../state.js";
import { toast } from "../components/toast.js";

export async function createSession(templateId, date) {
  const { id } = await api("workout-sessions", {
    method: "POST",
    body: JSON.stringify({
      workout_template_id: templateId,
      scheduled_date: date,
    }),
  });

  state.currentSession = id;
  sessionStorage.setItem("sessionId", String(id));

  return id;
}

export async function getActiveSession() {
  const sessions = await api("workout-sessions");

  return (
    sessions.find((session) => session.status === "in_progress") || null
  );
}

export function rememberSession(id) {
  state.currentSession = Number(id);
  sessionStorage.setItem("sessionId", String(id));
}

export function forgetSession() {
  state.currentSession = null;
  sessionStorage.removeItem("sessionId");
}

export async function stopSessionRequest(id) {
  await api(`workout-sessions/${id}/stop`, {
    method: "POST",
  });

  forgetSession();
  toast("Séance stoppée");
}

export async function deleteSessionRequest(id) {
  await api(`workout-sessions/${id}`, {
    method: "DELETE",
  });

  forgetSession();
  toast("Séance supprimée");
}
