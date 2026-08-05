import { memo, useCallback, useContext } from 'react';
import { useIntl } from 'react-intl';
import { Button, useClassName } from '@box-local/box-design';
import { VoxelEditorContext } from '../../internals';
import { useAppSelector } from '../../redux/store';
import { clientConfig } from '../../config/client';
import { SaveState } from '../../redux/app-slice';
import styles from './style.module.scss';

function PublishButtonView() {
  const editor = useContext(VoxelEditorContext);
  const intl = useIntl();

  const { isPublishing, isSaving } = useAppSelector(({ app }) => ({
    isPublishing: app.isPublishing,
    isSaving: app.saveState === SaveState.Saving,
  }));

  const save = useCallback(() => {
    if (!editor) {
      return;
    }

    editor.autoSaveBeforePublish({
      onSuccess: (res) => {
        const { modelId, modelName, modelPreviewHash, modelType } =
          res.modelResp;
        editor.iframeTool.emitPublishEvent({
          modelId,
          modelName,
          modelPreviewFileUrl: `${clientConfig.cdnPath}${modelPreviewHash}`,
          modelType,
        });
      },
    });
  }, [editor]);

  const className = useClassName([styles.button, styles.publish], []);

  let text: string | undefined;

  if (!isPublishing) {
    text = intl.formatMessage({
      defaultMessage: 'Publish',
      description: 'Publish button',
    });
  }

  return (
    <Button
      type="primary"
      className={className}
      disabled={isSaving}
      onClick={save}
      loading={isPublishing}
    >
      {text}
    </Button>
  );
}

export const PublishButton = memo(PublishButtonView);
