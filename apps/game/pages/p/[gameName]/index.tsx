import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { IntlProvider } from 'react-intl';
import { LangType } from 'src/apis/createra';
import { LoadingStage } from 'src/defs/loading-stage';
import { EngineApp, EngineAppProps } from '../../../components/engine-app';
import { Error, ErrorProps } from '../../../components/error';
import { PlayLoading } from '../../../components/play-loading';
import { getArenaServerRenderProps } from '../../../server/server-render';
import { hashToUrl } from '../../../server/utils/hash';
import { hasAuthenticatedPlayer, playerLoginURL, requestPlayerServiceIp } from '../../../server/player-service-client';
import { findPlayWorld } from '../../../server/play-worlds';
import { getLocalProjectManager } from '../../../server/local-project-manager';

// 浏览器执行的代码
const DynamicPlayUi = dynamic(() => import('../../../src/views/play'), {
  ssr: false,
});

export type SSRProps = SSRSuccessProps | SSRErrorProps | LoadingConfigProps;

type SSRSuccessProps = EngineAppProps & {
  error?: never;
  loadingConfig?: never;
};

interface SSRErrorProps {
  error: ErrorProps;
  locale: LangType;
  loadingConfig?: never;
  userInfo: undefined;
}

interface LoadingConfigProps {
  error?: never;
  loadingConfig: true;
  userInfo: undefined;
}

export const getServerSideProps: GetServerSideProps<SSRProps> = async (
  context,
) => {
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') {
    return {
      redirect: { destination: '/', permanent: false },
    };
  }
  const gameName = String(context.params?.gameName || '');
  if (process.env.BOX_DEPLOYMENT_MODE === 'play') {
    const exists = process.env.BOX_PLAY_LIBRARY_PATH
      ? Boolean(findPlayWorld(gameName))
      : [process.env.BOX_WORLD_PUBLIC_ID, process.env.BOX_WORLD_ID]
          .filter(Boolean)
          .includes(gameName);
    if (!exists || findPlayWorld(gameName)?.playEnabled === false) return { notFound: true };
  } else {
    try {
      getLocalProjectManager().getProject(gameName);
    } catch {
      return { notFound: true };
    }
  }
  const from = process.env.BOX_DEPLOYMENT_MODE === 'creator' ? 'creator' : 'play';
  if (!await hasAuthenticatedPlayer(
    context.req.headers.cookie || '',
    requestPlayerServiceIp(context.req),
    String(context.req.headers['user-agent'] || ''),
  )) {
    return { redirect: { destination: playerLoginURL(from), permanent: false } };
  }
  const cookie = context.req.headers.cookie!;
  const { token } = context.query;
  const browserLanguage = context.req.headers['accept-language'];

  // 先获取用户信息
  const serverProps = await getArenaServerRenderProps({
    containerName: context.params!['gameName'] as string,
    mode: 'play',
    cookie,
    browserLanguage,
    token: token?.toString(),
  });

  // 如果 getArenaServerRenderProps 返回错误或加载配置，直接返回
  if ('error' in serverProps.props || 'loadingConfig' in serverProps.props) {
    return serverProps;
  }

  return serverProps;
};

function Home(props: SSRProps) {
  const router = useRouter();
  const [loadingStage, setLoadingStage] = useState(LoadingStage.file);
  const [locale, setLocale] = useState<LangType>(() =>
    props.loadingConfig ? 'en' : props.locale,
  );

  useEffect(() => {
    if (loadingStage === LoadingStage.done) {
      setTimeout(() => {
        setLoadingStage(LoadingStage.close);
      }, 300);
    }
  }, [loadingStage]);

  useEffect(() => {
    const mapId = typeof router.query.gameName === 'string' ? router.query.gameName : '';
    if (!mapId || process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'creator') return;
    const send = (method: 'POST' | 'DELETE', keepalive = false) =>
      fetch('/api/play-presence', {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId }),
        keepalive,
      }).catch(() => undefined);
    void send('POST');
    const timer = window.setInterval(() => void send('POST'), 25_000);
    const leave = () => void send('DELETE', true);
    window.addEventListener('pagehide', leave);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, [router.query.gameName]);

  // 如果有异常，去异常页面
  if (props.error) {
    return <Error code={props.error.code} info={props.error.info} />;
  }

  const isCreatera =
    !props.loadingConfig && props.clientConfig.APP_EDITION === 'createra';

  return (
    <div id="__next__root">
      {(props.loadingConfig ||
        (isCreatera && loadingStage !== LoadingStage.close)) && (
        <IntlProvider
          messages={props.loadingConfig ? {} : props.message}
          locale={locale}
        >
          <PlayLoading
            loadingConfig={!!props.loadingConfig}
            stage={loadingStage}
            gameCover={
              props.loadingConfig
                ? undefined
                : hashToUrl(
                    props.clientConfig.mapInfo.backgroundImage,
                    props.clientConfig.CDN_PATH,
                  )
            }
          />
        </IntlProvider>
      )}
      {!props.loadingConfig && (
        <EngineApp {...props} locale={locale} message={props.message}>
          <div className="play-react">
            <DynamicPlayUi
              userInfo={props.userInfo}
              setLoadingStage={setLoadingStage}
              setLocale={setLocale}
            />
          </div>
        </EngineApp>
      )}
    </div>
  );
}

export default Home;
