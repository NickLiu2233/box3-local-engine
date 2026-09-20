import type { GetServerSideProps } from 'next';

// The management UI is an independently built Umi + Ant Design application.
// Keep it same-origin with Player Service so its HttpOnly admin session cookie
// and the existing /api/play-admin authorization policy remain unchanged.
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/player-admin/index.html',
    permanent: false,
  },
});

export default function PlayerAdminEntry() {
  return null;
}
