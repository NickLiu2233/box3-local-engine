import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { Parent, create, EventsType, ErrorType } from '@box-local/sdk';
import { Toast, ModalView } from '@box-local/box-design';
import { ModelMetaData } from '@box-local/voxa-project';
import { ModelResp, ModelType } from '@box-local/apis';
import { useEdit } from 'src/client/edit/edit-context';

import { clientConfig } from 'src/config/client';
import { RootState } from 'src/redux/edit';
import { refreshSkinsList } from '../player-manager';
import { EditType, setVoxaData } from 'src/redux/edit/creator';

import style from './index.module.css';
import { setSelectedModel } from 'src/redux/edit/ui';
import { getToken } from 'src/utils/token';

interface HandleEvents extends EventsType {
  onClickClose: {
    modelChanged: boolean;
  };
  onClickSave: {
    modelChanged: boolean;
    modelName: string;
  };
  save: {
    isSuccess: boolean;
    modelResp: ModelResp;
    modelType: ModelType;
    modelMetaData?: ModelMetaData;
  };
}

interface EmitEvents extends EventsType {
  save: {
    /**
     * 保存时如果与现有项目内重名
     * 发送自动生成的新名字
     */
    modelName?: string;
  };
}

enum ReconfirmType {
  Close = 'close',
  Save = 'save',
}

const ReconfirmModalConfig = {
  [EditType.Normal]: {
    [ReconfirmType.Save]: {
      title: 'voxa.saveModel',
      content: 'voxa.confirmSaveModel',
    },
    [ReconfirmType.Close]: {
      title: 'voxa.unsavedModel',
      content: 'voxa.confirmQuit',
    },
  },
  [EditType.Skin]: {
    [ReconfirmType.Save]: {
      title: 'voxa.saveSkin',
      content: 'voxa.confirmSaveSkin',
    },
    [ReconfirmType.Close]: {
      title: 'voxa.unsavedSkin',
      content: 'voxa.confirmQuit',
    },
  },
};
/**
 * Voxa 编辑器
 */
