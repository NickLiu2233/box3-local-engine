import { ReactNode } from 'react';
import { useClassName } from '@box-local/box-design';
import styles from './style.module.scss';

export function MotionHeader(options: {
  title: string;
  button?: ReactNode;
  className?: string;
}) {
  const { title, button, className: optionClassName } = options;

  const className = useClassName([styles.header, optionClassName]);

  return (
    <div className={className}>
      <p>{title}</p>
      {button}
    </div>
  );
}
