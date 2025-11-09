import { API_BASE_URL } from '../config/constants';

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const DATA_URL_REGEX = /^(data|blob):/i;

const normaliseBase = (value) => {
  if (!value) {
    return '';
  }
  return String(value).replace(/\/+$/, '');
};

const extractCandidate = (input) => {
  if (!input && input !== 0) {
    return '';
  }

  if (typeof input === 'string') {
    return input.trim();
  }

  if (Array.isArray(input)) {
    return extractCandidate(input[0]);
  }

  if (typeof input === 'object') {
    if (typeof input.url === 'string') {
      return input.url;
    }
    if (typeof input.secure_url === 'string') {
      return input.secure_url;
    }
    if (typeof input.uri === 'string') {
      return input.uri;
    }
  }

  return String(input);
};

export const isAbsoluteUrl = (value) => ABSOLUTE_URL_REGEX.test(value);

export const resolveMediaUrl = (input, { baseUrl = API_BASE_URL } = {}) => {
  const candidateRaw = extractCandidate(input);
  if (!candidateRaw) {
    return '';
  }

  if (DATA_URL_REGEX.test(candidateRaw) || candidateRaw.startsWith('file://')) {
    return candidateRaw;
  }

  if (candidateRaw.startsWith('//')) {
    return `https:${candidateRaw}`;
  }

  if (isAbsoluteUrl(candidateRaw)) {
    return candidateRaw;
  }

  const base = normaliseBase(baseUrl || API_BASE_URL);
  if (!base) {
    return candidateRaw;
  }

  if (candidateRaw.startsWith('/')) {
    return `${base}${candidateRaw}`;
  }

  return `${base}/${candidateRaw}`;
};

export default resolveMediaUrl;
