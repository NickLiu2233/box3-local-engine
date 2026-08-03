import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useDebugValue,
} from 'react';
import { notice } from '../components/common/notice';

interface UseApiOptions<Args extends unknown[], T, S = T> {
  /**
   * 是否调用 api
   */
  enable?: boolean;
  /**
   * api 出错时是否弹出 message.error
   */
  toastError?: boolean;
  /**
   * 对 api().then 的结果执行管道
   *
   * ！！！不在依赖中, 不会响应变化
   */
  pipe?: (res: T) => S;
  /**
   * api 的参数(以 [...args] 的形式进入依赖)
   *
   * 所以通常:
   * 1. args 的参数均为基本类型时, 可以直接放到 args 参数中
   * ``` typescript
   * useApi(apis.getUserInfo, {
   *   enable: !!props.id,
   *   args: [props.id],
   * })
   * ```
   *
   * 2. args 的参数含有引用数据类型时, 应当用 useMemo / useRef 包裹(除非你确信你不要)
   * ``` typescript
   * const getUserInfoArg = useMemo(() => ({
   *   id: props.id,
   * }), [props.id])
   *
   * useApi(apis.getUserInfo, {
   *   enable: !!props.id,
   *   args: [getUserInfoArg],
   * })
   * ```
   */
  args?: Args;
}

interface UseApiReturnType<T> {
  loading: boolean;
  /**
   * api 报错消息
   */
  error: string;
  data: T | undefined;
  /**
   * 强制重新执行 api
   */
  update: () => Promise<T>;
}

function decodeOptions<Args extends unknown[], T>(
  options?: UseApiOptions<Args, T, T>,
): Required<UseApiOptions<Args, T, T>>;
function decodeOptions<Args extends unknown[], T, S>(
  options?: UseApiOptions<Args, T, S>,
): Required<UseApiOptions<Args, T, S>>;
function decodeOptions<Args extends unknown[], T, S = T>(
  options?: UseApiOptions<Args, T, S>,
) {
  const {
    enable = true,
    toastError = true,
    args = [],
    pipe = (res: T) => res,
  } = options || {};

  return {
    enable,
    toastError,
    pipe,
    args,
  };
}

export function useApi<Args extends unknown[], T>(
  factory: (...args: Args) => Promise<T>,
  options?: UseApiOptions<Args, T>,
): UseApiReturnType<T>;
export function useApi<Args extends unknown[], T, S>(
  factory: (...args: Args) => Promise<T>,
  options?: UseApiOptions<Args, T, S>,
): UseApiReturnType<S>;
export function useApi<Args extends unknown[], T, S = T>(
  factory: (...args: Args) => Promise<T>,
  options?: UseApiOptions<Args, T, S>,
): UseApiReturnType<S> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<S | undefined>();

  const { enable, toastError, pipe, args } = useMemo(
    () => decodeOptions(options),
    [options],
  );

  const update = useCallback(() => {
    if (enable && factory) {
      setError('');
      setLoading(true);
      return factory(...args)
        .then((res) => {
          const piped = pipe(res);
          setData(piped);
          return piped;
        })
        .finally(() => {
          setLoading(false);
        })
        .catch((err) => {
          setError((err as Error)?.message || '请稍后再试');
          throw err;
        });
    }
    return Promise.reject(new Error('disabled'));
    // args 以 ...args 的形式处于 dependencyList 中, 因为我们使用时就是 ...args
    // pipe 不在 DependencyList 中
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enable, factory, ...args]);

  // fetch data automatically while arguments changed
  useEffect(() => {
    update().catch((err) => {
      // pass
    });
  }, [update]);

  useEffect(() => {
    if (toastError && error) {
      notice.error(error);
    }
  }, [error, toastError]);

  const result = useMemo(
    () =>
      ({
        loading,
        error,
        data,
        /**
         * fetch data manually
         */
        update,
      } as const),
    [loading, error, data, update],
  );

  return result;
}
