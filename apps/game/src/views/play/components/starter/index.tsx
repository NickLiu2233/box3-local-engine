import React, { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { clientConfig } from 'src/config/client';
import { handleOrientation, isMobile } from 'src/utils/mobile';
import { CloseType } from 'src/engine/game-client-schema';
import { sensor } from 'src/apis/sensor';

import { apis } from 'src/apis/api-java';
import { messenger } from 'src/messenger';

import { usePlayer } from 'src/client/play/play-context';
import { RootState } from 'src/redux/play';
import type { EngineStatus } from '../../container';
import { getQueryParam } from 'src/utils/url-helpers';
import { getFingerprint } from 'src/utils/fingerprint';

type CreateraStartEntryProps = {
  setEngineStatus: React.Dispatch<React.SetStateAction<EngineStatus>>;
  setCloseError: React.Dispatch<React.SetStateAction<CloseType>>;
};

export const StarterPage = React.memo((props: CreateraStartEntryProps) => {
  const player = usePlayer();
  const userInfo = useSelector((state: RootState) => state.user);
  const isLoggedIn = userInfo.id > 0;

  const startEngine = useCallback(
    (ready?: () => void, close?: () => void) => {
      props.setEngineStatus('loading');

      player.start({
        ready: () => {
          sensor.mapEnter(isLoggedIn);
          ready && ready();
          props.setEngineStatus('started');
        },
        frame: () => {},
        close: (error: CloseType) => {
          props.setCloseError(error);
          props.setEngineStatus('stop');
          close && close();
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoggedIn],
  );

  useEffect(() => {
    if (
      clientConfig.isLocalGameServer ||
      process.env.NODE_ENV === 'development'
    ) {
      startEngine(
        () => {
          isMobile() && handleOrientation('game', player.logger);
        },
        () => {},
      );
      return;
    }
    const playClick = (isLoggedIn: boolean) => {
      apis.createra
        .isLoginAsGuest(clientConfig.mapInfo.contentId)
        .then((data) => {
          if (!isLoggedIn && !data.value) {
            messenger.jumpTo({
              url: `${clientConfig.WEBSITE_URL}/login`,
              isNewTab: false,
              isLoginBack: true,
            });
          } else {
            if (player.clickedStart) {
              return;
            }
            let interval: number = -1;
            startEngine(
              async () => {
                isMobile() && handleOrientation('game', player.logger);
                sensor.mapEnter(isLoggedIn);
                const { visitorId } = await getFingerprint();
                const guestId = isLoggedIn ? undefined : visitorId;
                const mode = clientConfig.mode;
                apis.createra.online({
                  contentId: clientConfig.mapInfo.contentId,
                  guestId,
                  mode,
                });
                interval = window.setInterval(() => {
                  apis.createra.online({
                    contentId: clientConfig.mapInfo.contentId,
                    guestId,
                    mode,
                  });
                }, 60 * 1000);
              },
              () => {
                window.clearInterval(interval);
              },
            );
          }
        })
        .catch((e) => {});
    };
    const autoEntry = getQueryParam('autoPlay');

    if (autoEntry !== 'false') {
      playClick(isLoggedIn);
    }
    apis.user.viewCount(clientConfig.mapInfo.contentId).catch((err) => {
      console.log('viewCount: ', err);
    });
    messenger.messageTool.eventOn('startPlay', () => {
      playClick(isLoggedIn);
    });
  }, [isLoggedIn]);

  return <></>;
});
