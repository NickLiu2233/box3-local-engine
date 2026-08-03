import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

import { CloseType } from 'src/engine/game-client-schema';
import { intlMessage } from 'src/utils/i18n';
import defaultBanner from '../../../../assets/banner.jpg';
import style from './createra.module.css';
import { hashURL } from 'src/utils/hash-url';
import { messenger } from 'src/messenger';

export type PlayErrorProps = {
  intl: any;
  errorType: CloseType;
  cover?: string;
};

export function CreateraConnectError(props: PlayErrorProps) {
  const getErrorTypeTitleAndMessage = () => {
    const { errorType } = props;
    switch (errorType) {
      case CloseType.Max: {
        return {
          title: intlMessage('serverMax'),
          message: intlMessage('serverMaxTip'),
        };
      }
      case CloseType.Network: {
        return {
          title: intlMessage('networkError'),
          message: intlMessage('networkErrorTip'),
        };
      }
      case CloseType.Webgl: {
        return {
          title: intlMessage('webglError'),
          message: intlMessage('webglErrorTip'),
        };
      }
      case CloseType.Server:
      default: {
        return {
          title: intlMessage('serverError'),
          message: intlMessage('serverErrorTip'),
        };
      }
    }
  };

  const router = useRouter();

  const { title, message } = getErrorTypeTitleAndMessage();

  // 立即跳转，不显示错误页面
  useEffect(() => {
    if (props.errorType === CloseType.TimeRestriction) {
      router.replace('/time-restriction');
      return;
    }
  }, [props.errorType, router]);
  // 如果是时间限制错误，返回空内容（因为会立即跳转）
  if (props.errorType === CloseType.TimeRestriction) {
    return null;
  }

  return (
    <div className={style.errorWrapper}>
      <div
        className={style.background}
        style={{
          backgroundImage: `url(${
            hashURL(props.cover || '') || defaultBanner.src
          })`,
        }}
      ></div>
      <div className={style.header}></div>
      <div className={style.errorContainer}>
        <div className={style.errorTitle}>{title}</div>
        <div className={style.errorMessage}>{message}</div>
        {props.errorType !== CloseType.Webgl && (
          <div
            className={style.btn}
            onClick={() => {
              messenger.emitEvent('tapReconnect');
              location.reload();
            }}
          >
            {intlMessage('relink')}
          </div>
        )}
      </div>
    </div>
  );
}
