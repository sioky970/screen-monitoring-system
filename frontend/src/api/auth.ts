import request from './request'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: {
    id: number
    username: string
    email: string
    role: string
    realName?: string
  }
}

export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    request.post('/auth/login', data),
    
  logout: (): Promise<void> =>
    request.post('/auth/logout'),
    
  getProfile: (): Promise<any> =>
    request.get('/auth/profile'),
    
  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<void> =>
    request.post('/auth/change-password', data),
}