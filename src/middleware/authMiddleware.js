const axios = require('../service/AuthService/authAxios');

// Middleware to check authentication
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({
      error: 'Authorization header is required'
    })
  }

  // Kiểm tra format Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Invalid authorization format. Expected: Bearer <token>'
    })
  }

  // Lấy token từ header (bỏ "Bearer " prefix)
  const token = authHeader.slice(7)

  if (!token || token.trim() === '') {
    return res.status(401).json({
      error: 'Token is required'
    })
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Verify the token with the Auth service
    const response = await axios.post('/auth/verifytoken', {
      token: token
    });

    if (response.data.user) {
      req.user = response.data.user; // Attach user info to the request object
      // Token is valid, proceed to the next middleware or route handler
      next();
    } else {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Authentication service error', error: error.message });
  }
};

module.exports = authMiddleware;