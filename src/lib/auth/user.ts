const USER_ID_KEY = "badloggen-user-id";
const USER_NAME_KEY = "badloggen-user-name";

export interface AppUser {
  id: string;
  displayName: string;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getStoredUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(USER_ID_KEY);
  const displayName = localStorage.getItem(USER_NAME_KEY);
  if (!id || !displayName) return null;
  return { id, displayName };
}

export function ensureLocalUser(): AppUser {
  const existing = getStoredUser();
  if (existing) return existing;

  const user: AppUser = {
    id: generateId(),
    displayName: "Badare",
  };
  localStorage.setItem(USER_ID_KEY, user.id);
  localStorage.setItem(USER_NAME_KEY, user.displayName);
  return user;
}

export function setUserDisplayName(displayName: string): AppUser {
  const user = ensureLocalUser();
  const updated = { ...user, displayName: displayName.trim() || user.displayName };
  localStorage.setItem(USER_NAME_KEY, updated.displayName);
  return updated;
}

export async function registerUserOnServer(user: AppUser): Promise<void> {
  await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": user.id,
    },
    body: JSON.stringify({ displayName: user.displayName }),
  });
}
