import { api } from "../services/api.js";
import { state } from "../state.js";
import { fmtDate } from "../utils/format.js";
import { empty, esc } from "../utils/html.js";
import { modal } from "./modal.js";
import { glossaryTerm } from "../utils/glossary.js";

const num = (value) => value === null || value === "" ? null : Number(value);

function groupSessions(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.session_id)) {
      grouped.set(row.session_id, { id: row.session_id, date: row.scheduled_date || row.started_at?.slice(0, 10), name: row.template_name_snapshot, sets: [] });
    }
    grouped.get(row.session_id).sets.push({ number: row.set_number, weight: num(row.weight), repetitions: num(row.repetitions), rir: num(row.rir), rpe: num(row.rpe) });
  });

  return [...grouped.values()].map((session) => {
    const valid = session.sets.filter((set) => set.weight !== null && set.repetitions !== null);
    const estimated = valid.filter((set) => set.repetitions >= 1 && set.repetitions <= 15).map((set) => set.weight * (1 + set.repetitions / 30));
    return {
      ...session,
      maxWeight: valid.length ? Math.max(...valid.map((set) => set.weight)) : null,
      volume: valid.length ? valid.reduce((total, set) => total + set.weight * set.repetitions, 0) : null,
      estimated1rm: estimated.length ? Math.max(...estimated) : null,
    };
  });
}

function setLabel(set) {
  const weight = set.weight === null ? "— kg" : `${set.weight} kg`;
  const reps = set.repetitions === null ? "— rep" : `${set.repetitions} rep`;
  const effort = [set.rir === null ? "" : `${glossaryTerm("RIR", "rir")} ${set.rir}`, set.rpe === null ? "" : `${glossaryTerm("RPE", "rpe")} ${set.rpe}`].filter(Boolean).join(" · ");
  return `<span><strong>S${set.number}</strong> ${weight} × ${reps}${effort ? ` <small>(${effort})</small>` : ""}</span>`;
}

function renderHistory(sessions) {
  return sessions.slice(0, 10).map((session) => `
    <article class="tracking-session">
      <div class="tracking-session-head">
        <div><strong>${fmtDate(session.date)}</strong><div class="list-meta">${esc(session.name || "Séance libre")}</div></div>
        <div class="tracking-session-metrics"><span>${session.maxWeight ?? "—"} kg ${glossaryTerm("max", "maxWeight")}</span><span>${session.volume === null ? "—" : Math.round(session.volume)} kg ${glossaryTerm("volume", "volume")}</span></div>
      </div>
      <div class="tracking-sets">${session.sets.map(setLabel).join("")}</div>
    </article>`).join("");
}

function chartOptions() {
  const styles = getComputedStyle(document.documentElement);
  const textColor = styles.getPropertyValue("--muted").trim();
  const gridColor = styles.getPropertyValue("--line").trim();
  return {
    responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: "index" },
    plugins: { legend: { labels: { color: textColor, usePointStyle: true } }, tooltip: { callbacks: { label: (context) => `${context.dataset.label} : ${context.parsed.y} kg` } } },
    scales: { x: { ticks: { color: textColor }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } } },
  };
}

function renderCharts(sessions) {
  if (!window.Chart) {
    document.querySelector("#tracking-charts").innerHTML = empty("Chart.js n’a pas pu être chargé. Vérifie la connexion internet ou héberge le fichier Chart.js sur ton serveur OVH.");
    return;
  }
  const chronological = sessions.slice(0, 12).reverse();
  const labels = chronological.map((session) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(new Date(`${session.date}T12:00:00`)));

  new window.Chart(document.querySelector("#strength-chart"), {
    type: "line",
    data: { labels, datasets: [
      { label: "Charge max", data: chronological.map((session) => session.maxWeight), borderColor: "#5b5ce2", backgroundColor: "#5b5ce2", tension: 0.28 },
      { label: "1RM estimé", data: chronological.map((session) => session.estimated1rm === null ? null : Number(session.estimated1rm.toFixed(1))), borderColor: "#16a34a", backgroundColor: "#16a34a", borderDash: [6, 4], tension: 0.28 },
    ] },
    options: chartOptions(),
  });
  new window.Chart(document.querySelector("#volume-chart"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Volume total", data: chronological.map((session) => session.volume), backgroundColor: "rgba(91, 92, 226, .72)", borderRadius: 6 }] },
    options: chartOptions(),
  });
}

export async function exerciseTrackingModal(id) {
  const exercise = state.exercises.find((item) => item.id == id);
  modal(`Tracking — ${esc(exercise?.name || "Exercice")}`, '<div class="loading">Chargement de la progression…</div>', { large: true });
  try {
    const sessions = groupSessions(await api(`exercises/${id}/history`));
    const body = document.querySelector(".modal-body");
    if (!sessions.length) {
      body.innerHTML = empty("Aucune série terminée pour cet exercice. Les graphiques apparaîtront après ta première séance terminée.");
      return;
    }
    body.innerHTML = `
      <div id="tracking-charts" class="tracking-charts grid grid-2">
        <section class="tracking-chart-card"><h3>Progression de la force · ${glossaryTerm("1RM", "oneRm")}</h3><div class="chart-wrap"><canvas id="strength-chart"></canvas></div></section>
        <section class="tracking-chart-card"><h3>${glossaryTerm("Volume", "volume")} par séance</h3><div class="chart-wrap"><canvas id="volume-chart"></canvas></div></section>
      </div>
      <div class="section-head tracking-history-head"><div><h2>Dernières séries</h2><div class="muted">${sessions.length} séance${sessions.length > 1 ? "s" : ""} enregistrée${sessions.length > 1 ? "s" : ""}</div></div></div>
      <div class="tracking-history">${renderHistory(sessions)}</div>`;
    renderCharts(sessions);
  } catch (error) {
    document.querySelector(".modal-body").innerHTML = empty(error.message);
  }
}
