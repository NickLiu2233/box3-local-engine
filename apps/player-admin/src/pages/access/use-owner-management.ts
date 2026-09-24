import { Form, message } from 'antd'
import { useCallback, useState } from 'react'

import { capabilityLeaves } from './permission-tree'
import { playerAdminApi as api } from '../../player-admin-api'
import type { Admin, Group } from '../../player-admin-types'

type AdminFormValues = {
  username?: string
  displayName: string
  password?: string
  permissionGroupId?: string
}

/** Owns management-account and permission-group persistence and editor state. */
export function useOwnerManagement() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin>()
  const [editingGroup, setEditingGroup] = useState<Group>()
  const [adminForm] = Form.useForm()
  const [groupForm] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [adminResult, groupResult] = await Promise.all([
        api.getApiPlayAdminAdmins(),
        api.getApiPlayAdminPermissionGroups(),
      ])
      setAdmins(adminResult.admins || [])
      setGroups(groupResult.groups || [])
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const openAdminEditor = (admin?: Admin) => {
    setEditingAdmin(admin)
    adminForm.setFieldsValue(
      admin
        ? {
            ...admin,
            password: '',
            permissions: [],
            permissionGroupId: admin.permissionGroupId || undefined,
          }
        : { permissions: [], permissionGroupId: undefined },
    )
    setAdminOpen(true)
  }

  const closeAdminEditor = () => {
    setAdminOpen(false)
    setEditingAdmin(undefined)
    adminForm.resetFields()
  }

  const saveAdmin = async () => {
    let values: AdminFormValues
    try {
      values = await adminForm.validateFields()
    } catch {
      return
    }
    try {
      const payload = editingAdmin
        ? {
            displayName: values.displayName,
            permissionGroupId: values.permissionGroupId,
            ...(values.password ? { password: values.password } : {}),
          }
        : values
      if (editingAdmin) {
        await api.patchApiPlayAdminAdminsId({
          params: { path: { id: editingAdmin.id } },
          body: payload,
        })
      } else {
        await api.postApiPlayAdminAdmins({ body: payload })
      }
      message.success(editingAdmin ? '管理账号已更新' : '管理账号已创建')
      closeAdminEditor()
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const removeAdmin = async (admin: Admin) => {
    try {
      await api.deleteApiPlayAdminAdminsId({ params: { path: { id: admin.id } } })
      message.success('管理账号已删除')
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const openGroupEditor = (group?: Group) => {
    setEditingGroup(group)
    groupForm.setFieldsValue(
      group ? { name: group.name, permissions: group.permissions } : { name: '', permissions: [] },
    )
    setGroupOpen(true)
  }

  const closeGroupEditor = () => {
    setGroupOpen(false)
    setEditingGroup(undefined)
    groupForm.resetFields()
  }

  const saveGroup = async () => {
    try {
      const values = await groupForm.validateFields()
      const payload = { ...values, permissions: capabilityLeaves(values.permissions) }
      if (editingGroup) {
        await api.patchApiPlayAdminPermissionGroupsId({
          params: { path: { id: editingGroup.id } },
          body: payload,
        })
      } else {
        await api.postApiPlayAdminPermissionGroups({ body: payload })
      }
      message.success(editingGroup ? '权限组已更新' : '权限组已创建')
      closeGroupEditor()
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const removeGroup = async (group: Group) => {
    try {
      await api.deleteApiPlayAdminPermissionGroupsId({ params: { path: { id: group.id } } })
      message.success('权限组已删除')
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return {
    admins,
    groups,
    loading,
    load,
    adminDialog: {
      form: adminForm,
      open: adminOpen,
      editing: editingAdmin,
      openEditor: openAdminEditor,
      close: closeAdminEditor,
      save: saveAdmin,
    },
    groupDialog: {
      form: groupForm,
      open: groupOpen,
      editing: editingGroup,
      openEditor: openGroupEditor,
      close: closeGroupEditor,
      save: saveGroup,
    },
    removeAdmin,
    removeGroup,
  }
}
