const Router = require("express");
const controller = require("../employee_controllers/auth_controller.js");

const router = new Router();
router.post("/login", controller.login);

module.exports = router;