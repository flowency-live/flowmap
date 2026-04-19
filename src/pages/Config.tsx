import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Settings, Globe, Check, X, ExternalLink } from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { cn } from '@/lib/utils';

export function Config() {
  const initiatives = usePortfolioStore((s) => s.initiatives);
  const updateInitiativeFavicon = usePortfolioStore((s) => s.updateInitiativeFavicon);

  // Only show parent initiatives (top-level items that can have branding)
  const parentInitiatives = useMemo(
    () => initiatives.filter((i) => i.parentId === null),
    [initiatives]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
          <section>
            <h2 className="text-lg font-semibold mb-1">Initiative Branding</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add favicon URLs for each initiative to display brand logos in the heatmap.
              You can use any image URL (favicon, logo, etc.)
            </p>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
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
