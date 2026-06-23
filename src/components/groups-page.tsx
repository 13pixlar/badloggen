"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Share2,
  UserPlus,
  Copy,
  Check,
  Users,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api/client";
import { useGroups } from "@/components/group-provider";
import { setUserDisplayName, ensureLocalUser } from "@/lib/auth/user";
import { buildGroupShareUrl, parseShareCodeFromInput, getShareCodeFromLocation } from "@/lib/groups/share-link";

export function GroupsPage() {
  const { groups, activeGroup, refreshGroups, setActiveGroup } = useGroups();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState(() => ensureLocalUser().displayName);
  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = getShareCodeFromLocation(searchParams.toString());
    if (code) setJoinCode(code);
  }, [searchParams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const group = await api.groups.create(name.trim());
      setName("");
      await refreshGroups();
      setActiveGroup(group.id);
      toast.success(t("groups.created"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setSubmitting(true);
    try {
      const code = parseShareCodeFromInput(joinCode);
      if (!code) return;
      const group = await api.groups.join(code);
      setJoinCode("");
      await refreshGroups();
      setActiveGroup(group.id);
      toast.success(t("groups.joined", { name: group.name }));
    } catch {
      toast.error(t("groups.joinFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async (groupId: string) => {
    setSharing(groupId);
    try {
      const code = await api.groups.share(groupId);
      await refreshGroups();
      const shareUrl = buildGroupShareUrl(code);
      await navigator.clipboard.writeText(shareUrl);
      setCopied(shareUrl);
      toast.success(t("groups.shareSuccess"));
      setTimeout(() => setCopied(null), 3000);
    } catch {
      toast.error(t("groups.shareFailed"));
    } finally {
      setSharing(null);
    }
  };

  const handleCopyShareLink = async (shareCode: string) => {
    const shareUrl = buildGroupShareUrl(shareCode);
    await navigator.clipboard.writeText(shareUrl);
    setCopied(shareUrl);
    toast.success(t("groups.copied"));
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm(t("groups.deleteConfirm"))) return;
    try {
      await api.groups.delete(groupId);
      await refreshGroups();
      toast.success(t("groups.deleted"));
    } catch {
      toast.error(t("groups.deleteForbidden"));
    }
  };

  const handleRename = async (groupId: string) => {
    if (!editName.trim()) return;
    try {
      await api.groups.update(groupId, editName.trim());
      setEditingId(null);
      await refreshGroups();
      toast.success(t("groups.renamed"));
    } catch {
      toast.error(t("groups.deleteForbidden"));
    }
  };

  const handleSaveDisplayName = () => {
    setUserDisplayName(displayName);
    toast.success(t("groups.nameSaved"));
  };

  const canManageGroup = (group: (typeof groups)[0]) =>
    !group.isShared || group.role === "owner";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("groups.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("groups.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("groups.yourName")}</CardTitle>
          <CardDescription>{t("groups.yourNameHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("groups.yourNamePlaceholder")}
              className="flex-1"
            />
            <Button type="button" onClick={handleSaveDisplayName}>
              {t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("groups.create")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("groups.namePlaceholder")}
              className="flex-1"
            />
            <Button type="submit" disabled={submitting || !name.trim()}>
              {t("groups.create")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("groups.join")}
          </CardTitle>
          <CardDescription>{t("groups.joinHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t("groups.joinPlaceholder")}
              className="flex-1 font-mono tracking-widest"
            />
            <Button type="submit" disabled={submitting || !joinCode.trim()}>
              {t("groups.join")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("groups.list")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">{t("groups.empty")}</p>
          ) : (
            <ul className="divide-y">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {editingId === group.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={() => handleRename(group.id)}>
                            {t("common.save")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            {t("common.cancel")}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{group.name}</span>
                            {group.id === activeGroup?.id && (
                              <Badge variant="secondary">{t("groups.active")}</Badge>
                            )}
                            {group.isShared && (
                              <Badge variant="outline">
                                {group.role === "owner" ? t("groups.owner") : t("groups.member")}
                              </Badge>
                            )}
                          </div>
                          {group.shareCode && (
                            <p className="text-sm text-muted-foreground mt-1 break-all">
                              {buildGroupShareUrl(group.shareCode)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {group.id !== activeGroup?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveGroup(group.id)}
                        >
                          {t("groups.setActive")}
                        </Button>
                      )}
                      {canManageGroup(group) && editingId !== group.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(group.id);
                            setEditName(group.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {!group.isShared && canManageGroup(group) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShare(group.id)}
                          disabled={sharing === group.id}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      {group.shareCode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyShareLink(group.shareCode!)}
                        >
                          {copied === buildGroupShareUrl(group.shareCode!) ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {canManageGroup(group) && groups.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(group.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
