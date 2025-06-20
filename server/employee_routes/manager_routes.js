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
router.get("/customers/:phone_number", authMiddleware, roleMiddleware(["MANAGER"]), controller.getCustomerByNumber)
router.post("/customers", authMiddleware, roleMiddleware(["MANAGER"]), controller.createCustomer)
router.put("/customers", authMiddleware, roleMiddleware(["MANAGER"]), controller.updateCustomerInfo)
router.delete("/customers/:number", authMiddleware, roleMiddleware(["MANAGER"]), controller.deleteCustomer)

router.get("/category", authMiddleware, roleMiddleware(["MANAGER"]), controller.getAllCategories)
router.get("/category/:id", authMiddleware, roleMiddleware(["MANAGER"]), controller.getCategoryById)
router.post("/category", authMiddleware, roleMiddleware(["MANAGER"]), controller.createCategory)
router.put("/category", authMiddleware, roleMiddleware(["MANAGER"]), controller.updateCategory)
router.delete("/category/:id", authMiddleware, roleMiddleware(["MANAGER"]), controller.deleteCategory)

router.get("/products", authMiddleware, roleMiddleware(["MANAGER"]), controller.getAllProducts)
router.get("/products/:id", authMiddleware, roleMiddleware(["MANAGER"]), controller.getProductById)
router.post("/products", authMiddleware, roleMiddleware(["MANAGER"]), controller.createProduct)
router.put("/products", authMiddleware, roleMiddleware(["MANAGER"]), controller.updateProductInfo)
router.delete("/products/:id", authMiddleware, roleMiddleware(["MANAGER"]), controller.deleteProduct)

module.exports = router;