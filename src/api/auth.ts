import type { ApiClient } from './client';
import type {
  AuthProvidersResponse,
  AuthResponse,
  IdTokenProvider,
  IdTokenSignInRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
} from './types';

export const authApi = (client: ApiClient) => ({
  register: (body: RegisterRequest) =>
    client.post<AuthResponse>('/api/auth/register', body, { auth: false }),
  login: (body: LoginRequest) =>
    client.post<AuthResponse>('/api/auth/login', body, { auth: false }),
  idTokenSignIn: (provider: IdTokenProvider, body: IdTokenSignInRequest) =>
    client.post<AuthResponse>(`/api/auth/oauth/${provider}/id-token`, body, { auth: false }),
  providers: () => client.get<AuthProvidersResponse>('/api/auth/providers', { auth: false }),
  refresh: (body: RefreshTokenRequest) =>
    client.post<AuthResponse>('/api/auth/refresh', body, { auth: false }),
  logout: (body: RefreshTokenRequest) =>
    client.post<void>('/api/auth/logout', body, { auth: false }),
});
