// 导航不是权限凭据，服务端会把回跳地址收敛到已配置 Origin。
const navigationQuery = new URLSearchParams(location.search)
export const navigation = {
  source: navigationQuery.get('source') || '',
  returnUrl: navigationQuery.get('returnUrl') || '',
}
