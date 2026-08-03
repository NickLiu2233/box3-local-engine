import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { EditorPage } from 'src/entry/editor-page';
import { getArenaServerRenderProps } from '/server/server-render';

export default async function Page({ params, searchParams }) {
  if (process.env.BOX_PLAYER_CLIENT_ONLY === 'true') {
    redirect('/connect');
  }

  const cookie = (await cookies()).toString();
  const browserLanguage = (await headers()).get('accept-language') || undefined;
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
