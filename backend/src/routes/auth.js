const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { signToken } = require('../utils/jwt');

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const userObj = user.toJSON();
    delete userObj.password;
    const token = signToken(userObj);
    return res.json({ user: userObj, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 