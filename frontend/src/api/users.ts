import request from './request'

export interface User {
  id: number
  username: string
  email: string
  realName?: string
  phone?: string
  role: 'admin' | 'operator' | 'viewer'
  isActive: boolean
  createdAt: string
  lastLogin?: string
  loginCount: number
}

export interface CreateUserRequest {
  username: string
  password: string
  email: string
  realName?: string
  phone?: string
  role: 'admin' | 'operator' | 'viewer'
}

export interface UpdateUserRequest {
  username?: string
  email?: string
  realName?: string
  phone?: string
  role?: 'admin' | 'operator' | 'viewer'
  newPassword?: string
}

export interface QueryUsersRequest {
  page?: number
  pageSize?: number
  search?: string
  role?: string
}

export interface UsersResponse {
  data: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const usersApi = {
  getUsers: (params: QueryUsersRequest): Promise<UsersResponse> =>
    request.get('/users', { params }),
    
  getUserById: (id: number): Promise<User> =>
    request.get(`/users/${id}`),
    
  createUser: (data: CreateUserRequest): Promise<User> =>
    request.post('/users', data),
    
  updateUser: (id: number, data: UpdateUserRequest): Promise<User> =>
    request.put(`/users/${id}`, data),
    
  updateUserStatus: (id: number, isActive: boolean): Promise<void> =>
    request.put(`/users/${id}/status`, { isActive }),
    
  deleteUser: (id: number): Promise<void> =>
    request.delete(`/users/${id}`),
    
  getStats: (): Promise<any> =>
    request.get('/users/stats'),
}