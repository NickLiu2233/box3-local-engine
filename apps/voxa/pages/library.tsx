import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { projectSchemaToBytes } from '@box-local/voxa-project';

import { listModels } from '../server/local-voxa-store';
import { readProjectBundle } from '../src/models/file-tools/project-bundle';
import styles from './library.module.css';

type ModelTypeFilter = '全部' | '模型' | '皮肤';
type LibraryModel = ReturnType<typeof listModels>[number];

export const getServerSideProps: GetServerSideProps<{
  models: ReturnType<typeof listModels>;
}> = async () => ({
  props: { models: listModels() },
});

function Icon({ name }: { name: 'clock' | 'cube' | 'download' | 'edit' | 'more' | 'plus' | 'search' | 'shirt' | 'trash' | 'upload' }) {
  const paths = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.5 7.5 4 7.5-4M12 11.5V21" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 20h14" /></>,
    edit: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20ZM13.5 7l3.5 3.5" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></>,
    shirt: <path d="m8 4-5 3 3 5 2-1v9h8v-9l2 1 3-5-5-3c-.7 1.3-2.1 2-4 2s-3.3-.7-4-2Z" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function modelKind(model: LibraryModel): Exclude<ModelTypeFilter, '全部'> {
  return model.creativeMode === 2 ? '皮肤' : '模型';
}

function editHref(model: LibraryModel) {
  return `/?modelId=${model.modelId}&editType=${model.creativeMode === 2 ? 1 : 0}`;
}

function formatUpdatedAt(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  const chinaTime = new Date(timestamp + 8 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${chinaTime.getUTCFullYear()}/${chinaTime.getUTCMonth() + 1}/${chinaTime.getUTCDate()} ${pad(chinaTime.getUTCHours())}:${pad(chinaTime.getUTCMinutes())}`;
}

export default function LibraryPage({
  models: initialModels,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [models, setModels] = useState(initialModels);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ModelTypeFilter>('全部');
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuModel, setMenuModel] = useState<number | null>(null);
  const [deleteModel, setDeleteModel] = useState<LibraryModel | null>(null);
  const [infoModel, setInfoModel] = useState<LibraryModel | null>(null);
  const [infoName, setInfoName] = useState('');
  const [infoDescription, setInfoDescription] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const visibleModels = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN');
    return models.filter((model) => {
      const kind = modelKind(model);
      return (type === '全部' || type === kind)
        && (!keyword || model.modelName.toLocaleLowerCase('zh-CN').includes(keyword));
    });
  }, [models, query, type]);

  const confirmDelete = async () => {
    if (!deleteModel || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/local/models/${deleteModel.modelId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('删除失败');
      setModels((items) => items.filter((item) => item.modelId !== deleteModel.modelId));
      setDeleteModel(null);
    } finally {
      setDeleting(false);
    }
  };

  const openInfoDialog = (model: LibraryModel) => {
    setMenuModel(null);
    setInfoModel(model);
    setInfoName(model.modelName || '');
    setInfoDescription(model.modelDescription || '');
    setDialogError('');
  };

  const saveInfo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!infoModel || saving) return;
    const modelName = infoName.trim();
    if (!modelName) {
      setDialogError('请输入模型名称');
      return;
    }
    setSaving(true);
    setDialogError('');
    try {
      const response = await fetch(`/api/local/models/${infoModel.modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName, modelDescription: infoDescription.trim() }),
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.message || '保存失败');
      setModels((items) => items.map((item) => item.modelId === updated.modelId ? updated : item));
      setInfoModel(null);
      setNotice('模型信息已保存');
    } catch (error) {
      setDialogError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const importProject = async (file: File) => {
    if (importing) return;
    setImporting(true);
    setNotice('');
    try {
      const imported = await readProjectBundle(file);
      const projectBytes = projectSchemaToBytes(imported.projectData);
      const blobResponse = await fetch('/api/local/blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Blob([projectBytes]),
      });
      const blobResult = await blobResponse.json();
      if (!blobResponse.ok) throw new Error(blobResult.message || '工程文件保存失败');

      const modelResponse = await fetch('/api/local/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: imported.projectName,
          modelDescription: '',
          modelType: 0,
          creativeMode: imported.editType === 1 ? 2 : 1,
          modelProjectFileHash: blobResult.hash,
        }),
      });
      const created = await modelResponse.json();
      if (!modelResponse.ok) throw new Error(created.message || '导入工程失败');
      setModels((items) => [created, ...items]);
      setNotice(`已导入“${created.modelName}”`);
    } catch (error) {
      const message = (error as Error).message;
      setNotice(message.startsWith('INVALID_') || message.startsWith('UNSUPPORTED_')
        ? '无法识别这个 VOXA 工程文件'
        : message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Head><title>VOXA 作品管理</title></Head>
      <main className={styles.page} onClick={() => { setFilterOpen(false); setMenuModel(null); }}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/library">VOXA <em>LOCAL</em></Link>
          <span className={styles.localBadge}><i />本地模式</span>
        </header>

        <section className={styles.content} aria-labelledby="library-title">
          <div className={styles.titleRow}>
            <div className={styles.titleHeading}>
              <h1 id="library-title">作品</h1>
              <button className={styles.headingImportButton} disabled={importing} onClick={() => importInputRef.current?.click()}>
                <Icon name="upload" />{importing ? '导入中…' : '导入模型工程'}
              </button>
              <input
                ref={importInputRef}
                className={styles.hiddenFileInput}
                type="file"
                accept=".voxaproject,.voxa-project"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  if (file) importProject(file);
                }}
              />
            </div>
            <div className={styles.titleActions}>
              <Link className={styles.secondaryButton} href="/?modelType=0&editType=1">
                <Icon name="shirt" />新建皮肤
              </Link>
              <Link className={styles.primaryButton} href="/?modelType=0&editType=0">
                <Icon name="plus" />新建模型
              </Link>
            </div>
          </div>

          {notice && <div className={styles.notice}>{notice}</div>}

          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Icon name="search" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索作品" />
            </label>
            <div className={styles.filterWrap} onClick={(event) => event.stopPropagation()}>
              <button className={styles.filter} type="button" onClick={() => setFilterOpen((open) => !open)}>
                <span>类型</span><strong>{type}</strong><b aria-hidden="true">⌄</b>
              </button>
              {filterOpen && <div className={styles.filterMenu}>
                {(['全部', '模型', '皮肤'] as const).map((option) => (
                  <button key={option} className={type === option ? styles.selectedFilter : ''} onClick={() => { setType(option); setFilterOpen(false); }}>
                    {option}
                  </button>
                ))}
              </div>}
            </div>
          </div>

          {visibleModels.length ? <div className={styles.grid}>
            {visibleModels.map((model) => (
              <article className={styles.card} key={model.modelId}>
                <Link className={styles.cardLink} href={editHref(model)} aria-label={`编辑${model.modelName}`} />
                <div className={styles.cover}>
                  {model.modelPreviewUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={model.modelPreviewUrl} alt="" />
                    : <Icon name={modelKind(model) === '皮肤' ? 'shirt' : 'cube'} />}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeading}>
                    <div className={styles.nameRow}>
                      <h2>{model.modelName || `未命名${modelKind(model)}`}</h2>
                      <span>{modelKind(model)}</span>
                    </div>
                    <p>{model.modelDescription || `ID ${model.modelId}`}</p>
                  </div>
                  <div className={styles.cardFooter}>
                    <time dateTime={model.updatedAt}><Icon name="clock" />{formatUpdatedAt(model.updatedAt)}</time>
                    <Link className={styles.editButton} href={editHref(model)}>编辑</Link>
                  </div>
                </div>
                <div className={styles.menuWrap} onClick={(event) => event.stopPropagation()}>
                  <button className={styles.moreButton} aria-label="更多操作" onClick={() => setMenuModel(menuModel === model.modelId ? null : model.modelId)}>
                    <Icon name="more" />
                  </button>
                  {menuModel === model.modelId && <div className={styles.menu}>
                    <button onClick={() => openInfoDialog(model)}><Icon name="edit" />修改模型信息</button>
                    <a href={`/api/local/models/${model.modelId}/export`} download><Icon name="download" />导出模型工程</a>
                    <button onClick={() => { setDeleteModel(model); setMenuModel(null); }}><Icon name="trash" />删除</button>
                  </div>}
                </div>
              </article>
            ))}
          </div> : <div className={styles.emptyState}>
            <span><Icon name="cube" /></span>
            <h2>{query || type !== '全部' ? '没有找到匹配作品' : '还没有作品'}</h2>
            {(query || type !== '全部') && <button onClick={() => { setQuery(''); setType('全部'); }}>清除筛选</button>}
          </div>}
        </section>
      </main>

      {infoModel && <div className={styles.dialogBackdrop} onMouseDown={() => !saving && setInfoModel(null)}>
        <form className={styles.dialog} onSubmit={saveInfo} onMouseDown={(event) => event.stopPropagation()}>
          <span className={styles.dialogIcon}><Icon name="edit" /></span>
          <h2>修改模型信息</h2>
          <label htmlFor="model-name">模型名称</label>
          <input id="model-name" value={infoName} maxLength={100} autoFocus onChange={(event) => setInfoName(event.target.value)} />
          <label htmlFor="model-description">模型简介</label>
          <textarea id="model-description" value={infoDescription} maxLength={500} rows={4} onChange={(event) => setInfoDescription(event.target.value)} />
          {dialogError && <p className={styles.dialogError}>{dialogError}</p>}
          <div className={styles.dialogActions}>
            <button type="button" className={styles.cancelButton} disabled={saving} onClick={() => setInfoModel(null)}>取消</button>
            <button type="submit" className={styles.saveButton} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
          </div>
        </form>
      </div>}

      {deleteModel && <div className={styles.dialogBackdrop} onMouseDown={() => !deleting && setDeleteModel(null)}>
        <div className={styles.dialog} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          <span className={styles.dialogIcon}><Icon name="trash" /></span>
          <h2>删除作品</h2>
          <p>确定删除“{deleteModel.modelName}”吗？此操作无法撤销。</p>
          <div className={styles.dialogActions}>
            <button className={styles.cancelButton} disabled={deleting} onClick={() => setDeleteModel(null)}>取消</button>
            <button className={styles.deleteButton} disabled={deleting} onClick={confirmDelete}>{deleting ? '删除中…' : '删除'}</button>
          </div>
        </div>
      </div>}
    </>
  );
}
