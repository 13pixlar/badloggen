"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type Group } from "@/lib/api/client";
import { getActiveGroupId, setActiveGroupId } from "@/lib/groups/active-group";
import { ensureLocalUser, registerUserOnServer } from "@/lib/auth/user";
import { syncAllSharedGroups } from "@/lib/groups/sync";

interface GroupContextValue {
  groups: Group[];
  activeGroup: Group | null;
  activeGroupId: string | null;
  loading: boolean;
  setActiveGroup: (groupId: string) => void;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextValue | null>(null);

const SYNC_INTERVAL_MS = 10_000;

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshGroups = useCallback(async () => {
    const list = await api.groups.list();
    setGroups(list);

    const stored = getActiveGroupId();
    const validStored = stored && list.some((g) => g.id === stored);
    if (validStored) {
      setActiveGroupIdState(stored);
    } else if (list.length > 0) {
      const defaultId = list[0].id;
      setActiveGroupId(defaultId);
      setActiveGroupIdState(defaultId);
    } else {
      const defaultId = await api.groups.getDefaultId();
      const refreshed = await api.groups.list();
      setGroups(refreshed);
      setActiveGroupId(defaultId);
      setActiveGroupIdState(defaultId);
    }
  }, []);

  const setActiveGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    setActiveGroupIdState(groupId);
  }, []);

  useEffect(() => {
    const user = ensureLocalUser();
    registerUserOnServer(user).catch(() => {
      // Server may be unavailable in offline mode
    });

    refreshGroups().finally(() => setLoading(false));
  }, [refreshGroups]);

  useEffect(() => {
    if (loading) return;

    const sync = async () => {
      const list = await api.groups.list();
      const shared = list.filter((g) => g.isShared);
      if (shared.length === 0) return;
      await syncAllSharedGroups(shared);
      await refreshGroups();
    };

    sync();
    const interval = setInterval(sync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loading, refreshGroups]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? null,
    [groups, activeGroupId]
  );

  const value = useMemo(
    () => ({
      groups,
      activeGroup,
      activeGroupId,
      loading,
      setActiveGroup,
      refreshGroups,
    }),
    [groups, activeGroup, activeGroupId, loading, setActiveGroup, refreshGroups]
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroups() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroups must be used within GroupProvider");
  return ctx;
}
