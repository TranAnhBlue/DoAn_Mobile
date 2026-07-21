import api from '../../../shared/api/client';

const supervisorApi = {
  getPlans: () => api.get('/cultivation-logbooks', { params: { PageIndex: 1, PageSize: 100 } }),
  getPlan: (id) => api.get(`/cultivation-logbooks/${id}`),
  getStages: (logbookId) => api.get(`/cultivation-stages/logbook/${logbookId}`),
  getUsers: () => api.get('/users', { params: { PageIndex: 1, PageSize: 100 } }),
  getUser: (id) => api.get(`/users/${id}`),
  getTasks: () => api.get('/cultivation-tasks', { params: { PageIndex: 1, PageSize: 100 } }),
  getTask: (id) => api.get(`/cultivation-tasks/${id}`),
  getTaskDailyLogs: (id) => api.get(`/cultivation-daily-logs/task/${id}`),
  getLandPlot: (id) => api.get(`/land-plots/${id}`),
  getLandPlotWeather: (id) => api.get(`/land-plots/${id}/weather`),
  getLandPlotLogs: (id) => api.get(`/land-plots/${id}/logs`),
  updateTask: (id, values) => api.put(`/cultivation-tasks/${id}`, values),
  startTask: (id) => api.post(`/cultivation-tasks/${id}/start`),
  getStageDailyLogs: (stageId) => api.get(`/cultivation-daily-logs/stage/${stageId}`),
  getStageSummary: (stageId) => api.get(`/cultivation-stages/${stageId}/summary`),
  getStageOfficialLogs: (stageId) => api.get(`/cultivation-stages/${stageId}/logs`),
  saveOfficialLog: (stageId, supervisorDescription) => api.post(`/cultivation-stages/${stageId}/official-logs`, { supervisorDescription }),
  submitCompletion: (logbookId) => api.post(`/cultivation-logbooks/${logbookId}/submit-completion`),
};

export default supervisorApi;
