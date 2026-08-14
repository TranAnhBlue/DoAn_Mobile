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

const cleanFloatNumbers = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(/(\d+\.\d{3,})/g, (match) => {
    const num = Number(match);
    return isNaN(num) ? match : String(Math.round(num * 100) / 100);
  });
};

export const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  // 1. Ưu tiên bóc tách mảng errors chi tiết (VD: "Tồn kho không đủ cho vật tư HAC 1-1,5. (Cần: 500 kg, Hiện có: 22 kg)")
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const errorList = data.errors
      .map((e) => (typeof e === 'string' ? e : e?.message || e?.description || ''))
      .filter(Boolean)
      .map(cleanFloatNumbers);
    if (errorList.length > 0) {
      return errorList.join('\n');
    }
  }

  // 2. Bóc tách fieldErrors nếu có
  if (Array.isArray(data?.fieldErrors) && data.fieldErrors.length > 0) {
    const fieldList = data.fieldErrors
      .map((f) => f?.message || f?.errorMessage || '')
      .filter(Boolean)
      .map(cleanFloatNumbers);
    if (fieldList.length > 0) {
      return fieldList.join('\n');
    }
  }

  // 3. Object-based errors (VD: { "Fertilizer": ["..."] })
  if (data?.errors && typeof data.errors === 'object') {
    const vals = Object.values(data.errors).flat().filter(Boolean).map(cleanFloatNumbers);
    if (vals.length > 0) {
      return vals.join('\n');
    }
  }

  // 4. Thông báo chung từ message hoặc title
  if (data?.message) return cleanFloatNumbers(data.message);
  if (data?.title) return cleanFloatNumbers(data.title);

  return cleanFloatNumbers(error?.message) || fallback;
};
