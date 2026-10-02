// 唯一浏览器入口；打包为本地 app.js，不加载 CDN 或服务端配置。
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Portal } from './app'
createRoot(document.querySelector('#root')).render(<Portal />)
