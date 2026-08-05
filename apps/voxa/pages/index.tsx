import {
  GetServerSideProps,
  InferGetServerSidePropsType,
} from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import React, { useMemo, useState, useCallback } from 'react';
import { createIntl } from 'react-intl';
import type { ClientRuntimeConfig } from '../configs/runtime-client';
import type { UserInfo } from '../src/interface';
import { LangType, MessagesType } from '../src/utils/i18n';
import { setToken } from '../src/utils/token';

function loadLocaleData(locale: LangType) {
  return import(`../lang/build/${locale}.json`);
}

const ContainerNoSSR = dynamic(() => import('../src'), { ssr: false });

export const getServerSideProps: GetServerSideProps<{
  locale: LangType;
  messages: MessagesType;
  clientEnv: ClientRuntimeConfig;
  userInfo: Required<UserInfo>;
}> = async (context) => {
  const locale: LangType = context.req.headers['accept-language']
    ?.toLowerCase()
    .includes('zh')
    ? 'zh-Hans'
    : 'en';
  const messages = (await loadLocaleData(locale)).default;
  const clientUserInfo: UserInfo = {
    avatar: '',
    userId: 1,
    isAdmin: true,
  };

  const clientEnv: ClientRuntimeConfig = {
    appEnv: 'development',
    appEdition: 'createra',
    appRegion: 'cn',
    cdnPath: '/api/local/blobs/',
    backendServerUrl: '/api/local',
    appTitle: 'VOXA Local',
    websiteUrl: '/',
    toCheckPermissions: false,
    sensorsTrackUrl: '',
    sensorsProjectId: 'box3',
    featureFlags: [],
  };

  return {
    props: {
      locale,
      messages,
      clientEnv,
      userInfo: clientUserInfo,
    },
  };
};

export type IndexProp = InferGetServerSidePropsType<typeof getServerSideProps>;

function Index(props: IndexProp): JSX.Element {
  const { locale, messages, clientEnv, userInfo } = props;
  const [ssrLocale, setLocale] = useState<LangType>(locale);
  const [ssrMessages, setMessages] = useState<MessagesType>(messages);

  const loadMsgOnDemand = useCallback(async () => {
    setMessages((await loadLocaleData(ssrLocale)).default);
  }, [ssrLocale]);

  const intl = useMemo(() => {
    loadMsgOnDemand();
    return createIntl({ locale: ssrLocale, messages: ssrMessages });
  }, [ssrLocale, ssrMessages, loadMsgOnDemand]);

  useMemo(() => {
    // 设置url中的token
    setToken();
    injectClientConfig(clientEnv);
  }, [clientEnv]);

  return (
    <>
      <Head>
        <title>{props.clientEnv.appTitle}</title>
      </Head>
      <ContainerNoSSR intl={intl} userInfo={userInfo} setLocale={setLocale} />
    </>
  );
}

export default Index;

/**
 * 注入clientEnv。
 * config/client.ts中的getConfig会使用。
 */
function injectClientConfig(env: ClientRuntimeConfig) {
  if (typeof window !== 'undefined') {
    window['CLIENT_CONFIG'] = { ...env };
  }
}
