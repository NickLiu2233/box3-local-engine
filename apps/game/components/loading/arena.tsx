import style from './index.module.css';
import * as React from 'react';

export const ArenaBg = () => {
  return (
    <div className={style.loading}>
      <div className={style.loadingWrapper}>
        <div className={style['loading-arena']}></div>
        <div className={style.progressBar}></div>
      </div>
    </div>
  );
};
