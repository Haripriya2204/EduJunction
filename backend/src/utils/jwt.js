const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.signToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, department: user.department },
    SECRET,
    { expiresIn: '7d' }
  );
};

exports.verifyToken = (token) => {
  return jwt.verify(token, SECRET);
}; 