export function getOrCreateUserKey() {
  if (typeof window === "undefined") return "";

  const STORAGE_KEY = "iumatec_user_key";
  const existing = localStorage.getItem(STORAGE_KEY);

  if (existing) return existing;

  const newKey =
    "user_" + Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem(STORAGE_KEY, newKey);
  return newKey;
}