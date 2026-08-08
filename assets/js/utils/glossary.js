const definitions = {
  rir: "Reps In Reserve : nombre de répétitions que tu aurais encore pu faire avant l’échec. RIR 2 = environ 2 répétitions restantes.",
  rpe: "Rate of Perceived Exertion : difficulté ressentie sur 10. RPE 10 = effort maximal, RPE 8 = environ 2 répétitions restantes.",
  reps: "Abréviation de répétitions : nombre de fois où tu réalises le mouvement dans une série.",
  volume: "Quantité totale soulevée : charge × répétitions, additionnée sur toutes les séries concernées.",
  oneRm: "1RM estimé : charge maximale théorique que tu pourrais soulever une seule fois. C’est une estimation, pas un test réel.",
  maxWeight: "Charge la plus lourde utilisée sur une série terminée pendant cette séance.",
};

export function glossaryTerm(label, key) {
  const definition = definitions[key];
  if (!definition) return label;

  return `<span class="glossary-term" tabindex="0" role="note" aria-label="${label} : ${definition}" data-tooltip="${definition}">${label}<span class="glossary-help" aria-hidden="true">?</span></span>`;
}
