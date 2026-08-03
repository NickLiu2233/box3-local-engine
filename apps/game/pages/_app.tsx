import App, { AppContext, AppInitialProps, AppProps } from 'next/app';
import React from 'react';

import {
  extractServerConfigForClient,
  ServerConfigForClient,
} from '../configs/client';
import '../src/polyfill';
import './common.css';
import { SiteContextProvider } from '/src/contexts/site-context';

/**
 * 这里是为了兼容过往client config 的同步写法
 * @returns
 */
const InjectConfig: React.FC<{ config: ServerConfigForClient }> = ({
  config,
}) => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.CLIENT_CONFIG = ${JSON.stringify(config)};`,
      }}
    />
  );
};

interface AppOwnProps {
  clientConfig: ServerConfigForClient;
}

export default function MyApp({
  Component,
  clientConfig,
  pageProps,
}: AppProps & AppOwnProps) {
  return (
    <>
      {clientConfig && <InjectConfig config={clientConfig} />}
      <SiteContextProvider clientConfig={clientConfig}>
        <Component {...pageProps} />
      </SiteContextProvider>
    </>
  );
}

MyApp.getInitialProps = async (
  appContext: AppContext,
): Promise<AppOwnProps & AppInitialProps> => {
  const appProps = await App.getInitialProps(appContext);
  const serverConfig = await import('../configs/server').then(
    ({ getServerConfig }) => getServerConfig(),
  );
  const clientConfig = extractServerConfigForClient(serverConfig);

  return {
    ...appProps,
    clientConfig,
  };
};
