require("dotenv").config();
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  console.log('Отримано токен:', token);
  if (!token) {
    console.log('Токен не надано');
    return res.status(401).json({ message: 'Токен відсутній' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Помилка верифікації токена:', err);
      return res.status(403).json({ message: 'Недійсний токен' });
    }
    console.log('Верифікований користувач:', user);
    req.user = user;
    next();
  });
};