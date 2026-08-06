import React, {
  useState,
  useCallback,
  useMemo,
  forwardRef,
  Ref,
  useEffect,
} from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import {
  Button,
  MenuItemOptions,
  Modal,
  ModalView,
  Toast,
  Select,
  ItemId,
} from '@box-local/box-design';
import {
  ModelType,
  SortOrder,
  ModelErrorCode,
  REQUEST_TIMEOUT,
} from '@box-local/apis';

import { Search } from '../../search';
import { SkinList } from './skin-list';
import { clientConfig } from 'src/config/client';
import { EditType, setVoxaData } from 'src/redux/edit/creator';
import { fetchSkinData } from '..';

import style from './index.module.scss';
import { apis } from 'src/apis/api-java';
import { RenameModal } from '../../rename-modal';
import { IconSort } from '@box-local/icons';
import {
  setDefaultSkinId,
  setExtensionSkins,
  setSearchName,
  setSortBy,
} from 'src/redux/edit/player-skin';
import { RootState } from 'src/redux/edit';
import { ScrollManage } from '../../scroll-trigger';
import { useEdit } from 'src/client/edit/edit-context';

enum SkinAction {
  SetDefault = 'SetDefault',
  Edit = 'Edit',
  Rename = 'Rename',
  Delete = 'Delete',
}

interface ProjectSkinProps {
  showSkinLib: () => void;
  refreshProjectSkins: () => void;
}

