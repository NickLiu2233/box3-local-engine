import type { QueryVersionResponse, VersionInfo } from '@box-local/recovery-schema';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './recovery.module.css';
import { useSiteContext } from '/src/contexts/site-context';

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.BOX_DEPLOYMENT_MODE === 'play') {
    return { notFound: true };
  }
  return { props: {} };
};

const RecoveryPage: React.FC = () => {
  const router = useRouter();
  const { mapId } = router.query;
  const { clientConfig } = useSiteContext();

  const [jobId, setJobId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(
    null,
  );
  const [status, setStatus] = useState<string>('正在初始化...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [restoredVersionId, setRestoredVersionId] = useState<number | null>(
    null,
  );
  const [restoredCreatedAt, setRestoredCreatedAt] = useState<string | null>(
    null,
  );
  // 选中的版本（用于控制按钮显示）
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    null,
  );
  // 回滚后展示的描述
  const [restoredDescription, setRestoredDescription] = useState<string | null>(
    null,
  );

  const apiBaseUrl = useMemo(() => {
    return `${clientConfig.ENGINE_APIS_URL}/recovery/v1`;
  }, [clientConfig.ENGINE_APIS_URL]);

  useEffect(() => {
    if (!mapId) return;

    const startRecoveryProcess = async () => {
      try {
        setStatus('正在创建版本检查任务...');
        const id = Array.isArray(mapId) ? mapId[0] : mapId?.toString();
        if (!id) return;
        // 1. 创建版本检查任务
        const res = await fetch(`${apiBaseUrl}/maps/${id}/query-versions`, {
          method: 'POST',
          credentials: 'include',
        });

        // 未登录场景：提示用户先登录
        if (res.status === 401) {
          setError('未登录，请先登录后再进行恢复');
          setStatus('无法创建版本检查任务');
          return;
        }

        if (res.status === 403) {
          setError('权限不足，请联系图主进行恢复');
          setStatus('无法创建版本检查任务');
          return;
        }

        if (!res.ok) {
          throw new Error('创建版本检查任务失败');
        }

        // 读取后端返回的 jobId（现包含前缀，避免 BullMQ 纯数字 ID 限制）
        const { jobId: newJobId } = await res.json();
        setJobId(newJobId);
        setStatus('获取可用版本列表中...');
      } catch (err) {
        setError((err as Error).message);
        setStatus('可用版本列表获取失败');
      }
    };

    startRecoveryProcess();
  }, [mapId, apiBaseUrl]);

  useEffect(() => {
    if (!jobId || !mapId) return;

    // 2. 监听SSE事件
    const eventSource = new EventSource(
      `${apiBaseUrl}/maps/${mapId}/query-versions-response/${jobId}`,
      {
        withCredentials: true,
      },
    );

    eventSource.addEventListener('complete', (event) => {
      const message = JSON.parse(event.data) as QueryVersionResponse;
      setCurrentVersion(message.currentVersion);
      setVersions(message.recoverableVersions);
      setStatus('版本列表加载完成');
      setProgress(100);
      eventSource.close();
    });

    eventSource.onerror = (e) => {
      console.error('EventSource failed:', e);
      setError('与服务器的连接断开');
      setStatus('连接错误');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, mapId, apiBaseUrl]);

  // 当版本列表加载完成后，默认选中最新（id 最大）的一个版本
  useEffect(() => {
    if (versions.length > 0 && selectedVersionId === null) {
      setSelectedVersionId(versions[0].id);
    }
  }, [versions, selectedVersionId]);

  const handleRollback = async (versionId: number) => {
    if (!mapId) return;
    // 按需隐藏版本ID，使用中性描述
    setStatus('正在回滚到所选版本...');
    setIsRollingBack(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/maps/${mapId}/versions/${versionId}/rollback`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (res.status === 401) {
        setError('当前账号无权限，请联系图主进行恢复');
        setStatus('权限不足，无法执行回滚');
        setIsRollingBack(false);
        return;
      }

      if (!res.ok) {
        throw new Error('回滚失败');
      }

      // 成功：卡片内提示 + 5 秒后返回上一页
      setStatus('回滚成功，5 秒后返回上一页');
      setRestoredVersionId(versionId);
      const matched = versions.find((it) => it.id === versionId);
      setRestoredCreatedAt(matched ? matched.createdAt : null);
      setRestoredDescription(
        matched && matched.notice && matched.notice.trim()
          ? matched.notice
          : '(无描述)',
      );
      let remain = 5;
      setCountdown(remain);
      timerRef.current = setInterval(() => {
        remain -= 1;
        setCountdown(remain);
        if (remain <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          router.back();
        }
      }, 1000);
    } catch (err) {
      setError((err as Error).message);
      setStatus('回滚操作失败');
      setIsRollingBack(false);
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  // 页面卸载时清理计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const mapIdStr = Array.isArray(mapId) ? mapId[0] : mapId?.toString() || '';

  return (
    <div className={styles.container}>
      <div className={`${styles.card} bg-white bordered rounded-16`}>
        <div className={styles.iconContainer}>
          <div className={styles.iconWrapper}>
            <svg
              className={styles.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h5M5 9a7 7 0 115.93 8.94"
              />
            </svg>
          </div>
        </div>

        <h1 className={styles.title}>地图版本恢复</h1>
        {mapIdStr && (
          <div className={styles.itemSub} style={{ marginBottom: 8 }}>
            Map ID：{mapIdStr}
          </div>
        )}
        <p className={styles.description}>
          {countdown !== null && status.includes('回滚成功')
            ? `${status}（${countdown} 秒）`
            : status}
        </p>

        {progress > 0 && progress < 100 && (
          <div className={styles.progressContainer} aria-label="加载进度">
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        {currentVersion && restoredVersionId === null && (
          <div className={styles.versionSection}>
            <h2 className={styles.sectionTitle}>当前版本</h2>
            <div className={styles.versionItem}>
              <div className={styles.itemMeta}>
                <div
                  className={styles.itemTitle}
                  title={
                    currentVersion.notice && currentVersion.notice.trim()
                      ? currentVersion.notice
                      : undefined
                  }
                >
                  {currentVersion.notice && currentVersion.notice.trim() ? (
                    currentVersion.notice
                  ) : (
                    <span className={styles.placeholder}>(无描述)</span>
                  )}
                </div>
                <div
                  className={styles.itemSub}
                  title={new Date(currentVersion.createdAt).toLocaleString()}
                >
                  {new Date(currentVersion.createdAt).toLocaleString()}
                </div>
              </div>
              <span className={`${styles.chip} ${styles.chipSuccess}`}>
                当前
              </span>
            </div>
          </div>
        )}

        {versions.length > 0 && restoredVersionId === null && (
          <div className={styles.versionSection}>
            <h2 className={styles.sectionTitle}>可恢复的版本</h2>
            <ul className={styles.versionList}>
              {versions.map((v) => {
                const isSelected = selectedVersionId === v.id;
                const hasDesc = v.notice && v.notice.trim();
                return (
                  <li
                    key={v.id}
                    className={`${styles.versionItem} ${styles.clickable} ${
                      isSelected ? styles.selected : ''
                    }`}
                    onClick={() => setSelectedVersionId(v.id)}
                    aria-selected={isSelected}
                  >
                    <div className={styles.itemMeta}>
                      <div
                        className={styles.itemTitle}
                        title={hasDesc ? v.notice : undefined}
                      >
                        {hasDesc ? (
                          v.notice
                        ) : (
                          <span className={styles.placeholder}>(无描述)</span>
                        )}
                      </div>
                      <div
                        className={styles.itemSub}
                        title={new Date(v.createdAt).toLocaleString()}
                      >
                        {new Date(v.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      className={`${styles.chip} ${styles.actionBtn}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRollback(v.id);
                      }}
                      aria-label={`回滚到该版本`}
                      disabled={isRollingBack || countdown !== null}
                    >
                      回滚
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {restoredVersionId !== null && (
          <div className={styles.versionSection}>
            <h2 className={styles.sectionTitle}>已恢复到的版本</h2>
            <div className={styles.versionItem}>
              <div className={styles.itemMeta}>
                <div
                  className={styles.itemTitle}
                  title={restoredDescription ?? undefined}
                >
                  {restoredDescription ? (
                    restoredDescription
                  ) : (
                    <span className={styles.placeholder}>(无描述)</span>
                  )}
                </div>
                <div
                  className={styles.itemSub}
                  title={
                    restoredCreatedAt
                      ? new Date(restoredCreatedAt).toLocaleString()
                      : undefined
                  }
                >
                  {restoredCreatedAt
                    ? new Date(restoredCreatedAt).toLocaleString()
                    : '时间未知'}
                </div>
              </div>
              <span className={`${styles.chip} ${styles.chipSuccess}`}>
                已恢复
              </span>
            </div>
          </div>
        )}

        {progress === 100 &&
          versions.length === 0 &&
          restoredVersionId === null && (
            <div className={styles.versionSection}>
              <h2 className={styles.sectionTitle}>可恢复的版本</h2>
              <div className={styles.empty}>暂无可回滚的历史版本</div>
            </div>
          )}

        {restoredVersionId === null && (
          <button onClick={handleGoHome} className={styles.primaryBtn}>
            返回首页
          </button>
        )}
      </div>
    </div>
  );
};
export default RecoveryPage;
