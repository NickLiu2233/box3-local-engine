import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useIntl } from 'react-intl';

import style from './index.module.scss';
import { REQUEST_TIMEOUT, ModelType, SourceType } from '@box-local/apis';
import { SkinList } from '../skin-list';
import { fetchSkinData } from '../../index';
import { Search } from '../../../search';
import { Button, Modal, TabPanel, Tabs, Toast } from '@box-local/box-design/build';
import { apis } from 'src/apis/api-java';
import { clientConfig } from 'src/config/client';
import { PlayerSkinList } from 'src/redux/edit/player-skin';

interface Tab {
  id: ModelType;
  title: string;
}

interface SkinLibProps {
  onImportSuccess: () => void;
}

export const SkinLib = (props: SkinLibProps) => {
  const intl = useIntl();
  const mapId = clientConfig.mapInfo.contentId;
  const { onImportSuccess } = props;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [libTab, setLibTab] = useState<ModelType>(ModelType.Private);
  const [searchName, setSearchName] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const didUnmount = useRef(false);

  // 个人皮肤列表
  const [privateSkins, setPrivateSkins] = useState<PlayerSkinList>([]);

  // 公共皮肤列表
  const [publicSkins, setPublicSkins] = useState<PlayerSkinList>([]);

  const [searched, setSearched] = useState<PlayerSkinList>([]);

  const buttonDisabled = useMemo(() => {
    return !selectedIds.length || importing;
  }, [importing, selectedIds]);

  useEffect(() => {
    fetchSkinData({ modelType: ModelType.Private }).then((privateList) => {
      if (!privateList) {
        return;
      }
      setPrivateSkins(privateList);
    });
    fetchSkinData({ modelType: ModelType.Public }).then((publicList) => {
      if (!publicList) {
        return;
      }
      setPublicSkins(publicList);
    });
    return () => {
      didUnmount.current = true;
    };
  }, []);

  useEffect(() => {
    if (!searchName) {
      return;
    }
    fetchSkinData({ modelType: libTab, modelName: searchName }).then(
      (searched) => {
        if (!searched) {
          return;
        }
        setSearched(searched);
      },
    );
  }, [libTab, searchName]);

  const skinList = useMemo(() => {
    if (searchName) {
      return searched;
    }
    switch (libTab) {
      case ModelType.Private:
        return privateSkins;
      case ModelType.Public:
        return publicSkins;
      default:
        return [];
    }
  }, [libTab, privateSkins, publicSkins, searchName, searched]);

  const TabList: Tab[] = useMemo(() => {
    return [
      {
        id: ModelType.Private,
        title: intl.formatMessage({ id: 'privateSkinLib' }),
      },
      {
        id: ModelType.Public,
        title: intl.formatMessage({ id: 'publicSkinLib' }),
      },
    ];
  }, [intl]);

  useEffect(() => {
    setSelectedIds([]);
    setInputValue('');
  }, [libTab]);

  const loadNextPage = useCallback(async () => {
    if (loading) {
      return;
    }
    let setSkinList: React.Dispatch<React.SetStateAction<PlayerSkinList>>;
    let skinList: PlayerSkinList;
    if (searchName) {
      setSkinList = setSearched;
      skinList = searched;
    } else {
      switch (libTab) {
        case ModelType.Private:
          setSkinList = setPrivateSkins;
          skinList = privateSkins;
          break;
        case ModelType.Public:
          setSkinList = setPublicSkins;
          skinList = publicSkins;
          break;
        default:
          return;
      }
    }

    setLoading(true);
    const data = await fetchSkinData({
      modelType: libTab,
      offset: skinList.length,
      modelName: searchName,
    });

    // 页面已卸载，直接返回
    if (didUnmount.current) {
      return;
    }
    setLoading(false);
    if (!data) {
      return;
    }

    setSkinList([...skinList, ...data]);
  }, [loading, searchName, libTab, searched, privateSkins, publicSkins]);

  const importSkin = useCallback(async () => {
    Toast.loading({
      content: intl.formatMessage({ id: 'gamePlayerImporting' }),
      duration: 0,
    });
    setImporting(true);
    try {
      const res = await apis.model.batchAddSkinUsingPost(
        {
          mapId,
          originSkinIds: selectedIds,
          sourceType:
            libTab === ModelType.Private
              ? SourceType.Snapshot
              : SourceType.Release,
        },
        {
          timeout: REQUEST_TIMEOUT * 2,
        },
      );
      Toast.destroyAll();
      !didUnmount.current && setImporting(false);
      if (!res) {
        Toast.error({
          content: intl.formatMessage({ id: 'gamePlayerImportError' }),
        });
      } else {
        Toast.success({
          content: intl.formatMessage({ id: 'gamePlayerImportSuccess' }),
        });
        onImportSuccess();
      }
    } catch (err) {
      console.error(err);
      !didUnmount.current && setImporting(false);
      Toast.destroyAll();
      Toast.error({
        content: intl.formatMessage({ id: 'gamePlayerImportError' }),
      });
    }
  }, [intl, mapId, selectedIds, libTab, onImportSuccess]);

  return (
    <div className={style.wrapper}>
      <Tabs
        className={style.tabList}
        defaultActiveId={libTab}
        activeId={libTab}
        onTabClick={(id) => {
          if (importing) {
            return;
          }

          if (!selectedIds.length) {
            setLibTab(Number(id));
            return;
          }

          const destroy = Modal.show({
            width: 448,
            title: intl.formatMessage({
              id: 'gamePlayerSwitchTabTitle',
            }),
            content: intl.formatMessage({
              id: 'gamePlayerSwitchTabContent',
            }),
            confirmText: intl.formatMessage({
              id: 'confirm',
            }),
            cancelText: intl.formatMessage({
              id: 'cancel',
            }),
            onConfirm: () => {
              setLibTab(Number(id));
              destroy();
            },
            onCancel: () => {
              destroy();
            },
          });
        }}
      >
        {TabList.map((tab) => {
          return (
            <TabPanel
              key={tab.id}
              id={tab.id}
              type={'text'}
              tab={tab.title}
              disabled={importing}
            />
          );
        })}
      </Tabs>
      <div className={style.search}>
        <Search
          onSearch={setSearchName}
          onChange={setInputValue}
          value={inputValue}
          clearBtn={true}
          size="middle"
        />
      </div>
      <div className={style.content}>
        <SkinList
          loading={loading}
          skinList={skinList}
          selectable={true}
          selectedIds={selectedIds}
          onSelect={(ids) => setSelectedIds(ids)}
          rowNum={4}
          onScrollToBottom={loadNextPage}
          emptyTips={
            searchName
              ? intl.formatMessage({ id: 'gamePlayerSearchEmpty' })
              : intl.formatMessage({ id: 'gamePlayerLibEmpty' })
          }
        />
      </div>
      <div className={style.footer}>
        <div className={style.countText}>
          {intl.formatMessage({
            id: 'gamePlayerSelected',
          })}
          <span className={style.countNumber}>{selectedIds.length}</span>
          {intl.formatMessage({
            id: 'gamePlayerItem',
          })}
        </div>
        <div className={style.buttons}>
          <Button
            type={'secondary'}
            style={{ width: 120 }}
            disabled={buttonDisabled}
            onClick={() => setSelectedIds([])}
          >
            {intl.formatMessage({
              id: 'gamePlayerEmpty',
            })}
          </Button>
          <Button
            style={{ width: 120 }}
            disabled={buttonDisabled}
            onClick={importSkin}
          >
            {intl.formatMessage({
              id: 'confirm',
            })}
          </Button>
        </div>
      </div>
    </div>
  );
};