export const ProjectSkinView = (
  props: ProjectSkinProps,
  ref: Ref<ScrollManage>,
) => {
  const { showSkinLib, refreshProjectSkins } = props;
  const dispatch = useDispatch();
  const intl = useIntl();
  const editor = useEdit();
  const mapId = clientConfig.mapInfo.contentId;

  const [rename, setRename] = useState<
    | {
        skinId: number;
        oldName: string;
      }
    | undefined
  >(undefined);
  const [renameErrorTip, setRenameErrorTip] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [skinAlreadyDeleteModal, setSkinAlreadyDeleteModal] =
    useState<boolean>(false);
  const {
    extensionSkins: skinList,
    sortBy,
    defaultSkinId,
  } = useSelector((state: RootState) => state.playerSkin);
  const searchName = useSelector(
    (state: RootState) => state.playerSkin.searchName,
  );
  const sortItems: MenuItemOptions[] = useMemo(() => {
    return [
      {
        id: `${SortOrder.ModifyTimeDesc}`,
        text: intl.formatMessage({ id: 'gamePlayerSortByModifyTime' }),
      },
      {
        id: `${SortOrder.NameAsc}`,
        text: intl.formatMessage({ id: 'gamePlayerSortByName' }),
      },
    ];
  }, [intl]);

  const onSelectSort = useCallback(
    (data: { id: ItemId }) => {
      if (typeof data.id !== 'string') {
        return;
      }

      if (sortBy.toString() === data.id) {
        return;
      }
      dispatch(setSortBy(parseInt(data.id)));
      refreshProjectSkins();
    },
    [dispatch, refreshProjectSkins, sortBy],
  );

  const getActionsMenu = useCallback(
    (skinId: number): MenuItemOptions[] => {
      return [
        {
          id: SkinAction.SetDefault,
          text:
            defaultSkinId === skinId
              ? intl.formatMessage({ id: 'gamePlayerUnsetDefaultSkin' })
              : intl.formatMessage({ id: 'gamePlayerSetDefaultSkin' }),
        },
        {
          id: SkinAction.Edit,
          text: intl.formatMessage({ id: 'gamePlayerEditSkin' }),
        },
        {
          id: SkinAction.Rename,
          text: intl.formatMessage({ id: 'rename' }),
        },
        {
          id: SkinAction.Delete,
          text: intl.formatMessage({ id: 'gamePlayerDeleteSkin' }),
        },
      ];
    },
    [defaultSkinId, intl],
  );
  const unsetDefaultSkin = useCallback(async () => {
    try {
      const res = await apis.model.setDefaultSkinUsingPut(
        {
          mapId,
        },
        {
          timeout: REQUEST_TIMEOUT,
        },
      );
      if (!res) {
        return;
      }
      Toast.success({
        content: intl.formatMessage({ id: 'gamePlayerUnsetDefaultSuccess' }),
      });
      dispatch(setDefaultSkinId(0));
      await editor.replica.updateExtraProject();
    } catch (e) {
      Toast.error({
        content: intl.formatMessage({ id: 'gamePlayerUnsetDefaultError' }),
      });
    }
  }, [dispatch, editor.replica, intl, mapId]);

  const setDefaultSkin = useCallback(
    async (skinId: number) => {
      try {
        const res = await apis.model.setDefaultSkinUsingPut(
          {
            mapId,
            skinId,
          },
          {
            timeout: REQUEST_TIMEOUT,
          },
        );
        if (!res) {
          return;
        }
        Toast.success({
          content: intl.formatMessage({ id: 'gamePlayerSetDefaultSuccess' }),
        });
        await editor.replica.updateExtraProject();
        refreshProjectSkins();
      } catch (e) {
        switch (e.code) {
          case ModelErrorCode.ModelNotExisted:
            setSkinAlreadyDeleteModal(true);
            break;
          default:
            Toast.error({
              content: intl.formatMessage({
                id: 'gamePlayerSetDefaultError',
              }),
            });
            break;
        }
      }
    },
    [editor.replica, intl, mapId, refreshProjectSkins],
  );
  const handleSetDefault = useCallback(
    (skinId: number) => {
      defaultSkinId === skinId ? unsetDefaultSkin() : setDefaultSkin(skinId);
    },
    [defaultSkinId, setDefaultSkin, unsetDefaultSkin],
  );

  const handleDeleteSkin = useCallback(
    async (skinId: number) => {
      const skinName = skinList.find((skin) => skin.id === skinId)?.name || '';
      // 二次确认弹窗 - 默认文案
      let contentText: string = intl.formatMessage(
        { id: 'gamePlayerDeleteSkinTips' },
        {
          skinName,
        },
      );
      // 获取将这个皮肤被设置为默认皮肤的地图Id列表
      try {
        const skinMapIdList = await apis.model.getSkinMapIdList(skinId, {
          timeout: REQUEST_TIMEOUT,
        });
        // 如果有其他地图将该皮肤设置为默认皮肤，则修改弹窗文案以提醒用户该信息
        if (skinMapIdList.length !== 0) {
          contentText = intl.formatMessage(
            { id: 'gamePlayerDeleteDefaultSkinTips' },
            {
              skinName,
              skinMapIdList: `${skinMapIdList.join('、')}`,
            },
          );
        }
      } catch (err) {
        console.error('fail to get Skin MapId List ', err);
      }
      const destroy = Modal.show({
        type: 'warning',
        width: 448,
        title: intl.formatMessage({ id: 'gamePlayerDeleteSkin' }),
        content: contentText,
        confirmText: intl.formatMessage({ id: 'remove' }),
        onConfirm: async () => {
          Toast.loading({
            content: intl.formatMessage({ id: 'gamePlayerDeleting' }),
            duration: 0,
          });
          try {
            const res = await apis.models.deleteSharedSkinUsingDelete(
              {
                mapId,
                skinId,
              },
              {
                timeout: REQUEST_TIMEOUT,
              },
            );
            Toast.destroyAll();
            if (res) {
              Toast.success({
                content: intl.formatMessage({ id: 'deleteSuccess' }),
              });
              dispatch(
                setExtensionSkins(
                  skinList.filter((skin) => skin.id !== skinId),
                ),
              );
            }
          } catch (e) {
            Toast.destroyAll();
            switch (e.code) {
              case ModelErrorCode.ModelNotExisted:
                setSkinAlreadyDeleteModal(true);
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
    [dispatch, intl, mapId, skinList],
  );

  const handleEditSkin = useCallback(
    async (skinId: number) => {
      // 打开voxa面板之前检测skin是否存在
      const res = await apis.model.getModelDetailUsingGet(skinId, {
        timeout: REQUEST_TIMEOUT,
      });
      if (!res) {
        setSkinAlreadyDeleteModal(true);
        return;
      }
      dispatch(
        setVoxaData({
          isShow: true,
          modelId: skinId,
          modelType: ModelType.ExtensionLib,
          editType: EditType.Skin,
        }),
      );
    },
    [dispatch],
  );

  const handleRenameSkin = useCallback(
    async (skinId: number) => {
      const skinName = skinList.find((skin) => skin.id === skinId)?.name || '';
      setRename({ skinId, oldName: skinName });
    },
    [skinList],
  );

  const handleMenuAction = useCallback(
    (params: { actionId: ItemId; skinId: number }) => {
      const { actionId, skinId } = params;
      switch (actionId) {
        case SkinAction.SetDefault:
          handleSetDefault(skinId);
          break;
        case SkinAction.Edit:
          handleEditSkin(skinId);
          break;
        case SkinAction.Rename:
          handleRenameSkin(skinId);
          break;
        case SkinAction.Delete:
          handleDeleteSkin(skinId);
          break;
      }
    },
    [handleSetDefault, handleEditSkin, handleRenameSkin, handleDeleteSkin],
  );

  //  组件卸载前清空搜索框
  useEffect(() => {
    return () => {
      dispatch(setSearchName(''));
    };
  }, [dispatch]);

  const onSearch = useCallback(
    (query: string) => {
      dispatch(setSearchName(query));
      refreshProjectSkins();
    },
    [dispatch, refreshProjectSkins],
  );

  const loadNextPage = useCallback(async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    const data = await fetchSkinData({
      modelType: ModelType.ExtensionLib,
      offset: skinList.length,
      modelName: searchName,
      orderBy: sortBy,
    });
    setLoading(false);
    if (!data) {
      return;
    }
    dispatch(setExtensionSkins([...skinList, ...data]));
  }, [loading, searchName, sortBy, skinList, dispatch]);

  const onConfirmModal = useCallback(() => {
    refreshProjectSkins();
    setSkinAlreadyDeleteModal(false);
  }, [refreshProjectSkins]);

  const handleCancelRename = useCallback(() => {
    setRename(undefined);
  }, []);

  const handleRename = useCallback(async (skinId: number, newName: string) => {
    const res = await apis.models.renameSharedSkinUsingPut(
      {
        mapId: clientConfig.mapInfo.contentId,
        skinId: skinId,
        skinName: newName,
      },
      {
        timeout: REQUEST_TIMEOUT,
      },
    );
    return res;
  }, []);

  const handleRenameSuccess = useCallback(() => {
    refreshProjectSkins();
    setRename(undefined);
  }, [refreshProjectSkins]);

  const handleRenameError = useCallback(
    (errorCode: number) => {
      switch (errorCode) {
        case ModelErrorCode.NameExisted:
          setRenameErrorTip(intl.formatMessage({ id: 'nameExit' }));
          break;
        case ModelErrorCode.ModelNotExisted:
          setSkinAlreadyDeleteModal(true);
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

  return (
    <div className={style.container}>
      <div className={style.topBar}>
        <div className={style.left}>
          <Button
            type={'secondary'}
            size={'medium'}
            onClick={() => {
              dispatch(
                setVoxaData({
                  isShow: true,
                  modelId: 0,
                  modelType: ModelType.ExtensionLib,
                  editType: EditType.Skin,
                }),
              );
            }}
          >
            {intl.formatMessage({ id: 'gamePlayerNewSkin' })}
          </Button>
          {!clientConfig.isLocalGameServer && (
            <Button type={'secondary'} size={'medium'} onClick={showSkinLib}>
              {intl.formatMessage({ id: 'gamePlayerImportSkin' })}
            </Button>
          )}
        </div>
        <div className={style.right}>
          <div className={style.sort}>
            <IconSort />
            <Select
              align={{ offset: [0, 0] }}
              items={sortItems}
              selection={sortBy.toString()}
              onSelect={onSelectSort}
            />
          </div>
          <Search onSearch={onSearch} clearBtn={true} size="middle" />
        </div>
      </div>
      <div className={style.content}>
        <SkinList
          ref={ref}
          loading={loading}
          skinList={skinList}
          defaultSkinId={defaultSkinId}
          copyTitle={true}
          onScrollToBottom={loadNextPage}
          emptyTips={
            searchName
              ? intl.formatMessage({ id: 'gamePlayerSearchEmpty' })
              : intl.formatMessage({ id: 'gamePlayerProjectSkinEmpty' })
          }
          getActionsMenu={getActionsMenu}
          onMenuItemSelected={handleMenuAction}
        />
      </div>
      {rename && (
        <RenameModal
          id={rename.skinId}
          oldName={rename.oldName}
          onRename={handleRename}
          onSuccess={handleRenameSuccess}
          onError={handleRenameError}
          renameErrorTip={renameErrorTip}
          onFocus={() => setRenameErrorTip(undefined)}
          onCancel={handleCancelRename}
        />
      )}
      {skinAlreadyDeleteModal && (
        <ModalView
          rootClassName={style.skinAlreadyDeleteModal}
          type="default"
          width={332}
          title={intl.formatMessage({
            id: 'gamePlayerSkinAlreadyDelete',
          })}
          confirmText={intl.formatMessage({
            id: 'iGotIt',
          })}
          onConfirm={onConfirmModal}
        />
      )}
    </div>
  );
};

export const ProjectSkin = forwardRef<ScrollManage, ProjectSkinProps>(
  ProjectSkinView,
);
