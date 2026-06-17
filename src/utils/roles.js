export const ROLES = {
  FARMER: 'FARMER',
};

const LEGACY_ROLE_MAP = {
  FARMER: ROLES.FARMER,
  USER: ROLES.FARMER,
};

export const normalizeRole = (role) => LEGACY_ROLE_MAP[String(role || '').toUpperCase()] || String(role || '').toUpperCase();

export const isFarmer = (role) => normalizeRole(role) === ROLES.FARMER;

export const roleLabel = (role) => ({
  [ROLES.FARMER]: 'Nông dân',
}[normalizeRole(role)] || role || 'Thành viên');
