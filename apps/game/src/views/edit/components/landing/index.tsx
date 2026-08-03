import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Modal } from '@box-local/box-design/build/modal';
import { RootState } from 'src/redux/edit';
import { useEdit } from 'src/client/edit/edit-context';
import { handleOrientation } from 'src/utils/mobile';
import { clientConfig } from 'src/config/client';
import { messenger } from 'src/messenger';
import { sensor } from 'src/apis/sensor';
import { apis } from 'src/apis/api-java';
import { refreshNameIDMap } from 'src/views/edit/components/collaboration/transform';

interface Props {
  onStart: (spec?: { ready: () => void; close: () => void }) => void;
}

let modalDestroy: () => void | undefined;

export const EditLandingPage = (props: Props) => {
  const { onStart } = props;
  const editor = useEdit();
  const intl = useIntl();
  const userinfo = useSelector((state: RootState) => state.user);
  const { contentId } = clientConfig.mapInfo;
  const isLocalEngine = clientConfig.isLocalGameServer;

  let inviteLinkGroup = useRef<string>('');
  const clickStartBtn = useCallback(() => {
    if (!isLocalEngine && userinfo.id && userinfo.banEditor) {
      modalDestroy = Modal.show({
        title: intl.formatMessage({ id: 'cannotAccess' }),
        confirmText: intl.formatMessage({ id: 'backToWebsite' }),
        onConfirm: () => messenger.jumpTo({ url: clientConfig.WEBSITE_URL }),
        width: 448,
        content: intl.formatMessage({ id: 'accountEditPermissionBanned' }),
        rootStyle: { zIndex: 10000 },
      });
    } else {
      if (
        !isLocalEngine &&
        !userinfo.id &&
        process.env.NODE_ENV !== 'development'
      ) {
        messenger.jumpTo({
          url: `${clientConfig.WEBSITE_URL}/login`,
          isLoginBack: true,
        });
        return;
      }
      if (!isLocalEngine) {
        sensor.arenaEnterClick();
      }
      let interval: number = -1;
      handleOrientation('game', editor.logger);
      if (!isLocalEngine) {
        editor.game.state.joinAsCollaborator = true;
      }
      onStart({
        ready: () => {
          if (isLocalEngine) {
            return;
          }
          const mode = clientConfig.mode;
          sensor.arenaEnter();
          // Edit mode: guest id is unnecessary.
          apis.createra.online({
            contentId,
            mode,
          });
          interval = window.setInterval(() => {
            apis.createra.online({
              contentId,
              mode,
            });
          }, 60 * 1000);
        },
        close: () => {
          window.clearInterval(interval);
        },
      });
    }
  }, [userinfo, contentId, editor, intl, isLocalEngine, onStart]);

  useEffect(() => {
    if (isLocalEngine) {
      clickStartBtn();
      return () => {
        modalDestroy && modalDestroy();
      };
    }

    const url = new URL(window.location.href);
    const searchParams = url.search;
    const params = new URLSearchParams(searchParams);
    if (params.get('p') && userinfo.id > 0) {
      editor.replica.onInviteGroupChange.sub(async (status) => {
        if (status === 'ready') {
          try {
            // 在这里调用传token的接口后，调用addCollaborator
            const res = await apis.collaboration.addMemberUsingPost({
              mapId: contentId + '',
              ticket: params.get('p') ?? '',
              userId: userinfo.id.toString(),
            });
            if (res?.name) {
              editor.game.state.inviteLinkGroup = res.name;
              inviteLinkGroup.current = res.name;
              editor.permissionController.addCollaborator(
                userinfo.id.toString(),
                inviteLinkGroup.current,
              );
              refreshNameIDMap(contentId + '');
            }
          } catch (e) {
            console.error(`invite ticket error: ${e.msg}`);
          }
        }
        clickStartBtn();
      });
    } else {
      clickStartBtn();
    }
    return () => {
      modalDestroy && modalDestroy();
    };
  }, [clickStartBtn, contentId, editor, isLocalEngine, userinfo]);

  return <></>;
};
