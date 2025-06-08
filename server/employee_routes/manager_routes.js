const Router = require("express");
const controller = require("../employee_controller/manager_controller.js")

const router = new Router();

router.get("/", controller.openDashboard)

module.exports = router;