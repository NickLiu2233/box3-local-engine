import React, { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '~/redux/edit';
import { CenterPanelEnum, RightNavCtrlEnum } from '~/views/edit/defs';
import { clientConfig } from '~/config/client';
import { AiCredits } from './ai-credits';
import { CreateControl } from './create-control';
import { GuestControl } from './guest-control';
import styles from './index.module.scss';
import { NavControl } from './nav-control';
import { RunControl } from './run-control';

type RightControlProps = {
  isGuest: boolean;
};

export type NavCtrlItemType = {
  id: RightNavCtrlEnum | CenterPanelEnum;
  icon: ReactNode;
  tooltip: string;
  isActive: boolean;
  handleClickItem: () => void;
};

export const RightControl = React.memo((props: RightControlProps) => {
  const { isGuest } = props;
  const { localOwner } = useSelector((state: RootState) => state.permission);
  const isLocalEngine = clientConfig.isLocalGameServer;

  return (
    <div className={`${styles.rightControl}`}>
      {!isLocalEngine && localOwner && (
        <>
          <AiCredits />
          <div
            style={{
              width: 1,
              height: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              marginRight: 16,
            }}
          />
        </>
      )}
      {!isLocalEngine && isGuest && <GuestControl />}
      {!isGuest && <CreateControl />}
      <NavControl isGuest={isGuest} />
      {!isGuest && <RunControl />}
    </div>
  );
});
