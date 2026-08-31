# 与 boxes 的核心对齐基线

本项目复用地图 schema、Blob/hash、地图 UUID、地图组、脚本 API、运行时协议与 MuDB 兼容边界。修改这些接口前必须有明确回归。

Local Engine 自己实现部署、离线镜像、玩家服务、启动器和本地管理能力；这些不需要与 boxes 同源。

## 已移除的平台能力

以下平台专属 API 不进入本地引擎：

- `world.onPlayerPurchaseSuccess`
- `world.nextPlayerPurchaseSuccess`
- `GamePurchaseSuccessEvent`
- `SocialType`
- `SocialStatisticType`

支付、社交统计、临时聊天、商城与平台分析均不属于本地发行范围。

## 变更要求

修改地图身份、发布包、运行时通信或脚本 API 时，验证 Creator 保存、Play 导入、主副地图、Teleport、资源读取和多人连接。兼容性不等于复制所有平台业务功能。
