import React from 'react';
import Image from 'next/legacy/image';
import img404 from '../../assets/404-cover.png';
import style from './index.module.css';

export function PageNotFound() {
  return (
    <div className={style.wrapper}>
      <div className={style.imgWrapper}>
        <Image src={img404} alt="" layout="responsive" />
      </div>

      <p>Oops, page not found!</p>
    </div>
  );
}
