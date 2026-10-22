import { DeleteOutlined, EyeOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Dropdown, message, Space, Switch, Tag } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import { playerAdminApi as api } from '../../player-admin-api';
import { PageToolbar } from '../../components/page-toolbar';
import { PlayLibraryName, PlayLibraryPanel } from '../../components/play-library-panel';
import { confirmAdminAction } from '../../components/confirm-admin-action';
import { useAdminRequest } from '../../hooks/use-admin-request';
import { dateTime, formatBytes } from '../../player-admin-format';

import type { PlayModel } from '@box/apis';

export function PlayModelsPage({ canManage }:{ canManage:boolean }) {
    const input = useRef<HTMLInputElement>(null);
    const [models, setModels] = useState<PlayModel[]>([]);
    const { loading, run } = useAdminRequest();
    const load = useCallback(
        () =>
            run(async () => {
                const result = await api.getApiPlayAdminModels();
                setModels(result.models);
            }),
        [run],
    );
    useEffect(() => {
        void load();
    }, [load]);
    const patch = async (model:PlayModel, published:boolean) => {
        await api.patchApiPlayAdminModelsId({ params: { path: { id: model.id } }, body: { published } });
        await load();
    };
    return (
        <>
            <PageToolbar title="模型预览">
                <Space>
                    <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
                        刷新
                    </Button>
                    {canManage ? (
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            loading={loading}
                            onClick={() => input.current?.click()}
                        >
                            导入预览包
                        </Button>
                    ) : null}
                </Space>
            </PageToolbar>
            <input
                ref={input}
                type="file"
                accept=".voxaplay"
                hidden
                disabled={!canManage || loading}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) {
                        return;
                    }
                    if (!file.name.toLowerCase().endsWith('.voxaplay')) {
                        void message.error('请选择 .voxaplay 预览包');
                        return;
                    }
                    void run(async () => {
                        await api.postApiPlayAdminModels({
                            headers: { 'Content-Type': 'application/octet-stream' },
                            body: file,
                            bodySerializer: (body) => body,
                        });
                        void message.success('模型预览已导入');
                        await load();
                    });
                }}
            />
            <PlayLibraryPanel<PlayModel>
                title="已导入模型"
                summary={`${models.length} 个模型`}
                items={models}
                emptyDescription="暂无模型预览"
                importLabel="导入预览包"
                canManage={canManage}
                onImport={() => input.current?.click()}
                table={{
                    rowKey: 'id',
                    columns: [
                        {
                            title: '模型',
                            width: '28%',
                            render: (_, model) => (
                                <PlayLibraryName name={model.name} version={model.version} />
                            ),
                        },
                        {
                            title: '模型 ID',
                            width: '26%',
                            render: (_, model) => <code title={model.id}>{model.id}</code>,
                        },
                        {
                            title: '动画与资源',
                            width: '16%',
                            render: (_, model) => (
                                <span className="player-admin-map-summary">
                                    {model.animationCount
                                        ? `${model.animationCount} 个动画`
                                        : '静态模型'}{' '}
                                    · {formatBytes(model.bytes)}
                                </span>
                            ),
                        },
                        {
                            title: '导入时间',
                            width: '16%',
                            render: (_, model) => dateTime(model.importedAt),
                        },
                        {
                            title: '状态与操作',
                            width: '14%',
                            render: (_, model) => (
                                <Space size={8}>
                                    {canManage ? (
                                        <Switch
                                            checked={model.published}
                                            disabled={loading}
                                            checkedChildren="开放"
                                            unCheckedChildren="关闭"
                                            onChange={(published) =>
                                                void run(() => patch(model, published))
                                            }
                                        />
                                    ) : (
                                        <Tag color={model.published ? 'success' : 'default'}>
                                            {model.published ? '已开放' : '已关闭'}
                                        </Tag>
                                    )}
                                    <Dropdown
                                        menu={{
                                            items: [
                                                {
                                                    key: 'preview',
                                                    icon: <EyeOutlined />,
                                                    disabled: !model.published,
                                                    label: (
                                                        <a
                                                            href={
                                                                model.published
                                                                    ? model.previewUrl
                                                                    : undefined
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            预览模型
                                                        </a>
                                                    ),
                                                },
                                                ...(canManage
                                                    ? [
                                                          { type: 'divider' as const },
                                                          {
                                                              key: 'delete',
                                                              label: '删除模型',
                                                              danger: true,
                                                              icon: <DeleteOutlined />,
                                                              onClick: () =>
                                                                  confirmAdminAction({
                                                                      title: `删除“${model.name}”？`,
                                                                      content:
                                                                          '删除后游玩端将无法再查看此模型预览。',
                                                                      okButtonProps: {
                                                                          danger: true,
                                                                      },
                                                                      onOk: async () => {
                                                                          await api.deleteApiPlayAdminModelsId(
                                                                              {
                                                                                  params: {
                                                                                      path: {
                                                                                          id: model.id,
                                                                                      },
                                                                                  },
                                                                              },
                                                                          );
                                                                          await load();
                                                                          void message.success(
                                                                              '模型预览已删除',
                                                                          );
                                                                      },
                                                                  }),
                                                          },
                                                      ]
                                                    : []),
                                            ],
                                        }}
                                    >
                                        <Button type="text">更多</Button>
                                    </Dropdown>
                                </Space>
                            ),
                        },
                    ],
                }}
            />
        </>
    );
}
