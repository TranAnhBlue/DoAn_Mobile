export const unwrapPayload = (body) => body?.data ?? body ?? {};

export const extractItems = (body) => {
  const payload = unwrapPayload(body);
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload.items,
    payload.records,
    payload.results,
    payload.data,
    payload.content,
    payload.list,
    payload.pageData,
    payload.logs,
    payload.dailyLogs,
    payload.tasks,
    payload.members,
    payload.users,
  ];

  return candidates.find(Array.isArray) || [];
};

export const getEntityId = (item) => item?.id || item?._id || item?.uuid;

export const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.Message) return data.Message;
  if (data?.detail) return data.detail;
  if (data?.title) return data.title;
  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flat().join('\n');
    if (messages.trim()) return messages;
  }
  return error?.message || fallback;
};
