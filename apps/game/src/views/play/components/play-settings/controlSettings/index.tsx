import * as React from 'react';
import { intlMessage } from 'src/utils/i18n';
import { Settings } from 'src/engine/settings/settings-schema';
import { throttle } from 'src/utils/debounce-throttle';
import { Range } from '../../basic/inputSlider';

import style from '../volumeController/index.module.css';

type Props = {
  settings: Settings;
  setGameSettings: (settings: Partial<Settings>) => void;
};

export class ControlSettings extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  private setCameraSensitivity = (v: number) => {
    const cameraSensitivity = v;
    if (isNaN(cameraSensitivity)) {
      return;
    }
    this.props.setGameSettings({
      cameraSensitivity,
    });
  };

  public render() {
    return (
      <div className={style.wrapper}>
        <div className={style.title}>
          {intlMessage('cameraSensitivity')}:{' '}
          {this.props.settings.cameraSensitivity}
        </div>
        <div className={style.rangeWrapper}>
          <Range
            value={Math.floor(this.props.settings.cameraSensitivity)}
            onValueChange={(value: number) => {
              throttle(() => this.setCameraSensitivity(+value), 50);
            }}
            step={1}
            min={0}
            max={10}
            dragEndCb={(value: number) => {
              this.setCameraSensitivity(+value);
            }}
          />
        </div>
      </div>
    );
  }
}
