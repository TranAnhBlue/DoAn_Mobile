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
  ];

  return candidates.find(Array.isArray) || [];
};

export const getEntityId = (item) => item?.id || item?._id || item?.uuid;

export const getApiErrorMessage = (error, fallback) => (
  error?.response?.data?.message
  || error?.response?.data?.title
  || error?.message
  || fallback
);
