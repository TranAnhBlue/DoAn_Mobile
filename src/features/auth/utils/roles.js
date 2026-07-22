export const ROLES = {
  FARMER: 'FARMER',
  FARM_LEADER: 'FARM_LEADER',
  FARM_SUPERVISOR: 'FARM_SUPERVISOR',
};

const LEGACY_ROLE_MAP = {
  FARMER: ROLES.FARMER,
  USER: ROLES.FARMER,
  FARM_LEADER: ROLES.FARM_LEADER,
  LEADER: ROLES.FARM_LEADER,
  FARM_SUPERVISOR: ROLES.FARM_SUPERVISOR,
  SUPERVISOR: ROLES.FARM_SUPERVISOR,
};

export const normalizeRole = (role) => LEGACY_ROLE_MAP[String(role || '').toUpperCase()] || String(role || '').toUpperCase();

export const isFarmer = (role) => normalizeRole(role) === ROLES.FARMER;
export const isFarmLeader = (role) => normalizeRole(role) === ROLES.FARM_LEADER;
export const isFarmSupervisor = (role) => normalizeRole(role) === ROLES.FARM_SUPERVISOR;

export const roleLabel = (role) => ({
  [ROLES.FARMER]: 'Nông dân',
  [ROLES.FARM_LEADER]: 'Trưởng nhóm',
  [ROLES.FARM_SUPERVISOR]: 'Giám sát nông trại',
}[normalizeRole(role)] || role || 'Thành viên');

export default {
  ROLES,
  normalizeRole,
  isFarmer,
  isFarmLeader,
  isFarmSupervisor,
  roleLabel,
};
