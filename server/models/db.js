const Pool = require("pg").Pool;
const bcrypt = require("bcrypt");
require("dotenv").config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
})

pool.on('error', (err) => {
    console.error("Помилка пулу з'єднань", err.stack)
})

const initializeDatabase = async () => {
    try {
        const {
            MANAGER_DISPLAY_ID, MANAGER_SURNAME, MANAGER_NAME, MANAGER_PATRONYMIC,
            MANAGER_ROLE, MANAGER_SALARY, MANAGER_DATE_OF_BIRTH, MANAGER_DATE_OF_START,
            MANAGER_PHONE_NUMBER, MANAGER_CITY, MANAGER_STREET, MANAGER_ZIP_CODE,
            MANAGER_PASSWORD
        } = process.env;
        const hashedPassword = await bcrypt.hash(MANAGER_PASSWORD, 12);
        const { rowCount } = await pool.query(`
            INSERT INTO employee (
                display_id, empl_surname, empl_name, empl_patronymic,
                empl_role, salary, date_of_birth, date_of_start, 
                phone_number, city, street, zip_code, empl_password
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (display_id) DO NOTHING
        `, [
            MANAGER_DISPLAY_ID, MANAGER_SURNAME, MANAGER_NAME, MANAGER_PATRONYMIC,
            MANAGER_ROLE, MANAGER_SALARY, MANAGER_DATE_OF_BIRTH, MANAGER_DATE_OF_START,
            MANAGER_PHONE_NUMBER, MANAGER_CITY, MANAGER_STREET, MANAGER_ZIP_CODE,
            hashedPassword
        ]);

        if (rowCount > 0) {
        console.log("Створено запис для адміністратора");
        } else {
        console.log("Адміністратор із id = 0 уже існує");
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS upc_counter (
                id INTEGER PRIMARY KEY,
                last_item_number INTEGER NOT NULL DEFAULT -1
            );
        `);
        const result = await pool.query(`
            INSERT INTO upc_counter (id, last_item_number)
            VALUES (1, -1)
            ON CONFLICT (id) DO NOTHING;    
        `);

        if (result.rowCount > 0) {
            console.log("Таблиця upc_counter ініціалізована")
        } else {
            console.log("Таблиця вже містить запис")
        }  
        
    } catch (e) {
        console.error("Помилка ініціалізації бази даних:", e.stack);
        throw e;
    }
}

module.exports = {pool, initializeDatabase};