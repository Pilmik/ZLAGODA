const express = require("express");
const cors = require("cors");
require("dotenv").config();
const {pool, initializeDatabase} = require("./server/models/db.js");
const authRoutes = require("./server/employee_routes/auth_routes.js");
const managerDashboardRoutes = require("./server/employee_routes/manager_routes.js");
const cashierDashboardRoutes = require("./server/employee_routes/cashier_routes.js");

const app = express();
const PORT = process.env.PORT || 3000
const clientPath = process.env.CLIENT_PATH

app.use(express.static(clientPath));
app.use(express.json());
app.use(cors());
app.use("/auth", authRoutes);
app.use("/dashboard-manager", managerDashboardRoutes);
app.use("/dashboard-cashier", cashierDashboardRoutes);

app.get("/", (req, res) => {
    res.sendFile('login.html', {root: clientPath})
})

const start = async () => {
    try {
        await initializeDatabase()
        console.log("З'єднання з PorsgreSQL встановлено.")

        const server = app.listen(PORT, () => console.log(`Сервер працює на ${PORT} порту.`))

        process.on("SIGINT", async () => {
            console.log("Закриття сервера...");
            await pool.end();
            console.log("Пул з’єднань закрито");
            server.close(() => {
                console.log("Сервер зупинено");
                process.exit(0);
            });
        });
    } catch (e) {
        console.error("Помилка запуску сервера:", e.stack);
        await pool.end();
        process.exit(1);
    }
};

start();