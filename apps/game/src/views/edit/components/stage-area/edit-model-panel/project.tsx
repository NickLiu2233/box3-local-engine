import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

import { ItemId, MenuItemOptions } from '@box-local/box-design';
import { ModelType } from '@box-local/apis';

import { RootState } from 'src/redux/edit';
import { ModelAction, ModelData } from '.';
import { ModelList } from './model-list';
import { Search } from '../../search';
import { EditType, setVoxaData } from 'src/redux/edit/creator';
import ProjectModelActions, {
  Actions,
} from 'src/views/edit/components/stage-area/edit-model-panel/project-model-actions';
import { setSelectedModel } from 'src/redux/edit/ui';
import { convertTimeStrToTimestamp } from 'src/utils/date';
import { ScrollAction, ScrollManage } from '../../scroll-trigger';

import style from './index.module.scss';
import { useEdit } from 'src/client/edit/edit-context';
import { clientConfig } from 'src/config/client';
import { fetchModelList } from '.';

/**
 * 从 extraProject 中获取所有项目模型（不分页,且按更新时间倒序排序）
 * */

export const ProjectModelPanel = ({
  currentTab,
}: {
  currentTab: ModelType;
}) => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const editor = useEdit();
  const [modelList, setModelList] = useState<ModelData[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const projectModelActionsRef = useRef<Actions>(null);
  const projectModelScrollRef = useRef<ScrollManage>(null);

  const getModelList = useCallback(async () => {
    if (clientConfig.isLocalGameServer) {
      const list =
        (await fetchModelList({
          modelType: ModelType.Project,
          modelName: searchName,
        })) || [];
      setModelList(list);
      return;
    }
    const { meshAssets } = editor.state.replica.extraProjectInfo;
    let list: ModelData[] = Object.entries(meshAssets).map(
      ([key, meshAsset]) => {
        const previewImageUrl = editor.assetController.getModelPreviewUrl(
          meshAsset.modelPreviewHash,
        );
        const name = editor.assetController.getModelNameFromMeshAssetsKey(key);
        const model: ModelData = {
          id: meshAsset.modelId,
          name,
          modelPreviewUrl: previewImageUrl,
          modelFileHash: meshAsset.hash,
          bounds: [0, 0, 0],
          animated: meshAsset.animated,
          type: ModelType.Project,
          updateAt: meshAsset.updatedAt,
        };
        return model;
      },
    );
    // 按模型更新时间倒序排序
    list = list.sort(
      (first, second) =>
        convertTimeStrToTimestamp(second.updateAt) -
        convertTimeStrToTimestamp(first.updateAt),
    );
    if (!searchName) {
      setModelList(list);
    }
    setModelList(list.filter((model) => model.name.includes(searchName)));
  }, [editor, searchName]);

  // 初始化列表 & 订阅刷新列表
  useEffect(() => {
    getModelList();
    if (clientConfig.isLocalGameServer) {
      window.addEventListener('local-voxa-models-changed', getModelList);
      return () => {
        window.removeEventListener('local-voxa-models-changed', getModelList);
      };
    }
    editor.replica.onExtraProjectChange.sub(getModelList);
    return () => {
      editor.replica.onExtraProjectChange.unsub(getModelList);
    };
  }, [editor, getModelList]);

  useEffect(() => {
    setInputValue('');
  }, [currentTab]);

  const onNewModel = useCallback(() => {
    dispatch(
      setVoxaData({
        isShow: true,
        modelId: 0,
        modelType: ModelType.Project,
        editType: EditType.Normal,
      }),
    );
  }, [dispatch]);

  const actionsMenu: MenuItemOptions[] = useMemo(() => {
    const actions = [
      {
        id: ModelAction.Edit,
        text: intl.formatMessage({ id: 'edit' }),
      },
      {
        id: ModelAction.Rename,
        text: intl.formatMessage({ id: 'rename' }),
      },
      {
        id: ModelAction.Copy,
        text: intl.formatMessage({ id: 'copy' }),
      },
      {
        id: ModelAction.Remove,
        text: intl.formatMessage({ id: 'remove' }),
      },
    ];
    return clientConfig.isLocalGameServer
      ? actions.filter((action) => action.id !== ModelAction.Copy)
      : actions;
  }, [intl]);

  const handleMenuAction = useCallback(
    (params: { actionId: ItemId; modelId: number }) => {
      const { actionId, modelId } = params;
      if (!projectModelActionsRef.current) {
        return;
      }
      projectModelActionsRef.current[actionId]?.(modelId);
    },
    [],
  );

  const selectedModel = useSelector(
    (state: RootState) => state.ui.selectedModel?.modelData,
  );

  const onSelect = useCallback(
    (modelId, event: React.MouseEvent) => {
      if (modelId === selectedModel?.id) {
        dispatch(setSelectedModel(undefined));
        return;
      }
      const modelData = modelList.find((_) => _.id === modelId);
      if (modelData) {
        dispatch(
          setSelectedModel({
            modelData,
            mousePosition: {
              x: event.clientX,
              y: event.clientY,
            },
          }),
        );
      }
    },
    [dispatch, modelList, selectedModel?.id],
  );

  const scrollToTop = useCallback(() => {
    if (projectModelScrollRef.current) {
      projectModelScrollRef.current[ScrollAction.setScrollHeight](0);
    }
  }, []);

  return (
    <div className={style.projectModelPanel}>
      <div className={style.projectModelSearch}>
        <Search
          value={inputValue}
          onChange={setInputValue}
          onSearch={setSearchName}
          size="middle"
        />
      </div>
      <div className={style.projectModelList}>
        <ModelList
          ref={projectModelScrollRef}
          onSelect={onSelect}
          selectedId={selectedModel?.id ?? 0}
          modelList={modelList}
          newModel={true}
          onNewModel={onNewModel}
          actionsMenu={actionsMenu}
          onMenuItemSelected={handleMenuAction}
        />
      </div>
      <ProjectModelActions
        ref={projectModelActionsRef}
        scrollToTop={scrollToTop}
      />
    </div>
  );
};
