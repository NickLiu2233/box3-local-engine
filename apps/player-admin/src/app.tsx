import { ConfigProvider } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import type { ReactNode } from 'react'
import 'antd/dist/antd.css'
import './global.less'

export function rootContainer(container: ReactNode) {
  return (
    <ConfigProvider locale={zhCN} componentSize="middle">
      {container}
    </ConfigProvider>
  )
}
