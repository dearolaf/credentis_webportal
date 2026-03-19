const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

class ApiService {
  constructor() {
    this.token = localStorage.getItem('credentis_token');
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('credentis_token', token);
    else localStorage.removeItem('credentis_token');
  }

  get headers() {
    // Always re-read from localStorage so the token is fresh after login/logout
    const token = localStorage.getItem('credentis_token') || this.token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async request(method, endpoint, body = null) {
    try {
      const options = { method, headers: this.headers };
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await res.json();
      return data;
    } catch (error) {
      console.error(`API ${method} ${endpoint} error:`, error);
      return { success: false, message: 'Network error' };
    }
  }

  get(endpoint) { return this.request('GET', endpoint); }
  post(endpoint, body) { return this.request('POST', endpoint, body); }
  put(endpoint, body) { return this.request('PUT', endpoint, body); }
  delete(endpoint) { return this.request('DELETE', endpoint); }
}

export const api = new ApiService();
export default api;
