import React, { useState } from 'react';
import { GraphSetting } from './graphSettings';
import { ControlSettings } from './controlSettings/index';
import { Settings } from 'src/engine/settings/settings-schema';
import { VolumeController } from './volumeController';
import { LanguageSettings } from './languageSettings';
import { usePlayer } from 'src/client/play/play-context';
import { Icon } from 'src/views/components/basic/icon';
import { intlMessage } from 'src/utils/i18n';
import style from './index.module.css';
import { LangType } from 'src/apis/createra';

export enum SettingType {
  Main,
  Graph,
  Sound,
  Control,
  Comment,
  Language,
}
type Props = {
  isPortrait: boolean;
  onClose: () => void;
  setLocale: (locale: LangType) => void;
};

export const GamePlaySettings = React.memo((props: Props) => {
  const player = usePlayer();
  const [settingType, setSettingType] = useState(SettingType.Graph);
  const [settings, setSettingData] = useState(player.state.settings);

  const setSettings = (data: Partial<Settings>) => {
    setSettingData({ ...settings, ...data });
    player.setGameSettings(data);
  };

  const navList = [
    {
      type: SettingType.Graph,
      intl: intlMessage('graphics'),
    },
    {
      type: SettingType.Sound,
      intl: intlMessage('sound'),
    },
    {
      type: SettingType.Control,
      intl: intlMessage('control'),
    },
    {
      type: SettingType.Language,
      intl: intlMessage('language'),
    },
  ];
  const getContent = () => {
    switch (settingType) {
      case SettingType.Control:
        return (
          <ControlSettings settings={settings} setGameSettings={setSettings} />
        );
      case SettingType.Sound:
        return (
          <VolumeController settings={settings} setGameSettings={setSettings} />
        );

      case SettingType.Language:
        return <LanguageSettings setLocale={props.setLocale} />;
      default:
        return (
          <GraphSetting settings={settings} setGameSettings={setSettings} />
        );
    }
  };
  return (
    <div className={style.panel_wrapper}>
      <div className={style.nav_wrapper}>
        <Icon
          icon="close-createra"
          className={style.close_btn}
          onClick={() => props.onClose()}
        />
        <div className={style.nav_bar}>
          {navList.map((item) => (
            <div
              key={item.type}
              className={`${style.nav_item} ${
                settingType === item.type && style.nav_active
              }`}
              onClick={() => setSettingType(item.type)}
            >
              {item.intl}
            </div>
          ))}
        </div>
      </div>
      <div className={style.content_wrapper}>{getContent()}</div>
    </div>
  );
});

GamePlaySettings.displayName = 'GamePlaySettings';
