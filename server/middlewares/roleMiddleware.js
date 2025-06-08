require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports = function (roles) {
    return function (req, res, next) {
        if (req.method === "OPTIONS") {
            return next();
        }
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ message: "Користувача не авторизовано: Немає заголовку авторизації" });
            }
            if (!authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "Користувача не авторизовано: Некоректний формат токена" });
            }
            const token = authHeader.split(" ")[1];
            if (!token) {
                return res.status(401).json({ message: "Користувача не авторизовано: Токен відсутній" });
            }
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
            const userRole = decodedToken.roles;
            const hasRole = roles.includes(userRole);
            if (!hasRole) {
                return res.status(403).json({ message: "Немає прав на виконання операції" });
            }
            req.user = decodedToken;
            return next();
        } catch (e) {
            console.error("Помилка role middleware:", e.message);
            return res.status(401).json({ message: "Користувача не авторизовано: Некоректний токен" });
        }
    };
};