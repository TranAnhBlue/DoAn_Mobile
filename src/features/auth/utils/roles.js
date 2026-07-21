export const ROLES = {
  FARMER: 'FARMER',
  FARM_LEADER: 'FARM_LEADER',
  FARM_SUPERVISOR: 'FARM_SUPERVISOR',
};

const LEGACY_ROLE_MAP = {
  FARMER: ROLES.FARMER,
  USER: ROLES.FARMER,
  FARMLEADER: ROLES.FARM_LEADER,
  FARM_LEADER: ROLES.FARM_LEADER,
  FARMSUPERVISOR: ROLES.FARM_SUPERVISOR,
  FARM_SUPERVISOR: ROLES.FARM_SUPERVISOR,
};

export const normalizeRole = (role) => LEGACY_ROLE_MAP[String(role || '').toUpperCase()] || String(role || '').toUpperCase();

export const isFarmer = (role) => normalizeRole(role) === ROLES.FARMER;
export const isFarmSupervisor = (role) => normalizeRole(role) === ROLES.FARM_SUPERVISOR;

export const roleLabel = (role) => ({
  [ROLES.FARMER]: 'Nông dân',
  [ROLES.FARM_LEADER]: 'Trưởng nhóm nông trại',
  [ROLES.FARM_SUPERVISOR]: 'Giám sát nông trại',
}[normalizeRole(role)] || role || 'Thành viên');
