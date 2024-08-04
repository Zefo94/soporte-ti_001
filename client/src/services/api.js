import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

export const register = (username, password) =>
  api.post('/register', { username, password });

export const login = (username, password) =>
  api.post('/login', { username, password });

export const getProtectedData = (token) =>
  api.get('/protected', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export default api;
