import api, { authSessionClient } from '../../../shared/api/client';

export const unwrapApiData = (body) => body?.data ?? body;

export const extractAuthSession = (body) => {
  const payload = unwrapApiData(body) || {};
  const tokenPayload = payload.tokens && typeof payload.tokens === 'object'
    ? payload.tokens
    : payload.token && typeof payload.token === 'object'
      ? payload.token
      : payload;
  const user = payload.user || payload.account || payload.profile || payload;

  return {
    accessToken: tokenPayload.accessToken
      || tokenPayload.token
      || payload.accessToken
      || (typeof payload.token === 'string' ? payload.token : null),
    refreshToken: tokenPayload.refreshToken || payload.refreshToken,
    user,
  };
};

export const normalizeUser = (rawUser = {}) => {
  const source = rawUser.user || rawUser.account || rawUser.profile || rawUser;
  const roles = Array.isArray(source.roles)
    ? source.roles
    : source.role
      ? [source.role]
      : [];
  const role = source.role || roles[0] || '';

  return {
    ...source,
    id: source.id || source.userId,
    userId: source.userId || source.id,
    username: source.username || source.email,
    fullname: source.fullname || source.fullName || source.name,
    fullName: source.fullName || source.fullname || source.name,
    email: source.email || '',
    phone: source.phone || source.phoneNumber || '',
    phoneNumber: source.phoneNumber || source.phone || '',
    avatar: source.avatar || source.avatarUrl || '',
    avatarUrl: source.avatarUrl || source.avatar || '',
    role,
    roles,
  };
};

const authApi = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  refreshToken: (refreshToken) => authSessionClient.post('/auth/refresh-token', { refreshToken }),
  logout: (refreshToken) => authSessionClient.post('/auth/logout', { refreshToken }),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (values) => api.post('/auth/change-password', values),
};

export default authApi;
