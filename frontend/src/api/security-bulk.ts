import request from './request'

export const securityBulkApi = {
  // 首选POST + body，兼容代理/路径问题
  ignoreAllByClient: (clientId: string): Promise<any> =>
    request.post(`/security/alerts/ignore-all`, { clientId }),
  // 兼容：若服务端支持 Path 版本，可切换
  ignoreAllByClientPath: (clientId: string): Promise<any> =>
    request.put(`/security/alerts/ignore-all/${clientId}`),
}

