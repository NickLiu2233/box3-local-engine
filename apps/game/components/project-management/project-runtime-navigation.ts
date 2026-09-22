import type { LocalProject } from './project-types';

/**
 * Open the editor immediately while runtime allocation starts in parallel.
 * The runtime endpoint deduplicates repeated requests, so the editor owns the
 * visible connecting state instead of showing an extra launcher page.
 */
export function openProjectEditor(project: LocalProject) {
  void fetch(`/api/local-projects/${encodeURIComponent(project.id)}/runtime`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'edit' }),
  }).catch(() => undefined);
  window.open(`/e/${encodeURIComponent(project.id)}`, '_blank', 'noopener');
}
