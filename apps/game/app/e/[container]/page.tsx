import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { EditorPage } from 'src/entry/editor-page';
import { getArenaServerRenderProps } from '/server/server-render';
import { getLocalProjectManager } from '/server/local-project-manager';
import { hasAuthenticatedPlayer, playerLoginURL } from '/server/player-service-client';

export default async function Page({ params, searchParams }) {
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') {
    redirect('/players');
  }
  if (process.env.BOX_DEPLOYMENT_MODE === 'play') {
    redirect('/p/local');
  }

  const container = (await params)!['container'];
  try {
    getLocalProjectManager().getProject(container);
  } catch {
    notFound();
  }

  const cookie = (await cookies()).toString();
  const requestHeaders = await headers();
  const browserLanguage = requestHeaders.get('accept-language') || undefined;
  if (!await hasAuthenticatedPlayer(
    cookie,
    requestHeaders.get('x-forwarded-for') || '',
    requestHeaders.get('user-agent') || '',
  )) {
    redirect(playerLoginURL('creator'));
  }
  const { token } = await searchParams;
  const { props } = await getArenaServerRenderProps({
    containerName: container,
    mode: 'edit',
    cookie,
    browserLanguage,
    token: token?.toString(),
  });
  return <EditorPage {...props} />;
}
