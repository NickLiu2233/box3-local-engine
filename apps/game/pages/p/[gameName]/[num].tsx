import { GetServerSideProps } from 'next';
import { ErrorProps } from '../../../components/error';
import { EngineAppProps } from '../../../components/engine-app';
import { getArenaServerRenderProps } from '../../../server/server-render';

interface SSRSuccessProps extends EngineAppProps {
  error?: never;
}

interface SSRErrorProps {
  error: ErrorProps;
}
type SSRProps = SSRSuccessProps | SSRErrorProps;

export const getServerSideProps: GetServerSideProps<SSRProps> = async (
  context,
) => {
  const cookie = context.req.headers.cookie!;
  const browserLanguage = context.req.headers['accept-language'];
  const { token } = context.query;
  return await getArenaServerRenderProps({
    containerName: context.params!['gameName'] as string,
    mode: 'play',
    cookie,
    browserLanguage,
    token: token?.toString(),
  });
};

export { default } from './index';
