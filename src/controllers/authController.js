const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return apiResponse.success(res, 201, 'Registration successful.', result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return apiResponse.success(res, 200, 'Login successful.', result);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  return apiResponse.success(res, 200, 'Current user retrieved.', { user });
});

module.exports = {
  register,
  login,
  me
};
