import api from './api'

// GET /admin/metrics
export const getMetrics = () =>
  api.get('/admin/metrics').then(r => r.data)

// GET /admin/users?page=1&per_page=20
export const getUsers = (page = 1, perPage = 20) =>
  api.get('/admin/users', { params: { page, per_page: perPage } }).then(r => r.data)

// GET /admin/users/:id
export const getUserDetail = (userId) =>
  api.get(`/admin/users/${userId}`).then(r => r.data)

// DELETE /admin/users/:id
export const deleteUser = (userId) =>
  api.delete(`/admin/users/${userId}`).then(r => r.data)

// PATCH /admin/users/:id/block
export const toggleBlockUser = (userId) =>
  api.patch(`/admin/users/${userId}/block`).then(r => r.data)
