import React, { useState, useCallback, useContext, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Activity, ExternalLink, RefreshCw } from 'lucide-react';
import { Settings } from 'src/engine/settings/settings-schema';

import { DetailPanel } from '../detailPanel';
import { VolumeController } from '../volumeController';
import { GraphSetting } from 'src/views/components/edit/settingPanel/graphicSetting';
import { KeyBinding } from 'src/views/components/edit/settingPanel/keybind';
import { RadioBtn } from 'src/views/components/basic/radioBtn';
import { NumberProperty } from 'src/views/components/edit/property';
import { isMobile, isTablet } from 'src/utils/mobile';
import { RootState } from 'src/redux/edit';
import { LangType, setUserLanguage } from 'src/apis/createra';
import { setCookies } from 'src/utils/cookie';
import style from './index.module.scss';
import { createExpires } from 'src/utils/date';
import { useEdit } from 'src/client/edit/edit-context';
import { ArenaEditorUIContext } from '../../editor-ui-context';
import { clientConfig } from 'src/config/client';

type Props = {
  closeModal: () => void;
  setLocale: (locale: LangType) => void;
};

type RuntimeSummary = {
  status: 'healthy' | 'warning';
  checkedAt: string;
  creator: { detail: string; version: string; nodeVersion: string; uptimeSeconds: number };
  services: Array<{ id: string; name: string; state: 'healthy' | 'warning' | 'unhealthy' | 'disabled'; detail: string; latencyMs?: number }>;
  projects: {
    runtimes: Array<{
      projectId: string;
      edit: RuntimeItemStatus;
      play: RuntimeItemStatus;
    }>;
  };
  diagnostics: Array<{ source: string; message: string }>;
};

type RuntimeItemStatus = { phase: string; percent: number; message: string; pid?: number; port?: number };

function RuntimeStatusPanel({ projectId }: { projectId: string }) {
  const intl = useIntl();
  const [data, setData] = useState<RuntimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch('/api/system/status', { cache: 'no-store' });
      const next = await response.json();
      if (!response.ok) throw new Error(next.message || intl.formatMessage({ id: 'runtimeStatusLoadFailed' }));
      setData(next);
      setError('');
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const runtime = data?.projects.runtimes.find((item) => item.projectId === projectId);
  const phaseLabel = (phase: string) => intl.formatMessage({
    id: phase === 'ready'
      ? 'runtimeStatusReady'
      : phase === 'starting' || phase === 'loading'
      ? 'runtimeStatusStarting'
      : phase === 'error' || phase === 'unavailable'
      ? 'runtimeStatusError'
      : 'runtimeStatusIdle',
  });
  const phaseClass = (phase: string) => phase === 'ready'
    ? style.runtimeHealthy
    : phase === 'starting' || phase === 'loading'
    ? style.runtimeWarning
    : phase === 'error' || phase === 'unavailable'
    ? style.runtimeUnhealthy
    : style.runtimeDisabled;
  const runtimeCard = (label: string, status?: RuntimeItemStatus) => (
    <div className={style.runtimeCard}>
      <div className={style.runtimeCardHeader}>
        <strong>{label}</strong>
        <span className={`${style.runtimeBadge} ${phaseClass(status?.phase || 'idle')}`}>
          {phaseLabel(status?.phase || 'idle')}
        </span>
      </div>
      <p>{status?.message || intl.formatMessage({ id: 'runtimeStatusWaiting' })}</p>
      {(status?.phase === 'starting' || status?.phase === 'loading') && (
        <div className={style.runtimeProgress}><span style={{ width: `${Math.max(4, status.percent)}%` }} /></div>
      )}
      <small>
        {[status?.pid ? `PID ${status.pid}` : '', status?.port ? `${intl.formatMessage({ id: 'runtimeStatusPort' })} ${status.port}` : ''].filter(Boolean).join(' · ') || '—'}
      </small>
    </div>
  );

  return (
    <div className={style.runtimeStatusContainer}>
      <div className={style.runtimeStatusHeader}>
        <div>
          <span className={`${style.runtimeStatusDot} ${data?.status === 'warning' ? style.runtimeStatusDotWarning : ''}`} />
          <strong>{data?.status === 'warning'
            ? intl.formatMessage({ id: 'runtimeStatusNeedsAttention' })
            : intl.formatMessage({ id: 'runtimeStatusNormal' })}</strong>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} aria-label={intl.formatMessage({ id: 'runtimeStatusRefresh' })}>
          <RefreshCw size={14} className={loading ? style.runtimeSpin : ''} />
          {intl.formatMessage({ id: 'runtimeStatusRefresh' })}
        </button>
      </div>

      {error && <div className={style.runtimeStatusError}>{error}</div>}

      <div className={style.runtimeStatusSectionTitle}>{intl.formatMessage({ id: 'runtimeStatusCreator' })}</div>
      <div className={style.creatorStatusCard}>
        <span className={style.runtimeStatusDot} />
        <div><strong>{data?.creator.detail || intl.formatMessage({ id: 'runtimeStatusChecking' })}</strong><small>{data?.creator ? `Local Engine ${data.creator.version} · ${data.creator.nodeVersion}` : '—'}</small></div>
      </div>

      <div className={style.runtimeStatusSectionTitle}>{intl.formatMessage({ id: 'runtimeStatusCurrentProject' })}</div>
      <div className={style.runtimeCardGrid}>
        {runtimeCard(intl.formatMessage({ id: 'runtimeStatusEdit' }), runtime?.edit)}
        {runtimeCard(intl.formatMessage({ id: 'runtimeStatusPlay' }), runtime?.play)}
      </div>

      <div className={style.runtimeStatusSectionTitle}>{intl.formatMessage({ id: 'runtimeStatusDependencies' })}</div>
      <div className={style.runtimeServiceList}>
        {data?.services.map((service) => (
          <div key={service.id}>
            <span className={`${style.runtimeStatusDot} ${
              service.state === 'healthy' ? '' : service.state === 'disabled' ? style.runtimeStatusDotDisabled : style.runtimeStatusDotWarning
            }`} />
            <strong>{service.name}</strong>
            <small>{service.detail}{service.latencyMs !== undefined ? ` · ${service.latencyMs} ms` : ''}</small>
          </div>
        )) || <div className={style.runtimeStatusLoading}>{intl.formatMessage({ id: 'runtimeStatusChecking' })}</div>}
      </div>

      {!!data?.diagnostics.length && (
        <div className={style.runtimeStatusDiagnostics}>
          {data.diagnostics.slice(0, 4).map((item, index) => <p key={`${item.source}:${index}`}><strong>{item.source}</strong>{item.message}</p>)}
        </div>
      )}

      <a className={style.runtimeStatusLink} href="/system" target="_blank" rel="noreferrer">
        {intl.formatMessage({ id: 'runtimeStatusOpenFull' })}<ExternalLink size={13} />
      </a>
      {data?.checkedAt && <div className={style.runtimeStatusChecked}>{intl.formatMessage({ id: 'runtimeStatusLastChecked' })}：{new Date(data.checkedAt).toLocaleTimeString()}</div>}
    </div>
  );
}

