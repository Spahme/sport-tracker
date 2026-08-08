export function formData(form) {
  if (!(form instanceof HTMLFormElement)) {
    console.error("Élément reçu à la place du formulaire :", form);
    throw new TypeError("formData() attend un HTMLFormElement.");
  }

  return Object.fromEntries(new FormData(form).entries());
}

export function numOrNull(value) {
  return value === "" ? null : Number(value);
}
