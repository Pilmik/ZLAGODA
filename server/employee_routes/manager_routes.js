const Router = require("express");
const authMiddleware = require("../middlewares/authMiddleware.js");
const roleMiddleware = require("../middlewares/roleMiddleware.js");
const controller = require("../employee_controllers/manager_controller.js");

const router = new Router();

router.get("/", controller.openDashboard)

router.get("/employees", authMiddleware, roleMiddleware(["MANAGER"]),controller.getAllEmployees)
router.get("/employees/by-surname/:surname", authMiddleware, roleMiddleware(["MANAGER"]),controller.getEmployeesBySurname)
router.get("/employees/by-id/:id", authMiddleware, roleMiddleware(["MANAGER"]), controller.getEmployeeById)
router.post("/employees", authMiddleware, roleMiddleware(["MANAGER"]), controller.createEmployee)
router.put("/employees", authMiddleware, roleMiddleware(["MANAGER"]), controller.updateEmployeeInfo)
router.delete("/employees/:id", authMiddleware, roleMiddleware(["MANAGER"]), controller.deleteEmployee)

router.get("/customers", authMiddleware, roleMiddleware(["MANAGER"]), controller.getAllCustomers)
router.get("/customers/:number", authMiddleware, roleMiddleware(["MANAGER"]), controller.getCustomerByNumber)
router.post("/customers", authMiddleware, roleMiddleware(["MANAGER"]), controller.createCustomer)
router.put("/customers", authMiddleware, roleMiddleware(["MANAGER"]), controller.updateCustomerInfo)
router.delete("/customers/:number", authMiddleware, roleMiddleware(["MANAGER"]), controller.deleteCustomer)

module.exports = router;