import {
  forwardRef,
  Ref,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

import { Modal, ModalView, Toast } from '@box-local/box-design';
import {
  CopyEvent,
  ModelErrorCode,
  ModelType,
  REQUEST_TIMEOUT,
  SourceType,
} from '@box-local/apis';

import { RenameModal } from 'src/views/edit/components/rename-modal';
import { apis } from 'src/apis/api-java';
import { clientConfig } from 'src/config/client';
import { EditType, setVoxaData } from 'src/redux/edit/creator';
import { ModelAction } from 'src/views/edit/components/stage-area/edit-model-panel/index';
import { useEdit } from 'src/client/edit/edit-context';
import { setSelectedModel } from 'src/redux/edit/ui';

import style from './index.module.scss';
import { RootState } from 'src/redux/edit';

export type Actions = {
  [key in ModelAction]?: (modelId: number) => void;
};

type Props = {
  scrollToTop?: () => void;
};

function ProjectModelActions(props: Props, ref: Ref<Actions>) {
  const { scrollToTop } = props;
  const editor = useEdit();
  const dispatch = useDispatch();
  const intl = useIntl();
  const selectedModel = useSelector((state: RootState) => {
    return state.ui.selectedModel;
  });
  const mapId = clientConfig.mapInfo.contentId;
  const [modelAlreadyDeleteModal, setModelAlreadyDeleteModal] =
    useState<boolean>(false);
  const [rename, setRename] = useState<
    | {
        modelId: number;
        oldName: string;
      }
    | undefined
  >(undefined);
  const [renameErrorTip, setRenameErrorTip] = useState<string | undefined>();

  const handleEditModel = useCallback(
    async (modelId: number) => {
      // 打开voxa面板之前检测model是否存在
      const res = await apis.model.getModelDetailUsingGet(modelId, {
        timeout: REQUEST_TIMEOUT,
      });
      if (!res) {
        setModelAlreadyDeleteModal(true);
        return;
      }
      dispatch(
        setVoxaData({
          isShow: true,
          modelId: modelId,
          modelType: ModelType.Project,
          editType: EditType.Normal,
        }),
      );
    },
    [dispatch],
  );
  const handleRenameModel = useCallback(
    (modelId: number) => {
      let modelName = '';
      const meshAssets = Object.entries(
        editor.state.replica.extraProjectInfo.meshAssets,
      );
      for (let i = 0; i < meshAssets.length; i++) {
        const [key, meshAsset] = meshAssets[i];
        if (meshAsset.modelId === modelId) {
          modelName = editor.assetController.getModelNameFromMeshAssetsKey(key);
          break;
        }
      }

      setRename({ modelId, oldName: modelName });
    },
    [editor.assetController, editor.state.replica.extraProjectInfo.meshAssets],
  );
  const handleCopyModel = useCallback(
    async (modelId: number) => {
      try {
        const res = await apis.model.copyProjectSharedModelUsingPost({
          mapId,
          originModelId: modelId,
          event: CopyEvent.ActiveCopy,
          sourceType: SourceType.Snapshot,
        });
        if (res) {
          editor.replica.updateExtraProject();
          Toast.success({ content: intl.formatMessage({ id: 'copySuccess' }) });
          scrollToTop && scrollToTop();
        }
      } catch (e) {
        switch (e.code) {
          case ModelErrorCode.ModelNotExisted:
            setModelAlreadyDeleteModal(true);
            break;
          default:
            Toast.error({
              content: intl.formatMessage({ id: 'copyFailed' }),
            });
            break;
        }
      }
    },
    [editor.replica, intl, mapId, scrollToTop],
  );

  const handleRemoveModel = useCallback(
    async (modelId: number) => {
      const destroy = Modal.show({
        type: 'warning',
        width: 448,
        title: intl.formatMessage({ id: 'removeModel' }),
        content: intl.formatMessage({ id: 'removeProjectModelWarning' }),
        confirmText: intl.formatMessage({ id: 'remove' }),
        onConfirm: async () => {
          try {
            const res = await apis.model.deleteProjectSharedModelUsingDelete(
              {
                mapId,
                modelId,
              },
              {
                timeout: REQUEST_TIMEOUT,
              },
            );
            if (res) {
              Toast.success({
                content: intl.formatMessage({ id: 'deleteSuccess' }),
              });
              editor.replica.updateExtraProject();
              if (selectedModel?.modelData.id === modelId) {
                dispatch(setSelectedModel(undefined));
              }
            }
          } catch (e) {
            switch (e.code) {
              case ModelErrorCode.ModelNotExisted:
                setModelAlreadyDeleteModal(true);
                break;
              default:
                Toast.error({
                  content: intl.formatMessage({ id: 'deleteFailed' }),
                });
                break;
            }
          }
          destroy();
        },

        cancelText: intl.formatMessage({ id: 'cancel' }),
        onCancel: () => {
          destroy();
        },
      });
    },
    [intl, mapId, editor.replica, selectedModel, dispatch],
  );

  const onConfirmModal = useCallback(() => {
    editor.replica.updateExtraProject();
    setModelAlreadyDeleteModal(false);
  }, [editor.replica]);

  const handleCancelRename = useCallback(() => {
    setRename(undefined);
  }, []);

  const handleRename = useCallback(async (modelId: number, newName: string) => {
    const res = await apis.model.renameProjectSharedModelUsingPut(
      {
        mapId: clientConfig.mapInfo.contentId,
        modelId: modelId,
        modelName: newName,
      },
      {
        timeout: REQUEST_TIMEOUT,
      },
    );
    return res;
  }, []);

  const handleRenameSuccess = useCallback(() => {
    editor.replica.updateExtraProject();
    setRename(undefined);
  }, [editor.replica]);

  const handleRenameError = useCallback(
    (errorCode: number) => {
      switch (errorCode) {
        case ModelErrorCode.NameExisted:
          setRenameErrorTip(intl.formatMessage({ id: 'nameExit' }));
          break;
        case ModelErrorCode.ModelNotExisted:
          setModelAlreadyDeleteModal(true);
          setRename(undefined);
          break;
        default:
          Toast.error({
            content: intl.formatMessage({ id: 'renameFail' }),
          });
          break;
      }
    },
    [intl],
  );

  useImperativeHandle(ref, () => ({
    [ModelAction.Edit]: handleEditModel,
    [ModelAction.Rename]: handleRenameModel,
    [ModelAction.Copy]: handleCopyModel,
    [ModelAction.Remove]: handleRemoveModel,
  }));

  return (
    <>
      {rename && (
        <RenameModal
          id={rename.modelId}
          oldName={rename.oldName}
          onRename={handleRename}
          onSuccess={handleRenameSuccess}
          onError={handleRenameError}
          renameErrorTip={renameErrorTip}
          onFocus={() => setRenameErrorTip(undefined)}
          onCancel={handleCancelRename}
        />
      )}
      {modelAlreadyDeleteModal && (
        <ModalView
          rootClassName={style.modelAlreadyDeleteModal}
          type="default"
          width={332}
          title={intl.formatMessage({
            id: 'modelAlreadyDelete',
          })}
          confirmText={intl.formatMessage({
            id: 'iGotIt',
          })}
          onConfirm={onConfirmModal}
        />
      )}
    </>
  );
}

export default forwardRef<Actions, Props>(ProjectModelActions);
