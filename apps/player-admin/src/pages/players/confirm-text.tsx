import { Input, Modal } from 'antd'

/** Opens a typed confirmation prompt for short administrative text input. */
export function confirmText(title: string, placeholder: string, onOk: (value: string) => void) {
  let value = ''
  Modal.confirm({
    title,
    content: <Input autoFocus placeholder={placeholder} onChange={(event) => { value = event.target.value }} />,
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      if (!value.trim()) return Promise.reject(new Error('请输入内容'))
      onOk(value.trim())
    },
  })
}
