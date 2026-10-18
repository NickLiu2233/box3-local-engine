import React, { ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Toast, ModalView } from '@box/box-design';
import { useAppSelector } from '../../redux/store';
import { VoxelEditorContext } from '../../internals';
import { getContentUrl } from '../../utils/url';
import { DateTime } from './utils';
import { FileMenuContext } from './context';
import styles from './style.module.scss';

export type CardProps = {
  id: string;
  modelName?: string;
  modelPreviewHash?: string;
  projectFileHash?: string;
  dateTime?: DateTime;
  localDraft?: boolean;
  localDraftName?: string;
  onDelete?: () => void;
  localPreview?: Blob;
};

function Card(params: { img: ReactNode; desc: ReactNode; onClick?: () => void }) {
  const { img, desc, onClick } = params;
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardImgBorder}>{img}</div>
      <div className={styles.cardDesc}>{desc}</div>
    </div>
  );
}

export function CardNew() {
  const intl = useIntl();

  const img = (
    <div
      className={styles.cardImg}
      onClick={() => {
        window.open(window.location.origin, '_blank')?.focus();
      }}
    >
      <div className={styles.blank}></div>
    </div>
  );

  const desc = useMemo(() => {
    return (
      <span>
        {intl.formatMessage({
          description: 'Create New Project',
          defaultMessage: 'Blank',
        })}
      </span>
    );
  }, [intl]);

  return <Card img={img} desc={desc} />;
}

export function CardLoad(params: CardProps) {
  const editor = useContext(VoxelEditorContext);
  const { onClose } = useContext(FileMenuContext);
  const intl = useIntl();

  const projectName = useAppSelector((state) => state.app.projectName);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    projectFileHash = '',
    modelPreviewHash,
    modelName,
    dateTime,
    localDraft = false,
    localDraftName,
    onDelete,
    localPreview,
  } = params;
  const localPreviewUrl = useMemo(
    () => (localDraft && localPreview ? URL.createObjectURL(localPreview) : ''),
    [localDraft, localPreview],
  );
  useEffect(() => () => localPreviewUrl && URL.revokeObjectURL(localPreviewUrl), [localPreviewUrl]);

  // 确认加载历史文件的模态框
  const restoreModal = useMemo(() => {
    if (!showModal) {
      return;
    }

    const onConfirm = async () => {
      if (!editor) {
        return;
      }
      setLoading(true);
      try {
        if (localDraft) {
          const loaded = await editor.projectManager.loadLocalProject(localDraftName);
          if (!loaded) throw new Error('LOCAL_DRAFT_INVALID');
        } else {
          await editor.projectManager.loadProjectFile({
            projectFileHash: projectFileHash,
            projectName,
          });
        }
        Toast.success({
          content: intl.formatMessage({
            description: 'Restore successfully',
            defaultMessage: 'Restored',
          }),
        });
        setLoading(false);
        setShowModal(false);
        onClose();
      } catch (error) {
        Toast.error({
          content: intl.formatMessage({
            description: 'Restore error',
            defaultMessage: 'Fail to restore. Please try again later.',
          }),
        });
        setLoading(false);
        return;
      }
    };

    const onCancel = () => {
      setLoading(false);
      setShowModal(false);
    };

    return (
      <ModalView
        title={intl.formatMessage({
          description: 'Title of confirm restoring history version',
          defaultMessage: 'Restore',
        })}
        content={intl.formatMessage({
          description: 'Content of confirm restoring history version',
          defaultMessage: 'Overwrite current project with history version',
        })}
        confirmText={intl.formatMessage({
          description: 'Confirm restoring history version',
          defaultMessage: 'Restore',
        })}
        onConfirm={onConfirm}
        cancelText={intl.formatMessage({
          description: 'Cancel restoring history version',
          defaultMessage: 'Cancel',
        })}
        onCancel={onCancel}
        buttonSort={'rtl'}
        confirmLoading={loading}
      />
    );
  }, [editor, intl, loading, localDraft, localDraftName, onClose, projectFileHash, projectName, showModal]);

  const deleteModal = useMemo(() => {
    if (!showDeleteModal || !onDelete) return null;
    return (
      <ModalView
        title={intl.formatMessage({ description: 'Delete local draft title', defaultMessage: 'Delete' })}
        content={intl.formatMessage({ description: 'Confirm delete local draft', defaultMessage: 'Delete this local draft?' })}
        confirmText={intl.formatMessage({ description: 'Confirm delete local draft button', defaultMessage: 'Delete' })}
        cancelText={intl.formatMessage({ description: 'Cancel delete local draft button', defaultMessage: 'Cancel' })}
        onConfirm={() => { onDelete(); setShowDeleteModal(false); }}
        onCancel={() => setShowDeleteModal(false)}
        buttonSort="rtl"
      />
    );
  }, [intl, onDelete, showDeleteModal]);

  let desc: ReactNode;

  const img = localPreviewUrl ? (
      <div className={styles.localPreview}>
      <img className={styles.cardImg} src={localPreviewUrl} alt="local draft preview" width={160} height={160} />
      <span className={styles.localBadge}>{intl.formatMessage({ description: 'Local draft label', defaultMessage: 'Local draft' })}</span>
        {onDelete && <button type="button" className={styles.localDelete} aria-label={intl.formatMessage({ description: 'Delete local draft', defaultMessage: 'Delete local draft' })} onClick={(event) => { event.stopPropagation(); setShowDeleteModal(true); }}>×</button>}
    </div>
  ) : localDraft ? (
    <div className={styles.localPreview}>
      <div className={styles.cardImg}><span>VOXA</span></div>
      <span className={styles.localBadge}>{intl.formatMessage({ description: 'Local draft label', defaultMessage: 'Local draft' })}</span>
      {onDelete && <button type="button" className={styles.localDelete} aria-label={intl.formatMessage({ description: 'Delete local draft', defaultMessage: 'Delete local draft' })} onClick={(event) => { event.stopPropagation(); setShowDeleteModal(true); }}>×</button>}
    </div>
  ) : modelPreviewHash ? (
    <img
      className={styles.cardImg}
      onClick={() => setShowModal(true)}
      src={getContentUrl(modelPreviewHash)}
      alt="preview"
      width={160}
      height={160}
    />
  ) : undefined;

  if (localDraft) {
    desc = (
      <div className={styles.time}>
        <span>{modelName || intl.formatMessage({ description: 'Unnamed local draft', defaultMessage: 'Unnamed model' })}</span>
        {dateTime && <span>{dateTime.date} {dateTime.time}</span>}
      </div>
    );
  } else if (modelName) {
    desc = <span>{modelName}</span>;
  } else if (dateTime) {
    desc = (
      <div className={styles.time}>
        <span>{dateTime.date}</span>
        <span>{dateTime.time}</span>
      </div>
    );
  }

  return (
    <>
      <Card img={img} desc={desc} onClick={localDraft ? () => setShowModal(true) : undefined} />
      {restoreModal}
      {deleteModal}
    </>
  );
}
