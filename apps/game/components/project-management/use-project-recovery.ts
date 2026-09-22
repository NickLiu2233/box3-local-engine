import { useState } from 'react';

import type { LocalProject, ProjectSnapshot } from './project-types';

type Options = {
  refreshProjects: () => Promise<void>;
  setNotice: (notice: string) => void;
  closeProjectMenu: () => void;
};

export function useProjectRecovery(options: Options) {
  const [project, setProject] = useState<LocalProject | null>(null);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const open = async (target: LocalProject) => {
    options.closeProjectMenu();
    setProject(target);
    setSnapshots([]);
    setSelectedSnapshot('');
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`/api/local-projects/${encodeURIComponent(target.id)}/snapshots`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '读取恢复记录失败');
      const next = Array.isArray(data.snapshots) ? data.snapshots : [];
      setSnapshots(next);
      setSelectedSnapshot(next[0]?.name || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取恢复记录失败');
    } finally {
      setLoading(false);
    }
  };

  const restore = async () => {
    if (!project || !selectedSnapshot || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/local-projects/${encodeURIComponent(project.id)}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: selectedSnapshot }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '恢复历史版本失败');
      options.setNotice(`已恢复 ${project.name} 的历史版本；重新打开编辑器后生效`);
      setProject(null);
      await options.refreshProjects();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : '恢复历史版本失败');
    } finally {
      setLoading(false);
    }
  };

  return { project, snapshots, selectedSnapshot, loading, error, open, restore, close: () => setProject(null), select: setSelectedSnapshot };
}