export const SettingPanel = (props: Props) => {
  const editor = useEdit();
  const { replica } = useContext(ArenaEditorUIContext);
  const userId = useSelector((state: RootState) => state.user.id);
  const intl = useIntl();
  const [settings, setSettingData] = useState(editor.game.state.settings);

  const setSettings = useCallback(
    (data: Partial<Settings>) => {
      setSettingData({ ...settings, ...data });
      editor.setGameSettings(data);
    },
    [editor, settings],
  );

  const setGraph = useCallback(
    (data: Partial<Settings>) => {
      setSettings(data);
    },
    [setSettings],
  );

  const changeLanguage = useCallback(
    async (lang: LangType) => {
      if (userId) {
        // 已登陆用户:后端-修改用户语言环境
        await setUserLanguage(lang);
      } else {
        // 游客:本地-修改cookie
        setCookies('locale', lang, { expires: createExpires(1) });
      }
      props.setLocale(lang);
      setSettings({ language: lang });
    },
    [props, setSettings, userId],
  );

  const _renderGraph = useCallback(() => {
    return <GraphSetting settings={settings} setGameSettings={setGraph} />;
  }, [setGraph, settings]);

  const _renderControl = useCallback(() => {
    return (
      <div className={style.container}>
        <NumberProperty
          name={intl.formatMessage({ id: 'cameraSensitivity' })}
          value={settings.cameraSensitivity}
          onChange={(e) => {
            const cameraSensitivity = +e;
            if (isNaN(cameraSensitivity)) {
              return;
            }
            setSettings({
              cameraSensitivity,
            });
          }}
          slider={[0.01, 3]}
        />
        {!isMobile() ? (
          <KeyBinding inputController={editor.game.input} />
        ) : null}
      </div>
    );
  }, [editor.game.input, intl, setSettings, settings.cameraSensitivity]);
  const _renderVolumeControl = useCallback(() => {
    return (
      <VolumeController settings={settings} setGameSettings={setSettings} />
    );
  }, [setSettings, settings]);
  const _renderLanguage = useCallback(() => {
    return (
      <div>
        <div className={style.radioContainer}>
          <RadioBtn
            checked={intl.locale === 'zh'}
            onChange={() => changeLanguage('zh')}
            text={'简体中文'}
          />
        </div>
        <div className={style.radioContainer}>
          <RadioBtn
            checked={intl.locale === 'en'}
            onChange={() => changeLanguage('en')}
            text={'English'}
          />
        </div>
      </div>
    );
  }, [changeLanguage, intl.locale]);

  const _renderAbout = useCallback(() => {
    const runtime = clientConfig.localRuntimeInfo;
    const dataStorage =
      runtime?.dataStorageBackend === 'postgres'
        ? intl.formatMessage({ id: 'aboutPostgresStorage' })
        : intl.formatMessage({ id: 'aboutLocalFileStorage' });
    const configured = (value?: boolean) =>
      intl.formatMessage({
        id: value ? 'aboutConfigured' : 'aboutNotConfigured',
      });
    const item = (title: string, content: React.ReactNode) => (
      <div className={style.item}>
        <div className={style.title}>{title}</div>
        <div className={style.content}>{content}</div>
      </div>
    );
    const serviceState = (value?: boolean) => (
      <span
        className={`${style.status} ${
          value ? style.statusEnabled : style.statusDisabled
        }`}
      >
        {configured(value)}
      </span>
    );

    return (
      <div className={style.aboutContainer}>
        <div className={style.sectionTitle}>
          {intl.formatMessage({ id: 'aboutRuntimeSection' })}
        </div>
        <div className={style.itemWrapper}>
          {item(
            intl.formatMessage({ id: 'aboutLocalEngineVersion' }),
            `v${runtime?.productVersion || '0.1.0'}`,
          )}
          {item(
            intl.formatMessage({ id: 'aboutProjectFormatVersion' }),
            `v${replica.project.version}`,
          )}
          {item(
            intl.formatMessage({ id: 'aboutRuntime' }),
            runtime?.nodeVersion ? `Node.js ${runtime.nodeVersion}` : 'Web',
          )}
          {item(
            intl.formatMessage({ id: 'aboutEdition' }),
            clientConfig.APP_EDITION || 'createra',
          )}
        </div>

        <div className={style.sectionTitle}>
          {intl.formatMessage({ id: 'aboutProjectSection' })}
        </div>
        <div className={style.itemWrapper}>
          {item(
            intl.formatMessage({ id: 'aboutProjectName' }),
            clientConfig.mapInfo?.name || clientConfig.name || '-',
          )}
          {item(
            intl.formatMessage({ id: 'aboutProjectId' }),
            clientConfig.name || '-',
          )}
          {item(
            intl.formatMessage({ id: 'aboutRunningMode' }),
            intl.formatMessage({ id: 'aboutLocalEditMode' }),
          )}
          {item(
            intl.formatMessage({ id: 'databaseEngine' }),
            replica.project.storageMode === 'pg' ? 'PostgreSQL' : 'SQLite',
          )}
          {item(intl.formatMessage({ id: 'aboutDataStorage' }), dataStorage)}
        </div>

        {runtime && (
          <>
            <div className={style.sectionTitle}>
              {intl.formatMessage({ id: 'aboutServicesSection' })}
            </div>
            <div className={`${style.itemWrapper} ${style.lastItemWrapper}`}>
              {item('VOXA', serviceState(runtime.voxaConfigured))}
              {item(
                'Redis',
                runtime.redisConfigured ? (
                  <span className={`${style.status} ${style.statusEnabled}`}>
                    {intl.formatMessage(
                      { id: 'aboutRedisConfigured' },
                      {
                        businessDb: runtime.redisBusinessDb,
                        cacheDb: runtime.redisCacheDb,
                      },
                    )}
                  </span>
                ) : serviceState(false),
              )}
            </div>
          </>
        )}
      </div>
    );
  }, [intl, replica.project.storageMode, replica.project.version]);

  return (
    <DetailPanel
      className={style.settingPanel}
      onClose={props.closeModal}
      contentWrapperStyle={{ overflowY: 'scroll' }}
      contentList={[
        {
          title: intl.formatMessage({ id: 'graphics' }),
          content: _renderGraph,
          tab: <div className={style.graphIcon}></div>,
          contentContainerStyle: { width: '448px' },
        },
        {
          title: intl.formatMessage({ id: 'control' }),
          content: _renderControl,
          tab: <div className={style.controlIcon}></div>,
          borderRadius: !isMobile() ? true : undefined,
          contentContainerStyle: { width: '448px' },
        },
        {
          title: intl.formatMessage({ id: 'sound' }),
          content: _renderVolumeControl,
          tab: <div className={style.volumeIcon}></div>,
          contentContainerStyle: { width: '448px' },
        },
        {
          title: intl.formatMessage({ id: 'language' }),
          content: _renderLanguage,
          tab: <div className={style.languageIcon}></div>,
          contentContainerStyle: { width: '448px' },
        },
        {
          title: intl.formatMessage({ id: 'runtimeStatusTitle' }),
          content: () => <RuntimeStatusPanel projectId={clientConfig.name || ''} />,
          tab: <Activity className={style.runtimeStatusIcon} size={19} />,
          contentContainerStyle: { width: '448px' },
        },
        {
          title: intl.formatMessage({ id: 'about' }),
          content: () => _renderAbout(),
          tab: <div className={style.aboutIcon}></div>,
          contentContainerStyle: { width: '448px' },
        },
      ]}
    />
  );
};
