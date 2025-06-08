const Router = require("express");
const authMiddleware = require("../middlewares/authMiddleware.js");
const roleMiddleware = require("../middlewares/roleMiddleware.js");
const controller = require("../employee_controller/auth_controller.js");

const router = new Router();
router.post("/login", controller.login);
router.post("/register", authMiddleware, roleMiddleware(["MANAGER"]), controller.registration);

module.exports = router;