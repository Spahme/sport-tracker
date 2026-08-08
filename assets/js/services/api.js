const API = "./api";

export async function api(path, options = {}) {
  const response = await fetch(`${API}/${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const json = await response.json().catch(() => ({
    ok: false,
    error: {
      message: "Réponse serveur invalide",
    },
  }));

  if (!response.ok || !json.ok) {
    throw new Error(json.error?.message || "Erreur API");
  }

  return json.data;
}
