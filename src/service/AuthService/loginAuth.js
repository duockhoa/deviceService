const axios = require("./authAxios");
const loginAuth = async (employee_code, password) => {
  try {
    const response = await axios.post('auth/login', { employee_code, password });
    return response.data;
  } catch (error) {
    throw new Error('Login failed: ' + error.message);
  }
};

module.exports = loginAuth;