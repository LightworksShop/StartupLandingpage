let csrf = "";
export async function sessionRequest(resource, body, signal) {
  const response = await fetch(`/api/marketing/${resource}`, {
    credentials: "same-origin", signal,
    headers: { "Content-Type": "application/json", ...(body !== undefined ? { "X-CSRF-Token": csrf } : {}) },
    ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }),
  });
  let result;
  try { result = await response.json(); } catch { throw new Error("Backend nicht erreichbar. Bitte erneut versuchen."); }
  if (result.csrf) csrf = result.csrf;
  if (!response.ok) {
    if (response.status === 401 && resource !== "login") window.dispatchEvent(new Event("marketing-session-expired"));
    throw new Error(result.message || "Anfrage fehlgeschlagen.");
  }
  return result;
}
