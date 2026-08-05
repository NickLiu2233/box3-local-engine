import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import type { NextApiRequest, NextApiResponse } from 'next';
import { allowCreatorApi } from '../../../../server/creator-api-security';

type RuntimeMode = 'edit' | 'play';

type ActiveRuntime = {
  projectId: string;
  children: Partial<Record<RuntimeMode, ChildProcess>>;
};

type RuntimeState = {
  activeRuntime: ActiveRuntime | null;
  runtimeTransition: Promise<void>;
  cleanupRegistered: boolean;
};

const runtimeGlobal = globalThis as typeof globalThis & {
  __boxLocalRuntimeState?: RuntimeState;
};
const runtimeState = runtimeGlobal.__boxLocalRuntimeState || {
  activeRuntime: null,
  runtimeTransition: Promise.resolve(),
  cleanupRegistered: false,
};
runtimeGlobal.__boxLocalRuntimeState = runtimeState;

async function waitForRuntime(child: ChildProcess, port: number) {
  const url = `http://127.0.0.1:${port}/api/health-check`;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error('作品运行时启动失败');
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // The project server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('等待作品运行时启动超时');
}

function stopChild(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      if (forceTimer) clearTimeout(forceTimer);
      resolve();
    };
    child.once('exit', done);
    if (!child.kill('SIGTERM')) {
      child.removeListener('exit', done);
      done();
      return;
    }
    forceTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    }, 5000);
  });
}

async function stopRuntime(runtime: ActiveRuntime) {
  await Promise.all([
    stopChild(runtime.children.edit),
    stopChild(runtime.children.play),
  ]);
}

async function spawnProjectRuntime(projectId: string, mode: RuntimeMode) {
  const root = process.env.BOX_LOCAL_ENGINE_ROOT
    ? path.resolve(process.env.BOX_LOCAL_ENGINE_ROOT, '../..')
    : path.resolve(process.cwd(), '../..');
  const launcherArgs = ['apps/local-engine/src/launcher.js'];
  if (process.env.NODE_ENV === 'production') {
    launcherArgs.push('--production');
  }
  launcherArgs.push(
    '--runtime-only',
    '--runtime-mode',
    mode,
    '--project',
    projectId,
  );
  const child = spawn(
    process.execPath,
    launcherArgs,
    {
      cwd: root,
      // Keep runtime output attached to the creator container. Production
      // failures must be visible in `docker compose logs creator` instead of
      // being silently discarded while the browser only shows "Reconnect".
      stdio: 'inherit',
      env: {
        ...process.env,
        BOX_PLAY_RUNTIME_PORT:
          process.env.BOX_PLAY_RUNTIME_PORT ||
          process.env.BOX_SERVER_PORT ||
          '9966',
        BOX_EDIT_RUNTIME_PORT:
          process.env.BOX_EDIT_RUNTIME_PORT ||
          process.env.BOX_EDIT_SERVER_PORT ||
          '9967',
      },
    },
  );

  await new Promise<void>((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
  return child;
}

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
  let runtime = runtimeState.activeRuntime;
  if (runtime && runtime.projectId !== projectId) {
    runtimeState.activeRuntime = null;
    await stopRuntime(runtime);
    runtime = null;
  }
  if (!runtime) {
    runtime = { projectId, children: {} };
    runtimeState.activeRuntime = runtime;
  }

  const currentChild = runtime.children[mode];
  if (
    mode === 'edit' &&
    currentChild &&
    currentChild.exitCode === null &&
    currentChild.signalCode === null
  ) {
    return;
  }
  if (mode === 'play') {
    await stopChild(currentChild);
    delete runtime.children.play;
  }

  const child = await spawnProjectRuntime(projectId, mode);
  runtime.children[mode] = child;
  child.once('exit', () => {
    if (child.exitCode !== 0 && child.signalCode !== 'SIGTERM') {
      console.error(
        `作品运行时异常退出：project=${projectId} mode=${mode} code=${child.exitCode} signal=${child.signalCode}`,
      );
    }
    if (runtimeState.activeRuntime === runtime && runtime.children[mode] === child) {
      delete runtime.children[mode];
    }
  });

  try {
    await waitForRuntime(child, runtimePort(mode));
  } catch (error) {
    if (runtime.children[mode] === child) delete runtime.children[mode];
    await stopChild(child);
    throw error;
  }
}

function queueProjectActivation(projectId: string, mode: RuntimeMode) {
  const activation = runtimeState.runtimeTransition.then(() =>
    activateProject(projectId, mode),
  );
  runtimeState.runtimeTransition = activation.catch(() => undefined);
  return activation;
}

function terminateActiveRuntime() {
  const runtime = runtimeState.activeRuntime;
  runtimeState.activeRuntime = null;
  if (!runtime) return;
  for (const child of Object.values(runtime.children)) {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
    }
  }
}

if (!runtimeState.cleanupRegistered) {
  runtimeState.cleanupRegistered = true;
  process.once('exit', terminateActiveRuntime);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      terminateActiveRuntime();
      setTimeout(() => process.exit(0), 300).unref();
    });
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
  const mode = req.body?.mode === 'play' ? 'play' : 'edit';

  try {
    await queueProjectActivation(id, mode);
  } catch (error) {
    return res.status(500).json({
      message: (error as Error).message || '启动作品失败',
    });
  }

  return res.status(202).json({ editUrl: `/e/${id}`, playUrl: `/p/${id}` });
}
