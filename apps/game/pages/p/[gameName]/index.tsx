import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { LangType } from 'src/apis/createra';
import { LoadingStage } from 'src/defs/loading-stage';
import { EngineApp, EngineAppProps } from '../../../components/engine-app';
import { Error, ErrorProps } from '../../../components/error';
import { PlayLoading } from '../../../components/play-loading';
import { getArenaServerRenderProps } from '../../../server/server-render';
import { FeatureFlag } from '@box-local/env/constants';
import { hashToUrl } from '../../../server/utils/hash';
import { hasAuthenticatedPlayer, playerAccountURL } from '../../../server/player-service-client';

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

/**
 * 时间检查函数
 * 晚上10点到早上8点不允许游玩，检查是否处于该时间段
 * @returns
 */
function isWithinPlayTime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 8 && hour < 22;
}

export const getServerSideProps: GetServerSideProps<SSRProps> = async (
  context,
) => {
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') {
    return {
      redirect: { destination: '/account', permanent: false },
    };
  }
  const from = process.env.BOX_DEPLOYMENT_MODE === 'creator' ? 'creator' : 'play';
  if (!await hasAuthenticatedPlayer(
    context.req.headers.cookie || '',
    context.req.socket.remoteAddress || '',
    String(context.req.headers['user-agent'] || ''),
  )) {
    return { redirect: { destination: playerAccountURL(from), permanent: false } };
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

  // 检查时间限制（管理员除外） - 通过 FeatureFlag 控制是否开启
  if (
    !isWithinPlayTime() &&
    serverProps.props.clientConfig.FEATURE_FLAGS?.includes(
      FeatureFlag.TimeRestriction,
    )
  ) {
    const userInfo = serverProps.props.userInfo;

    if (!userInfo?.isAdmin) {
      // 非管理员用户重定向到时间限制页面
      return {
        redirect: {
          destination: '/time-restriction',
          permanent: false,
        },
      };
    }
  }

  return serverProps;
};

function Home(props: SSRProps) {
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
