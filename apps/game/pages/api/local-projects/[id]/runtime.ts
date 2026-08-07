import type { NextApiRequest, NextApiResponse } from 'next';
import { allowCreatorApi } from '../../../../server/creator-api-security';

type RuntimeMode = 'edit' | 'play';

function runtimePort(mode: RuntimeMode) {
  return Number(
    mode === 'play'
      ? process.env.BOX_PLAY_RUNTIME_PORT ||
          process.env.BOX_SERVER_PORT ||
          9966
      : process.env.BOX_EDIT_RUNTIME_PORT ||
          process.env.BOX_EDIT_SERVER_PORT ||
          9967,
  );
}

async function activateProject(projectId: string, mode: RuntimeMode) {
  // boxes allocates one container for each map + mode pair. The local runtime
  // libraries expose the same behavior behind stable edit/play proxy ports.
  // Addressing the health route starts the requested child if necessary and
  // leaves every other project's child running.
  const response = await fetch(
    `http://127.0.0.1:${runtimePort(mode)}/${encodeURIComponent(projectId)}/api/health-check`,
    { signal: AbortSignal.timeout(65_000) },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      body || `${mode === 'edit' ? '编辑' : '游玩'}运行时启动失败（HTTP ${response.status}）`,
    );
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowCreatorApi(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ message: 'Project ID is required' });
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(id)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }
  const mode: RuntimeMode = req.body?.mode === 'play' ? 'play' : 'edit';

  try {
    await activateProject(id, mode);
  } catch (error) {
    return res.status(500).json({
      message: (error as Error).message || '启动作品失败',
    });
  }

  return res.status(202).json({ editUrl: `/e/${id}`, playUrl: `/p/${id}` });
}
