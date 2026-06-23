const ACTIVE_GROUP_KEY = "badloggen-active-group";

export function getActiveGroupId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_GROUP_KEY);
}

export function setActiveGroupId(groupId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_GROUP_KEY, groupId);
}

export function clearActiveGroupId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_GROUP_KEY);
}
