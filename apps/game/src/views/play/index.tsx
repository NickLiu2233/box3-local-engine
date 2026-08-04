import React, { useCallback, useRef } from 'react';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { Provider, useDispatch } from 'react-redux';

import { setHtmlFont } from 'src/utils/mobile';
import { resolve_intl } from 'src/utils/i18n';
import { MainPage } from './container';
import { store } from 'src/redux/play';
import { setUserInfo } from 'src/redux/slices/user';
import { PlayClient } from 'src/client/play/play-client';
import { PlayProvider } from 'src/client/play/play-context';
import { LoadingStage } from 'src/defs/loading-stage';
import { LangType } from 'src/apis/createra';
import { UserState } from 'src/utils/user';
import { messenger } from 'src/messenger';

type PlayUiProps = {
  userInfo: UserState | null;
  setLoadingStage: (stage: LoadingStage) => void;
  setLocale: (locale: LangType) => void;
};

const PlayUi = React.memo((props: PlayUiProps) => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const setLoadingRef = useRef(props.setLoadingStage);

  // player实例
  const [player, setPlayer] = useState<PlayClient>();

  // 初始化 PlayClient
  useEffect(() => {
    // 初始化iframe
    messenger.connect().then(() => {
      const playClient = new PlayClient();
      setPlayer(playClient);

      if (process.env.NODE_ENV === 'development') {
        window['playClient'] = playClient;
      }
    });
  }, []);

  useEffect(() => {
    if (!player) {
      return;
    }

    const setLoading = setLoadingRef.current;

    setLoading(LoadingStage.game);

    // 页面监听 GameClient 实例发生变更
    player.onGameChange.sub((gameClient) => {
      if (!gameClient) return;
      // 在 Ready 前展示 Loading 页面
      setLoading(LoadingStage.game);
    });

    player.onGameReady.sub(() => {
      setLoading(LoadingStage.close);
    });
  }, [player]);

  setHtmlFont();
  // 依赖于服务端提供的locale更新intl对象
  useEffect(() => {
    resolve_intl(intl);
  }, [intl.locale]);

  // 用户信息
  useEffect(() => {
    const userInfo = props.userInfo;
    if (userInfo) {
      dispatch(setUserInfo(userInfo));
    }
  }, [props.userInfo]);

  return player ? (
    <PlayProvider value={player}>
      <MainPage
        setLoadingStage={props.setLoadingStage}
        setLocale={props.setLocale}
      />
    </PlayProvider>
  ) : (
    <></>
  );
});

export default function (props: PlayUiProps) {
  return (
    <Provider store={store}>
      <PlayUi
        userInfo={props.userInfo}
        setLoadingStage={props.setLoadingStage}
        setLocale={props.setLocale}
      />
    </Provider>
  );
}
