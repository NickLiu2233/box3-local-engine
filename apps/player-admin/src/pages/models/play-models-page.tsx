import { DeleteOutlined, EditOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Form, Input, message, Modal, Space, Switch, Table, Tag } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import { playerAdminApi as api } from '../../player-admin-api';
import { PageToolbar } from '../../components/page-toolbar';
import { confirmAdminAction } from '../../components/confirm-admin-action';
import { useAdminRequest } from '../../hooks/use-admin-request';
import { dateTime, formatBytes } from '../../player-admin-format';

import type { PlayModel } from '@box/apis';

export function PlayModelsPage({ canManage }:{ canManage:boolean }) {
    const input = useRef<HTMLInputElement>(null);
    const [models, setModels] = useState<PlayModel[]>([]),
        [editing, setEditing] = useState<PlayModel>();
    const [form] = Form.useForm();
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
    const patch = async (
        model:PlayModel,
        values:{
            name?:string;
            author?:string;
            version?:string;
            description?:string;
            published?:boolean;
        },
    ) => {
        await api.patchApiPlayAdminModelsId({ params: { path: { id: model.id } }, body: values });
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
                            上传预览包
                        </Button>
                    ) : null}
                </Space>
            </PageToolbar>
            <Card>
                <p style={{ color: 'var(--player-admin-muted, #94a3b8)', marginTop: 0 }}>
                    上传 VOXA 导出的 .voxaplay 预览包，发布后即可在游玩端的“模型预览”中查看。
                </p>
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
                        if (file.size > 32 * 1024 * 1024) {
                            void message.error('预览包不能超过 32MB');
                            return;
                        }
                        void run(async () => {
                            await api.postApiPlayAdminModels({
                                headers: { 'Content-Type': 'application/octet-stream' },
                                body: file,
                                bodySerializer: (body) => body,
                            });
                            void message.success('模型预览已上传并发布');
                            await load();
                        });
                    }}
                />
                <Table<PlayModel>
                    rowKey="id"
                    loading={loading}
                    dataSource={models}
                    scroll={{ x: 760 }}
                    locale={{ emptyText: <Empty description="暂无模型预览" /> }}
                    columns={[
                        {
                            title: '模型名称',
                            dataIndex: 'name',
                            render: (_, model) => (
                                <Space direction="vertical" size={2}>
                                    <strong>{model.name}</strong>
                                    {model.author ? (
                                        <span style={{ color: '#94a3b8' }}>{model.author}</span>
                                    ) : null}
                                    {model.description ? (
                                        <span
                                            style={{
                                                color: '#94a3b8',
                                                maxWidth: 320,
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {model.description}
                                        </span>
                                    ) : null}
                                </Space>
                            ),
                        },
                        { title: '版本', dataIndex: 'version', width: 100 },
                        {
                            title: '动画',
                            dataIndex: 'animationCount',
                            width: 90,
                            render: (count) => <Tag>{count ? `${count} 个动画` : '静态模型'}</Tag>,
                        },
                        { title: '文件大小', dataIndex: 'bytes', width: 100, render: formatBytes },
                        {
                            title: '上传时间',
                            dataIndex: 'importedAt',
                            width: 170,
                            render: dateTime,
                        },
                        {
                            title: '已发布',
                            dataIndex: 'published',
                            width: 90,
                            render: (_, model) => (
                                <Switch
                                    checked={model.published}
                                    disabled={!canManage || loading}
                                    onChange={(published) =>
                                        void run(() => patch(model, { published }))
                                    }
                                />
                            ),
                        },
                        {
                            title: '操作',
                            width: 220,
                            render: (_, model) => (
                                <Space>
                                    <Button
                                        type="link"
                                        href={model.published ? model.previewUrl : undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        disabled={!model.published}
                                    >
                                        预览
                                    </Button>
                                    {canManage ? (
                                        <>
                                            <Button
                                                type="text"
                                                icon={<EditOutlined />}
                                                aria-label={`编辑 ${model.name}`}
                                                onClick={() => {
                                                    setEditing(model);
                                                    form.setFieldsValue(model);
                                                }}
                                            />
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                aria-label={`删除 ${model.name}`}
                                                onClick={() =>
                                                    confirmAdminAction({
                                                        title: `删除“${model.name}”？`,
                                                        content:
                                                            '删除后游玩端将无法再查看此模型预览。',
                                                        okButtonProps: { danger: true },
                                                        onOk: async () => {
                                                            await api.deleteApiPlayAdminModelsId({
                                                                params: { path: { id: model.id } },
                                                            });
                                                            await load();
                                                            void message.success('模型预览已删除');
                                                        },
                                                    })
                                                }
                                            />
                                        </>
                                    ) : null}
                                </Space>
                            ),
                        },
                    ]}
                />
            </Card>
            <Modal
                title="编辑模型预览"
                open={Boolean(editing)}
                onCancel={() => setEditing(undefined)}
                confirmLoading={loading}
                onOk={() =>
                    void run(async () => {
                        const values = await form.validateFields();
                        if (editing) {
                            await patch(editing, values);
                        }
                        setEditing(undefined);
                        void message.success('预览信息已保存');
                    })
                }
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="模型名称"
                        rules={[{ required: true, whitespace: true, max: 100 }]}
                    >
                        <Input maxLength={100} />
                    </Form.Item>
                    <Form.Item name="author" label="作者" rules={[{ max: 100 }]}>
                        <Input maxLength={100} placeholder="填写模型作者" />
                    </Form.Item>
                    <Form.Item
                        name="version"
                        label="版本"
                        rules={[{ required: true, whitespace: true, max: 50 }]}
                    >
                        <Input maxLength={50} placeholder="例如 v1.0.0" />
                    </Form.Item>
                    <Form.Item name="description" label="模型说明" rules={[{ max: 2000 }]}>
                        <Input.TextArea rows={4} maxLength={2000} showCount />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
