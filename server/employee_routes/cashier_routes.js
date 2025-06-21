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

router.post("/sale", authMiddleware, roleMiddleware(["CASHIER"]), controller.saleProducts)

router.get('/receipts', authMiddleware, roleMiddleware(['CASHIER']), controller.getAllReceipts);
router.get('/receipts/:check_number', authMiddleware, roleMiddleware(['CASHIER']), controller.getReceiptByNumber);


module.exports = router;