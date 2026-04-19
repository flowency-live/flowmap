import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Globe, Check, X, ExternalLink } from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { cn } from '@/lib/utils';

export function Config() {
  const themes = usePortfolioStore((s) => s.themes);
  const updateThemeFavicon = usePortfolioStore((s) => s.updateThemeFavicon);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (themeId: string, currentUrl: string | undefined) => {
    setEditingId(themeId);
    setEditValue(currentUrl ?? '');
  };

  const saveEdit = async () => {
    if (editingId) {
      await updateThemeFavicon(editingId, editValue);
      setEditingId(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
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
              Manage themes and brand settings
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          {/* Theme Branding Section */}
          <section>
            <h2 className="text-lg font-semibold mb-1">Theme Branding</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add favicon URLs for each theme to display brand logos in the heatmap.
              You can use any image URL (favicon, logo, etc.)
            </p>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Theme</th>
                    <th className="px-4 py-3 text-left font-semibold">Preview</th>
                    <th className="px-4 py-3 text-left font-semibold">Favicon URL</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {themes.map((theme) => (
                    <tr
                      key={theme.id}
                      className="border-b border-border/50 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium">{theme.name}</td>
                      <td className="px-4 py-3">
                        {theme.faviconUrl ? (
                          <img
                            src={theme.faviconUrl}
                            alt={theme.name}
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
                        {editingId === theme.id ? (
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
                              theme.faviconUrl
                                ? 'text-foreground'
                                : 'text-muted-foreground italic'
                            )}
                          >
                            {theme.faviconUrl || 'Not set'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === theme.id ? (
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
                              onClick={() => startEdit(theme.id, theme.faviconUrl)}
                              className="px-2 py-1 text-xs text-primary hover:bg-accent rounded"
                            >
                              Edit
                            </button>
                            {theme.faviconUrl && (
                              <a
                                href={theme.faviconUrl}
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

              {themes.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No themes configured yet
                </div>
              )}
            </div>

            {/* Help text */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-2">Finding favicon URLs:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Most sites: <code className="bg-muted px-1 rounded">https://example.com/favicon.ico</code>
                </li>
                <li>
                  Google service: <code className="bg-muted px-1 rounded">https://www.google.com/s2/favicons?domain=example.com&sz=32</code>
                </li>
                <li>
                  Or use any direct image URL (PNG, JPG, SVG)
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
