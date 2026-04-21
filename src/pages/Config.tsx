import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Globe, Check, X, ExternalLink, Users, UserPlus, Copy, Trash2, ChevronRight, Image, Pencil } from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useInvitationStore } from '@/stores/invitationStore';
import { cn } from '@/lib/utils';
import { toast } from '@/stores/toastStore';
import type { TeamCapacity } from '@/types';

export function Config() {
  const initiatives = usePortfolioStore((s) => s.initiatives);
  const teams = usePortfolioStore((s) => s.teams);
  const updateInitiativeFavicon = usePortfolioStore((s) => s.updateInitiativeFavicon);
  const updateTeamCapacity = usePortfolioStore((s) => s.updateTeamCapacity);
  const renameTeam = usePortfolioStore((s) => s.renameTeam);

  // Invitation store
  const { invitations, isLoading: invitationsLoading, loadInvitations, createInvitation, revokeInvitation } = useInvitationStore();
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  // Only show parent initiatives (top-level items that can have branding)
  const parentInitiatives = useMemo(
    () => initiatives.filter((i) => i.parentId === null),
    [initiatives]
  );

  // Collapsible sections state (all collapsed by default)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Favicon editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Team capacity editing state
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [capacityForm, setCapacityForm] = useState<TeamCapacity>({ streams: 1, streamPct: 100, bauPct: 0 });

  // Team name editing state
  const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null);
  const [renameTeamValue, setRenameTeamValue] = useState('');

  const startEdit = (initId: string, currentUrl: string | undefined) => {
    setEditingId(initId);
    setEditValue(currentUrl ?? '');
  };

  const saveEdit = async () => {
    if (editingId) {
      await updateInitiativeFavicon(editingId, editValue);
      setEditingId(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Team capacity editing functions
  const startCapacityEdit = (teamId: string, currentConfig: TeamCapacity | undefined) => {
    setEditingTeamId(teamId);
    setCapacityForm(currentConfig ?? { streams: 1, streamPct: 100, bauPct: 0 });
  };

  const saveCapacityEdit = async () => {
    if (editingTeamId) {
      await updateTeamCapacity(editingTeamId, capacityForm);
      setEditingTeamId(null);
    }
  };

  const clearCapacity = async (teamId: string) => {
    await updateTeamCapacity(teamId, null);
  };

  const cancelCapacityEdit = () => {
    setEditingTeamId(null);
  };

  // Team name editing functions
  const startTeamRename = (teamId: string, currentName: string) => {
    setRenamingTeamId(teamId);
    setRenameTeamValue(currentName);
  };

  const confirmTeamRename = () => {
    if (renamingTeamId && renameTeamValue.trim()) {
      renameTeam(renamingTeamId, renameTeamValue.trim());
    }
    setRenamingTeamId(null);
    setRenameTeamValue('');
  };

  const cancelTeamRename = () => {
    setRenamingTeamId(null);
    setRenameTeamValue('');
  };

  // Calculate total capacity percentage
  const getTotalCapacity = (config: TeamCapacity) => {
    return (config.streams * config.streamPct) + config.bauPct;
  };

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">Configuration</h1>
            <p className="text-sm text-muted-foreground">
              Manage initiative branding and settings
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          {/* Initiative Branding Section */}
          <section className="border border-border rounded overflow-hidden">
            <button
              onClick={() => toggleSection('branding')}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted/80 transition-colors text-left"
            >
              <ChevronRight
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  expandedSections.has('branding') && 'rotate-90'
                )}
              />
              <Image className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold flex-1">Initiative Branding</h2>
              <span className="text-xs text-muted-foreground">{parentInitiatives.length} items</span>
            </button>

            <AnimatePresence initial={false}>
              {expandedSections.has('branding') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-4">
                      Add favicon URLs for each initiative to display brand logos in the heatmap.
                    </p>

                    <div className="bg-card border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Initiative</th>
                    <th className="px-4 py-3 text-left font-semibold">Preview</th>
                    <th className="px-4 py-3 text-left font-semibold">Favicon URL</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {parentInitiatives.map((init) => (
                    <tr
                      key={init.id}
                      className="border-b border-border/50 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium">{init.name}</td>
                      <td className="px-4 py-3">
                        {init.faviconUrl ? (
                          <img
                            src={init.faviconUrl}
                            alt={init.name}
                            className="h-6 w-6 rounded object-contain bg-muted"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === init.id ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="https://example.com/favicon.ico"
                            className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                        ) : (
                          <span
                            className={cn(
                              'text-sm truncate max-w-xs block',
                              init.faviconUrl
                                ? 'text-foreground'
                                : 'text-muted-foreground italic'
                            )}
                          >
                            {init.faviconUrl || 'Not set'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === init.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-primary hover:bg-accent rounded"
                              title="Save"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-muted-foreground hover:bg-accent rounded"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(init.id, init.faviconUrl)}
                              className="px-2 py-1 text-xs text-primary hover:bg-accent rounded"
                            >
                              Edit
                            </button>
                            {init.faviconUrl && (
                              <a
                                href={init.faviconUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-muted-foreground hover:text-foreground"
                                title="Open URL"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {parentInitiatives.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No initiatives configured yet
                </div>
              )}
            </div>

                    {/* Help text */}
                    <div className="mt-4 p-3 bg-muted/30 rounded text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Finding favicon URLs:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Most sites: <code className="bg-muted px-1 rounded">https://example.com/favicon.ico</code></li>
                        <li>Google service: <code className="bg-muted px-1 rounded">https://www.google.com/s2/favicons?domain=example.com&sz=32</code></li>
                        <li>Or use any direct image URL (PNG, JPG, SVG)</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Team Capacity Section */}
          <section className="mt-4 border border-border rounded overflow-hidden">
            <button
              onClick={() => toggleSection('capacity')}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted/80 transition-colors text-left"
            >
              <ChevronRight
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  expandedSections.has('capacity') && 'rotate-90'
                )}
              />
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold flex-1">Team Capacity</h2>
              <span className="text-xs text-muted-foreground">{teams.length} teams</span>
            </button>

            <AnimatePresence initial={false}>
              {expandedSections.has('capacity') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure how much work each team can handle in parallel. Used for timeline planning.
                    </p>

                    <div className="bg-card border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Team</th>
                    <th className="px-4 py-3 text-left font-semibold">Streams</th>
                    <th className="px-4 py-3 text-left font-semibold">Per Stream</th>
                    <th className="px-4 py-3 text-left font-semibold">BAU</th>
                    <th className="px-4 py-3 text-left font-semibold">Total</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => {
                    const isEditing = editingTeamId === team.id;
                    const isRenaming = renamingTeamId === team.id;
                    const config = team.capacityConfig;
                    const total = config ? getTotalCapacity(config) : null;

                    return (
                      <tr
                        key={team.id}
                        className="border-b border-border/50 last:border-b-0 group"
                      >
                        <td className="px-4 py-3 font-medium">
                          {isRenaming ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                value={renameTeamValue}
                                onChange={(e) => setRenameTeamValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') confirmTeamRename();
                                  if (e.key === 'Escape') cancelTeamRename();
                                }}
                                onBlur={confirmTeamRename}
                                className="flex-1 px-2 py-1 text-sm border border-primary rounded bg-background focus:outline-none"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span>{team.name}</span>
                              <button
                                onClick={() => startTeamRename(team.id, team.name)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                                title="Rename team"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        {isEditing ? (
                          <>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={capacityForm.streams}
                                onChange={(e) => setCapacityForm(f => ({ ...f, streams: parseInt(e.target.value) || 1 }))}
                                className="w-16 px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={capacityForm.streamPct}
                                  onChange={(e) => setCapacityForm(f => ({ ...f, streamPct: parseInt(e.target.value) || 0 }))}
                                  className="w-16 px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <span className="text-muted-foreground">%</span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={capacityForm.bauPct}
                                  onChange={(e) => setCapacityForm(f => ({ ...f, bauPct: parseInt(e.target.value) || 0 }))}
                                  className="w-16 px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <span className="text-muted-foreground">%</span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className={cn(
                                'font-medium',
                                getTotalCapacity(capacityForm) > 100 ? 'text-destructive' : 'text-foreground'
                              )}>
                                {getTotalCapacity(capacityForm)}%
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={saveCapacityEdit}
                                  className="p-1 text-primary hover:bg-accent rounded"
                                  title="Save"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelCapacityEdit}
                                  className="p-1 text-muted-foreground hover:bg-accent rounded"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-muted-foreground">
                              {config ? config.streams : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {config ? `${config.streamPct}%` : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {config ? `${config.bauPct}%` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {total !== null ? (
                                <span className={cn(
                                  'font-medium',
                                  total > 100 ? 'text-destructive' : 'text-foreground'
                                )}>
                                  {total}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startCapacityEdit(team.id, team.capacityConfig)}
                                  className="px-2 py-1 text-xs text-primary hover:bg-accent rounded"
                                >
                                  {config ? 'Edit' : 'Set'}
                                </button>
                                {config && (
                                  <button
                                    onClick={() => clearCapacity(team.id)}
                                    className="p-1 text-muted-foreground hover:text-destructive rounded"
                                    title="Clear capacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {teams.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No teams configured yet
                </div>
              )}
            </div>

                    {/* Help text */}
                    <div className="mt-4 p-3 bg-muted/30 rounded text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Capacity model:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li><strong>Streams:</strong> Parallel work streams (e.g., 2 initiatives at once)</li>
                        <li><strong>Per Stream:</strong> Capacity % per stream (e.g., 45%)</li>
                        <li><strong>BAU:</strong> Reserved for business-as-usual (e.g., 10%)</li>
                        <li><strong>Total:</strong> (Streams × Per Stream) + BAU — should be ≤100%</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* User Management Section */}
          <section className="mt-4 border border-border rounded overflow-hidden">
            <button
              onClick={() => toggleSection('users')}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted/80 transition-colors text-left"
            >
              <ChevronRight
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  expandedSections.has('users') && 'rotate-90'
                )}
              />
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold flex-1">User Management</h2>
              <span className="text-xs text-muted-foreground">{invitations.length} invites</span>
            </button>

            <AnimatePresence initial={false}>
              {expandedSections.has('users') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-4">
                      Invite new users to FlowMap. Each invitation is single-use.
                    </p>

                    {/* Invite Form */}
                    <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newUserEmail) return;
                setIsCreatingInvite(true);
                try {
                  const inviteUrl = await createInvitation(newUserEmail);
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.success('Invite link copied to clipboard');
                  setNewUserEmail('');
                } catch {
                  toast.error('Failed to create invitation');
                } finally {
                  setIsCreatingInvite(false);
                }
              }}
              className="flex gap-2 mb-4"
            >
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@company.com"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <button
                type="submit"
                disabled={isCreatingInvite || !newUserEmail}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingInvite ? 'Creating...' : 'Generate Invite'}
              </button>
            </form>

            {/* Invitations Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Invited</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border/50 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium">{inv.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            inv.status === 'pending' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                            inv.status === 'accepted' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                            inv.status === 'revoked' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          )}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {inv.invitedAt
                          ? new Date(inv.invitedAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {inv.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                const url = `${window.location.origin}/invite?code=${inv.code}`;
                                await navigator.clipboard.writeText(url);
                                toast.success('Invite link copied');
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                              title="Copy invite link"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => revokeInvitation(inv.id)}
                              className="p-1 text-muted-foreground hover:text-destructive rounded"
                              title="Revoke invitation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {invitations.length === 0 && !invitationsLoading && (
                <div className="p-8 text-center text-muted-foreground">
                  No invitations yet. Create one above.
                </div>
              )}

              {invitationsLoading && (
                <div className="p-8 text-center text-muted-foreground">
                  Loading invitations...
                </div>
              )}
            </div>

                    {/* Help text */}
                    <div className="mt-4 p-3 bg-muted/30 rounded text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Invitation flow:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Enter the user&apos;s email and click &quot;Generate Invite&quot;</li>
                        <li>The invite link is automatically copied to your clipboard</li>
                        <li>Share the link with the user — they will create a password</li>
                        <li>Status changes to &quot;accepted&quot; once they complete signup</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
