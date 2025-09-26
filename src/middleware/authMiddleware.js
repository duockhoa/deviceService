const axios = require('../service/AuthService/authAxios');

// Middleware to check authentication
const authMiddleware = async (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Verify the token with the Auth service
    const response = await axios.get('/verify-token', {
      headers: { Authorization: token },
    });

    if (response.data.valid) {
      // Token is valid, proceed to the next middleware or route handler
      next();
    } else {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Authentication service error', error: error.message });
  }
};

module.exports = authMiddleware;