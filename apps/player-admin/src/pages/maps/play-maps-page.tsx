import { confirmAdminAction } from '../../components/confirm-admin-action'
import { useAdminRequest } from '../../hooks/use-admin-request'
import { reportAdminError } from '../../player-admin-errors'
import { PageToolbar } from '../../components/page-toolbar'
import {
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  FileImageOutlined,
  ReloadOutlined,
  SoundOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Space,
  Switch,
  Table as AntTable,
  Tabs,
  Tag,
} from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { playerAdminApi as api } from '../../player-admin-api'
import { dateTime, formatBytes } from '../../player-admin-format'
import { buildPlayMapTableRows, groupPlayMaps } from './play-map-table'
import type {
  PlayBundleReview,
  PlayMap,
  PlayMapResourceStatus,
  PlayMapTableRow,
} from '../../player-admin-types'

export function PlayMapsPage({ canManage }: { canManage: boolean }) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [worlds, setWorlds] = useState<PlayMap[]>([])
  const [statuses, setStatuses] = useState<Record<string, PlayMapResourceStatus>>({})
  const { loading, run } = useAdminRequest()
  const [editing, setEditing] = useState<PlayMap>()
  const [review, setReview] = useState<PlayBundleReview>()
  const [reviewFile, setReviewFile] = useState<File>()
  const [preview, setPreview] = useState<{
    resource: PlayBundleReview['resources'][number]
    content: string
  }>()
  const [reviewWorldId, setReviewWorldId] = useState('')
  const [reviewCategory, setReviewCategory] = useState('script')
  const [form] = Form.useForm()
  const load = useCallback(
    () =>
      run(async () => {
        const [maps, resourceStatus] = await Promise.all([
          api.getApiPlayAdminLibrarySection({
            params: { path: { section: 'worlds' } },
          }) as Promise<{
            worlds: PlayMap[]
          }>,
          api.getApiPlayAdminLibrarySection({
            params: { path: { section: 'world-status' } },
          }) as Promise<{ worlds: PlayMapResourceStatus[] }>,
        ])
        setWorlds(maps.worlds || [])
        setStatuses(
          Object.fromEntries((resourceStatus.worlds || []).map((item) => [item.id, item])),
        )
      }),
    [run],
  )
  useEffect(() => {
    void load()
  }, [load])
  const groups = useMemo(() => groupPlayMaps(worlds), [worlds])
  const tableRows = useMemo(() => buildPlayMapTableRows(groups, statuses), [groups, statuses])
  const patchWorld = async (world: PlayMap, values: Record<string, unknown>) => {
    await api.patchApiPlayAdminLibrarySectionId({
      params: { path: { section: 'worlds', id: world.id } },
      body: values,
    })
    await load()
  }
  const saveWorld = async () => {
    if (!editing) return
    try {
      const values = await form.validateFields()
      await patchWorld(editing, { publicId: String(values.publicId).toLowerCase() })
      setEditing(undefined)
      message.success('地图访问 ID 已保存')
    } catch (error) {
      reportAdminError(error)
    }
  }
  const removeWorld = (world: PlayMap) =>
    confirmAdminAction({
      title: world.mapRole === 'main' ? '删除地图组' : '删除副地图',
      content:
        world.mapRole === 'main'
          ? '将永久删除这个主地图及其副地图，且无法恢复。'
          : `将永久删除“${world.name}”，且无法恢复。`,
      okText: '永久删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await api.deleteApiPlayAdminLibrarySectionId({
          params: { path: { section: 'worlds', id: world.id } },
          body: {},
        })
        message.success('地图已删除')
        await load()
      },
    })
  const inspectBundle = async (file: File) => {
    return run(async () => {
      const result = (await api.postApiPlayAdminLibraryImport({
        params: { query: { mode: 'preview' } },
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
        bodySerializer: (body) => body,
      })) as { review: PlayBundleReview }
      setReview(result.review)
      setReviewFile(file)
      setReviewWorldId(result.review.worlds[0]?.id || '')
      setReviewCategory('script')
      setPreview(undefined)
    })
  }
  const cancelReview = async () => {
    if (review)
      await api
        .deleteApiPlayAdminLibraryImport({
          params: { query: { reviewId: review.id } },
          body: {},
        })
        .catch(() => undefined)
    if (preview?.resource.kind !== 'script' && preview?.content)
      URL.revokeObjectURL(preview.content)
    setPreview(undefined)
    setReview(undefined)
    setReviewFile(undefined)
    setReviewWorldId('')
  }
  const confirmImport = async () => {
    if (!review) return
    return run(async () => {
      await api.postApiPlayAdminLibraryImport({
        params: { query: { mode: 'confirm', reviewId: review.id } },
        body: {},
      })
      message.success(`已导入 ${review.mapCount} 张地图`)
      await cancelReview()
      await load()
    })
  }
  const previewResource = async (resource: PlayBundleReview['resources'][number]) => {
    if (!review || !resource.previewable) return
    try {
      const options = {
        params: {
          query: { mode: 'resource', reviewId: review.id, resourceId: resource.id },
        },
      } as const
      if (resource.kind === 'script') {
        const content = await api.getApiPlayAdminLibraryImport({ ...options, parseAs: 'text' })
        setPreview({ resource, content })
      } else {
        const content = await api.getApiPlayAdminLibraryImport({ ...options, parseAs: 'blob' })
        setPreview({ resource, content: URL.createObjectURL(content) })
      }
    } catch (error) {
      reportAdminError(error)
    }
  }
  return (
    <>
      <PageToolbar title="游玩地图">
        <Space>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            刷新
          </Button>
          {canManage ? (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={loading}
              onClick={() => uploadRef.current?.click()}
            >
              导入游玩包
            </Button>
          ) : null}
        </Space>
      </PageToolbar>
      <input
        ref={uploadRef}
        hidden
        type="file"
        accept=".boxplay,.tar.gz,.tgz,application/gzip"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.currentTarget.value = ''
          if (file) void inspectBundle(file)
        }}
      />
      {groups.length ? (
        <Card
          className="player-admin-panel player-admin-map-directory"
          title="已导入地图"
          extra={
            <span className="player-admin-muted">
              {groups.length} 个地图组 · {worlds.length} 张地图
            </span>
          }
        >
          <AntTable
            className="player-admin-map-table"
            tableLayout="fixed"
            size="middle"
            pagination={false}
            rowKey="key"
            dataSource={tableRows}
            expandable={{
              expandRowByClick: false,
              rowExpandable: (row) => row.kind === 'group' && Boolean(row.children?.length),
            }}
            columns={[
              {
                title: '地图',
                width: '29%',
                render: (_, row: PlayMapTableRow) => (
                  <div className="player-admin-map-name">
                    <span className="player-admin-map-title" title={row.map.name}>
                      {row.map.name}
                    </span>
                    {row.map.version ? (
                      <span className="player-admin-map-version">
                        v{row.map.version.replace(/^v/i, '')}
                      </span>
                    ) : null}
                  </div>
                ),
              },
              {
                title: '地图 ID',
                width: '29%',
                render: (_, row: PlayMapTableRow) => (
                  <code title={row.map.permanentMapId}>{row.map.permanentMapId}</code>
                ),
              },
              {
                title: '地图与资源',
                width: '16%',
                render: (_, row: PlayMapTableRow) =>
                  row.kind === 'group' ? (
                    <span className="player-admin-map-summary">
                      {row.mapCount} 张地图 · {formatBytes(row.resourceBytes)}
                    </span>
                  ) : (
                    '—'
                  ),
              },
              {
                title: '导入时间',
                width: '16%',
                render: (_, row: PlayMapTableRow) => dateTime(statuses[row.map.id]?.importedAt),
              },
              {
                title: '状态与操作',
                width: '10%',
                render: (_, row: PlayMapTableRow) =>
                  row.kind === 'submap' ? (
                    canManage ? (
                      <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditing(row.map)
                          form.setFieldsValue({ publicId: row.map.publicId })
                        }}
                      >
                        设置
                      </Button>
                    ) : (
                      '—'
                    )
                  ) : (
                    <Space size={8}>
                      {canManage ? (
                        <Switch
                          checked={row.map.playEnabled !== false}
                          checkedChildren="开放"
                          unCheckedChildren="关闭"
                          onChange={(playEnabled) =>
                            void patchWorld(row.map, { playEnabled })
                              .then(() =>
                                message.success(playEnabled ? '地图组已开放' : '地图组已关闭'),
                              )
                              .catch(reportAdminError)
                          }
                        />
                      ) : (
                        <Tag color={row.map.playEnabled !== false ? 'success' : 'default'}>
                          {row.map.playEnabled !== false ? '已开放' : '已关闭'}
                        </Tag>
                      )}{' '}
                      {canManage ? (
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'settings',
                                label: '设置访问 ID',
                                icon: <EditOutlined />,
                                onClick: () => {
                                  setEditing(row.map)
                                  form.setFieldsValue({ publicId: row.map.publicId })
                                },
                              },
                              { type: 'divider' },
                              {
                                key: 'delete',
                                label: '删除地图组',
                                danger: true,
                                icon: <DeleteOutlined />,
                                onClick: () => removeWorld(row.map),
                              },
                            ],
                          }}
                        >
                          <Button type="text">更多</Button>
                        </Dropdown>
                      ) : null}
                    </Space>
                  ),
              },
            ]}
          />
        </Card>
      ) : (
        <Card className="player-admin-panel">
          <Empty description="暂无游玩地图">
            {canManage ? (
              <Button type="primary" onClick={() => uploadRef.current?.click()}>
                导入游玩包
              </Button>
            ) : null}
          </Empty>
        </Card>
      )}
      <Modal
        title="地图设置"
        open={Boolean(editing)}
        onCancel={() => setEditing(undefined)}
        onOk={() => void saveWorld()}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="publicId"
            label="访问 ID"
            rules={[
              {
                required: true,
                pattern: /^[a-z0-9][a-z0-9-]{0,62}$/,
                message: '使用小写字母、数字或连字符，最长 63 位',
              },
            ]}
          >
            <Input
              addonBefore="/p/"
              maxLength={63}
              onChange={(event) =>
                form.setFieldValue(
                  'publicId',
                  event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                )
              }
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="检查游玩包"
        open={Boolean(review)}
        width={1040}
        wrapClassName="play-bundle-review-modal"
        onCancel={() => void cancelReview()}
        footer={
          <Space>
            <Button onClick={() => void cancelReview()}>取消</Button>
            <Button type="primary" loading={loading} onClick={() => void confirmImport()}>
              确认导入
            </Button>
          </Space>
        }
      >
        {review ? (
          <>
            <div className="play-bundle-review-summary">
              <div className="play-bundle-review-file">
                <span>导入文件</span>
                <strong title={reviewFile?.name}>{reviewFile?.name || '游玩包'}</strong>
              </div>
              <div>
                <span>地图数量</span>
                <strong>{review.mapCount} 张</strong>
              </div>
              <div>
                <span>资源内容</span>
                <strong>
                  {formatBytes(review.totalBytes)} · {review.blobCount} 个
                </strong>
              </div>
            </div>
            {review.warnings.length ? (
              <div className="play-bundle-review-warnings">
                <strong>检查提示</strong>
                {review.warnings.map((warning, index) => (
                  <div key={index}>{warning}</div>
                ))}
              </div>
            ) : null}
            <div className="play-bundle-review-workspace">
              <section className="play-bundle-review-map-list">
                <div className="play-bundle-review-section-title">地图</div>
                <div className="play-bundle-review-scroll">
                  {review.worlds.map((world) => (
                    <button
                      key={world.id}
                      type="button"
                      className={`play-bundle-review-item ${
                        reviewWorldId === world.id ? 'is-selected' : ''
                      }`}
                      onClick={() => {
                        setReviewWorldId(world.id)
                        setPreview(undefined)
                      }}
                    >
                      <strong>{world.name}</strong>
                      <span>
                        {world.mapRole === 'main' ? '主地图' : '副地图'}
                        {world.version ? ` · ${world.version}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="play-bundle-review-resource-list">
                <Tabs
                  activeKey={reviewCategory}
                  onChange={(key) => {
                    setReviewCategory(key)
                    setPreview(undefined)
                  }}
                  items={[
                    {
                      key: 'script',
                      label: (
                        <Space size={4}>
                          <CodeOutlined />
                          脚本
                        </Space>
                      ),
                    },
                    {
                      key: 'image',
                      label: (
                        <Space size={4}>
                          <FileImageOutlined />
                          图片
                        </Space>
                      ),
                    },
                    {
                      key: 'audio',
                      label: (
                        <Space size={4}>
                          <SoundOutlined />
                          音频
                        </Space>
                      ),
                    },
                  ]}
                />
                <div className="play-bundle-review-scroll">
                  {review.resources
                    .filter(
                      (resource) =>
                        resource.worldId === reviewWorldId && resource.kind === reviewCategory,
                    )
                    .map((resource) => (
                      <button
                        key={resource.id}
                        type="button"
                        disabled={!resource.previewable}
                        className={`play-bundle-review-item ${
                          preview?.resource.id === resource.id ? 'is-selected' : ''
                        }`}
                        onClick={() => void previewResource(resource)}
                      >
                        <strong title={resource.name}>{resource.name}</strong>
                        <span>
                          {formatBytes(resource.bytes)}
                          {resource.scriptTarget ? ` · ${resource.scriptTarget}` : ''}
                          {resource.previewable ? '' : ' · 无法预览'}
                        </span>
                      </button>
                    ))}
                  {!review.resources.some(
                    (resource) =>
                      resource.worldId === reviewWorldId && resource.kind === reviewCategory,
                  ) ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有此类资源" />
                  ) : null}
                </div>
              </section>
              <section className="play-bundle-review-preview">
                {preview ? (
                  <>
                    <div className="play-bundle-review-preview-head">
                      <strong title={preview.resource.name}>{preview.resource.name}</strong>
                      <span>
                        {preview.resource.mimeType} · {formatBytes(preview.resource.bytes)}
                      </span>
                    </div>
                    {preview.resource.kind === 'script' ? (
                      preview.content ? (
                        <pre className="play-bundle-review-code">{preview.content}</pre>
                      ) : (
                        <Empty description="该脚本为空" />
                      )
                    ) : preview.resource.kind === 'image' ? (
                      <div className="play-bundle-review-image">
                        <img src={preview.content} alt={preview.resource.name} />
                      </div>
                    ) : preview.resource.kind === 'audio' ? (
                      <div className="play-bundle-review-audio">
                        <audio controls src={preview.content} />
                      </div>
                    ) : (
                      <a href={preview.content} target="_blank" rel="noreferrer">
                        打开资源预览
                      </a>
                    )}
                  </>
                ) : (
                  <Empty description="选择资源以预览">
                    <span className="player-admin-muted">预览不会执行脚本或启动地图</span>
                  </Empty>
                )}
              </section>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  )
}
