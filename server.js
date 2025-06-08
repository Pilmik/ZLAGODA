const express = require("express");
const cors = require("cors")
require("dotenv").config();
const path = require("path")
const {pool, initializeDatabase} = require("./server/models/db.js");
const authRoutes = require("./server/employee_routes/auth_routes.js");

const app = express();
const PORT = process.env.PORT || 3000
const clientPath = path.join(__dirname, "./client")

app.use(express.static(clientPath));
app.use(express.json())
app.use(cors());
app.use("/auth", authRoutes)

app.get("/", (req, res) => {
    res.sendFile('login.html', {root: clientPath})
})

app.get("/dashboard-manager", (req, res) => {
  console.log("From endploint /dashb-manager")
  res.sendFile('dashboard-manager.html', { root: clientPath});
});

app.get("/dashboard-cashier", (req, res) => {
  res.sendFile('dashboard-cashier.html', { root: clientPath});
});

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
        console.log(e)
        await pool.end()
        process.exit(1)
    }
};

start();