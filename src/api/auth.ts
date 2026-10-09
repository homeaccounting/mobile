import type { ApiClient } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest } from './types';

export const authApi = (client: ApiClient) => ({
  register: (body: RegisterRequest) => client.post<AuthResponse>('/api/auth/register', body),
  login: (body: LoginRequest) => client.post<AuthResponse>('/api/auth/login', body),
});
