import { Modal } from 'antd'
import type { ModalFuncProps } from 'antd'
import { reportAdminError } from '../player-admin-errors'

/** Uncaught failures keep the confirmation open; every page gets the same error handling. */
export function confirmAdminAction({ onOk, ...options }: ModalFuncProps) {
  return Modal.confirm({
    okText: '确认',
    cancelText: '取消',
    ...options,
    onOk: onOk
      ? async () => {
          try {
            return await onOk()
          } catch (error) {
            reportAdminError(error)
            throw error
          }
        }
      : undefined,
  })
}
