import type { GetStaticProps } from 'next';
import { useEffect } from 'react';

export const getStaticProps: GetStaticProps = () => {
  // 仅在本地调试可访问该页面
  return { props: {}, notFound: process.env.NODE_ENV !== 'development' };
};

export default function App() {
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    document.body.addEventListener('contextmenu', preventDefault);

    return () => {
      document.body.removeEventListener('contextmenu', preventDefault);
    };
  }, []);
  return (
    <>
      <script src="/dist/play-client/main.js" />
    </>
  );
}
