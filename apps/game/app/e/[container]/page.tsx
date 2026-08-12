import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { EditorPage } from 'src/entry/editor-page';
import { getArenaServerRenderProps } from '/server/server-render';
import { hasAuthenticatedPlayer, playerAccountURL } from '/server/player-service-client';

export default async function Page({ params, searchParams }) {
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') {
    redirect('/account');
  }
  if (process.env.BOX_DEPLOYMENT_MODE === 'play') {
    redirect('/p/local');
  }

  const cookie = (await cookies()).toString();
  const requestHeaders = await headers();
  const browserLanguage = requestHeaders.get('accept-language') || undefined;
  if (!await hasAuthenticatedPlayer(
    cookie,
    requestHeaders.get('x-forwarded-for') || '',
    requestHeaders.get('user-agent') || '',
  )) {
    redirect(playerAccountURL('creator'));
  }
  const { token } = await searchParams;
  const { props } = await getArenaServerRenderProps({
    containerName: (await params)!['container'], // TODO 做点错误处理，走到 404 去？
    mode: 'edit',
    cookie,
    browserLanguage,
    token: token?.toString(),
  });
  return <EditorPage {...props} />;
}