export function VoxaPanel() {
  const editor = useEdit();
  const intl = useIntl();
  const dispatch = useDispatch();
  const timer = useRef(-1);
  const iframeEl = useRef<HTMLDivElement | null>(null);
  const iframe = useRef<Parent<HandleEvents, EmitEvents>>(undefined);
  const { modelId, modelType, editType } = useSelector((state: RootState) => {
    if (state.creator.voxaData.isShow) {
      return state.creator.voxaData;
    }
    return {
      ...state.creator.voxaData,
      modelId: 0,
      modelType: ModelType.Project,
      editType: EditType.Normal,
    };
  });

  const selectedModel = useSelector((state: RootState) => {
    return state.ui.selectedModel;
  });
  const mapId = clientConfig.mapInfo.contentId;
  const voxaURL = useMemo(() => {
    const queries: string[] = ['parentType=engine'];
    const token = getToken();
    if (token) {
      queries.push(`token=${token}`);
    }

    if (modelId) {
      queries.push(`modelId=${modelId}`);
    } else {
      queries.push(`modelType=${modelType}`);
    }
    if (editType) {
      queries.push(`editType=${editType}`);
    }
    if (
      (editType === EditType.Skin && modelType === ModelType.ExtensionLib) ||
      (editType === EditType.Normal && modelType === ModelType.Project)
    ) {
      queries.push(`mapId=${mapId}`);
    }
    return `${clientConfig.VOXA_URL}/?${queries.join('&')}`;
  }, [editType, mapId, modelId, modelType]);

  const [show, setShow] = useState<boolean>(false);
  const [reconfirmType, setReconfirmType] = useState<ReconfirmType | undefined>(
    undefined,
  );
  const voxaModelId = useRef<number>(0);

  const showVoxa = useCallback(() => {
    clearTimeout(timer.current);
    setShow(true);
  }, []);

  const closeVoxa = useCallback(
    (error?: boolean) => {
      if (error) {
        Toast.error({
          content: intl.formatMessage({ id: 'voxa.launchErrorTitle' }),
          description: intl.formatMessage({ id: 'voxa.launchErrorDetail' }),
        });
      }
      clearTimeout(timer.current);
      dispatch(
        setVoxaData({
          isShow: false,
        }),
      );
    },
    [dispatch, intl],
  );

  useEffect(() => {
    // time out
    timer.current = window.setTimeout(() => {
      closeVoxa(true);
    }, 1000 * 10);
    return () => clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    voxaModelId.current = modelId;

    iframe.current = create<HandleEvents, EmitEvents>({
      type: 'voxa',
      url: voxaURL,
    });
    iframe.current.init({
      dom: iframeEl.current!,
    });
    iframe.current.eventOn('onClickClose', (value) => {
      value.modelChanged ? setReconfirmType(ReconfirmType.Close) : closeVoxa();
    });

    iframe.current.eventOn('onClickSave', (value) => {
      // 创建新模型/新皮肤 或 编辑模型/皮肤时无改动: 无需二次确认
      if (voxaModelId.current === 0 || !value.modelChanged) {
        iframe.current?.emitEvent('save');
        return;
      }
      // 有改动:需要二次确认
      setReconfirmType(ReconfirmType.Save);
      return;
    });

    iframe.current.eventOn('loaded', () => {
      showVoxa();
    });

    iframe.current.eventOn('error', (params) => {
      if (params && params.type === ErrorType.LoadError) {
        closeVoxa(true);
      }
    });

    iframe.current.eventOn('save', async (value) => {
      if (!value.isSuccess) {
        return;
      }
      const { modelId, modelFileHash } = value.modelResp;
      voxaModelId.current = modelId;
      // 皮肤 - 保存成功后刷新皮肤列表
      if (editType === EditType.Skin) {
        // 保存成功后刷新皮肤列表
        await refreshSkinsList();
        return;
      }
      // 模型 - 保存成功后刷新模型列表
      editor.replica.updateExtraProject();

      // 如果更改的恰好是preview中的模型，更新preview
      if (!selectedModel || selectedModel.modelData.id !== modelId) {
        return;
      }
      dispatch(
        setSelectedModel({
          mousePosition: selectedModel.mousePosition,
          modelData: {
            ...selectedModel.modelData,
            modelFileHash,
          },
        }),
      );
    });
    return () => {
      iframe.current?.destroy();
    };
  }, []);

  /**
   * 二次确认弹窗 确认按钮的回调
   */
  const handleConfirmModal = useCallback(() => {
    if (reconfirmType === ReconfirmType.Close) {
      closeVoxa();
      return;
    }
    iframe.current?.emitEvent('save');
    setReconfirmType(undefined);
    return;
  }, [closeVoxa, reconfirmType]);
  const voxaIframe = useMemo(() => {
    return (
      <div
        className={`${style.voxa} ${show ? style.show : style.hide}`}
        ref={(ref) => {
          iframeEl.current = ref;
        }}
      >
        {!!reconfirmType && (
          <ModalView
            buttonSort="rtl"
            width={448}
            content={intl.formatMessage({
              id: ReconfirmModalConfig[editType || EditType.Normal][
                reconfirmType || ReconfirmType.Save
              ].content,
            })}
            title={intl.formatMessage({
              id: ReconfirmModalConfig[editType || EditType.Normal][
                reconfirmType || ReconfirmType.Save
              ].title,
            })}
            cancelText={intl.formatMessage({ id: 'cancel' })}
            confirmText={intl.formatMessage({
              id: reconfirmType === ReconfirmType.Close ? 'quit' : 'save',
            })}
            onConfirm={handleConfirmModal}
            onCancel={() => setReconfirmType(undefined)}
          />
        )}
      </div>
    );
  }, [editType, handleConfirmModal, intl, reconfirmType, show]);

  const loading = useMemo(() => {
    if (show) {
      return;
    }
    return (
      <div className={style.loading}>
        <div className={style.loadingIcon} />
        {intl.formatMessage({ id: 'voxa.loading' })}
      </div>
    );
  }, [intl, show]);

  return (
    <div className={style.voxaPanel}>
      {loading}
      {voxaIframe}
    </div>
  );
}
