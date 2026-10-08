import api from './api';

let cachedConfigPromise = null;

export async function fetchPublicConfig() {
  if (!cachedConfigPromise) {
    if (!api || typeof api.get !== 'function') {
      return { emailMode: 'live' };
    }
    cachedConfigPromise = Promise.resolve()
      .then(() => api.get('/api/public-config'))
      .then((res) => {
        if (res?.data && (res.data.emailMode === 'demo' || res.data.emailMode === 'live')) {
          return res.data;
        }
        return { emailMode: 'live' };
      })
      .catch(() => ({ emailMode: 'live' }));
  }
  return cachedConfigPromise;
}

export function resetPublicConfigCache() {
  cachedConfigPromise = null;
}
