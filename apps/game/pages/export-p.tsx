import React, { useEffect, useState } from 'react';
import { GetStaticProps } from 'next';
import { getQueryParam } from 'src/utils/url-helpers';
import { getServerConfig } from 'configs/server';
import {
  extractServerConfigForClient,
  ServerConfigForClient,
} from 'configs/client';
import Home, { SSRProps } from './p/[gameName]';

export const getStaticProps: GetStaticProps = async () => {
  const serverConfig = await getServerConfig();
  const extractedConfig = extractServerConfigForClient(serverConfig);
  return {
    props: extractedConfig,
  };
};

export default function Main(props: ServerConfigForClient) {
  const [config, setConfig] = useState<SSRProps>({ loadingConfig: true });

  const getClientConfig = async () => {
    const token = getQueryParam('token');
    const gameName = getQueryParam('hash');
    const response = await fetch(
      `${props.ARENA_URL}/api/config/play/${gameName}`,
      {
        headers: {
          authorization: token,
        },
        credentials: 'include',
      },
    );

    const config = await response.json();
    return config;
  };

  useEffect(() => {
    getClientConfig()
      .then((config) => {
        setConfig(config);
      })
      .catch((err) => {
        setConfig(err);
      });
  }, []);

  return <Home {...config} />;
}
