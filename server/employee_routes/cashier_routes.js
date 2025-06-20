const Router = require("express");
const controller = require("../employee_controllers/cashier_controller.js");
const authMiddleware = require("../middlewares/authMiddleware.js");
const roleMiddleware = require("../middlewares/roleMiddleware.js");

const router = new Router();

router.get("/", controller.openDashboard)

router.get("/products", authMiddleware, roleMiddleware(["CASHIER"]), controller.getAllProducts)
router.get("/products/:id", authMiddleware, roleMiddleware(["CASHIER"]), controller.getProductById)

router.get("/store_products", authMiddleware, roleMiddleware(["CASHIER"]), controller.getAllStoreProducts)
router.get("/store_products/:upc", authMiddleware, roleMiddleware(["CASHIER"]), controller.getStoreProductByUPC)

router.get("/customers", authMiddleware, roleMiddleware(["CASHIER"]), controller.getAllCustomers)
router.get("/customers/:phone_number", authMiddleware, roleMiddleware(["CASHIER"]), controller.getCustomerByNumber)
router.post("/customers", authMiddleware, roleMiddleware(["CASHIER"]), controller.createCustomer)
router.put("/customers", authMiddleware, roleMiddleware(["CASHIER"]), controller.updateCustomerInfo)



module.exports = router;