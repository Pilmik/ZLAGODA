require("dotenv").config();
const bcrypt = require("bcrypt");
const {pool} = require("../models/db.js");
const {generateUPC} = require("../utils/upcGenerator.js")
const {generateDisplayId} = require("../utils/idGenerator.js")
const {validatePrice} = require("../validators/validatePrice.js")

class ManagerController{
    async openDashboard(req, res){
        console.log("From endploint /dashb-manager")
        res.sendFile('dashboard-manager.html', { root: process.env.CLIENT_PATH});
    }

    async getAllEmployees(req, res){
        const {role} = req.query;
        if (role && role !== "CASHIER"){
            return res.status(400).json({message: "Недопустима роль для пошуку."})
        }
        try{
            let query = `
            SELECT internal_id, display_id, empl_surname, empl_name, empl_patronymic,
                empl_role, salary, date_of_birth, date_of_start, 
                phone_number, city, street, zip_code, fired
            FROM employee
            WHERE fired = FALSE
            `;
            const value = [];
            if (role) {
                query += ' AND empl_role = $1';
                value.push(role)
            }
            query += " ORDER BY empl_surname ASC;"
            const employees = await pool.query(query, value)
            return res.json(employees.rows)
        }catch(e){
            return res.status(500).json({message: "Помилка сервера"})
        }
    }

    async getEmployeesBySurname(req, res){
        const surname = req.params.surname;
        console.log('Received surname:', surname);
        if (!surname) {
            return res.status(400).json({ message: "Прізвище не вказано" });
        }
        try{
            const employees = await pool.query(`
            SELECT internal_id, display_id, empl_surname, empl_name, empl_patronymic,
                empl_role, salary, date_of_birth, date_of_start, 
                phone_number, city, street, zip_code
            FROM employee
            WHERE empl_surname = $1;
            `, [surname])
            return res.json(employees.rows)
        }catch(e){
            console.error(e);
            return res.status(500).json({message: "Помилка сервера"})
        }
    }

    async getEmployeeById(req, res){
        const id = req.params.id;
        console.log('Received id:', id);
        if (!id) {
            return res.status(400).json({ message: "ID не вказано"});
        }
        try{
            const employee = await pool.query(`
            SELECT internal_id, display_id, empl_surname, empl_name, empl_patronymic,
                empl_role, salary, date_of_birth, date_of_start, 
                phone_number, city, street, zip_code
            FROM employee
            WHERE display_id = $1;
            `, [id])
            return res.json(employee.rows)
        }catch(e){
            console.error(e);
            return res.status(500).json({message: "Помилка сервера"})
        }
    }

    async createEmployee(req, res){
        try{
            const {
                empl_surname,
                empl_name,
                empl_patronymic,
                empl_role,
                salary,
                date_of_birth,
                date_of_start,
                phone_number,
                city,
                street,
                zip_code,
                empl_password
            } = req.body;
            console.log(req.body)
            if (!empl_surname || !empl_name || !empl_role || !salary 
                || !date_of_birth || !date_of_start || !phone_number || !city || !street 
                || !zip_code || !empl_password) {
                return res.status(400).json({ message: "Усі обов’язкові поля повинні бути заповнені" });
            }
            const birthDate = new Date(date_of_birth);
            const startDate = new Date(date_of_start);
            const ageAtStart = startDate.getFullYear() - birthDate.getFullYear();
            if (ageAtStart < 18 || (ageAtStart === 18 && birthDate.getMonth() > startDate.getMonth()) 
                || (ageAtStart === 18 && birthDate.getMonth() === startDate.getMonth() && birthDate.getDate() > startDate.getDate())) {
                return res.status(400).json({ message: "Працівник повинен бути старше 18 років на момент вступу на посаду" });
            }
            const displayID = await generateDisplayId(empl_role);
            const hashedPassword = await bcrypt.hash(empl_password, 12);
            const { rowCount } = await pool.query(`
            INSERT INTO employee (
                display_id, empl_surname, empl_name, empl_patronymic,
                empl_role, salary, date_of_birth, date_of_start, 
                phone_number, city, street, zip_code, empl_password
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (display_id) DO NOTHING;`, [
            displayID, empl_surname, empl_name, empl_patronymic, empl_role,
            salary, date_of_birth, date_of_start, phone_number,
            city, street, zip_code, hashedPassword]);
            if (rowCount > 0) {
                return res.status(200).json({message: "Користувача створено в системі: " + displayID})
            } else {
                console.log("Помилка створення користувача.");
                return res.status(400).json({ message: "Помилка створення користувача" });
            }

        }catch (e){
            console.log(e)
            return res.status(500).json({message: "Помилка сервера"});
        }
    }

    async updateEmployeeInfo(req, res){
        const updatedEmployee = req.body;
        if (!updatedEmployee.display_id){
            res.status(400).json({message: "ID не вказано."})
        }
        try{
            const {
            display_id, 
            empl_surname, 
            empl_name,
            empl_patronymic,
            salary,
            date_of_birth,
            date_of_start, 
            phone_number,
            city,
            street, 
            zip_code

            } = updatedEmployee
            const birthDate = new Date(date_of_birth);
            const startDate = new Date(date_of_start);
            const ageAtStart = startDate.getFullYear() - birthDate.getFullYear();
            if (ageAtStart < 18 || (ageAtStart === 18 && birthDate.getMonth() > startDate.getMonth()) 
                || (ageAtStart === 18 && birthDate.getMonth() === startDate.getMonth() && birthDate.getDate() > startDate.getDate())) {
                return res.status(400).json({ message: "Працівник повинен бути старше 18 років на момент вступу на посаду" });
            }
            const result = await pool.query(`
                    UPDATE employee
                    SET 
                        empl_surname = $1,
                        empl_name = $2,
                        empl_patronymic = $3,
                        salary = $4,
                        date_of_birth = $5,
                        date_of_start = $6, 
                        phone_number = $7,
                        city = $8,
                        street = $9, 
                        zip_code = $10
                    WHERE display_id = $11
                    RETURNING *;
                `, [empl_surname, empl_name,
                    empl_patronymic || null, salary,
                    date_of_birth, date_of_start,
                    phone_number, city,
                    street, zip_code,
                    display_id])
            if (result.rows.length === 0){
                return res.status(400).json({message: "Помилка оновлення користувача"})
            }
            return res.json(result.rows[0])
        }catch(e){
            console.log("Помилка: " + e)
            res.status(500).json({message: "Помилка сервера"})
        }
    }

    async deleteEmployee(req, res){
        const display_id = req.params.id;
        if (!display_id){
            return res.status(400).json({message: "Відсутнє ID."})
        }
        try{
            const result = await pool.query(`
                DELETE FROM employee
                WHERE display_id = $1
                RETURNING *;
            `, [display_id])
            if (result.rows.length === 0){
                return res.status(400).json({message: "Помилка видалення."})
            }
        return res.json({message: "Користувача " + display_id + " успішно видалено."})
        }catch(e){
            console.error("Помилка: " + e)
            return res.status(500).json({message: "Помилка сервера."})
        }
    }
        

    //===Customers===
    async getAllCustomers(req, res){
        const percentsParam = req.query.percent;
        let percents = [3, 5, 8];
        
        if (percentsParam) {
            percents = percentsParam.split(',').map(Number).filter((p) => [3, 5, 8].includes(p))
            if (percents.length === 0){
                return res.status(400).json({message: "Некоректні параметри запиту."})
            }
        }

        try {
            const placeholders = percents.map((_, index) => `$${index + 1}`).join(", ")
            const query = `
                SELECT *
                FROM Customer_Card
                WHERE percent IN (${placeholders})
                ORDER BY cust_surname ASC;
            `
            const customers = await pool.query(query, percents)
            return res.status(200).json(customers.rows)
        } catch (err) {
            console.error('Помилка отримання покупців:', err.stack);
            return res.status(500).json({ message: 'Помилка сервера' });
        }
    }

    async getCustomerByNumber(req, res){
        const phone_number = req.params.phone_number;
        if (!phone_number) {
            return res.status(400).json({message: "Номер телефона клієнта відсутній."});
        }
        try {
            const query = `
                SELECT *
                FROM Customer_Card
                WHERE phone_number = $1;
            `
            const customer = await pool.query(query, [phone_number]);
            if (customer.rowCount === 0) {
                return res.status(400).json({message: "Покупця з таким номером не існує"})
            }
            return res.status(200).json(customer.rows[0])
        } catch (err) {
            console.error("Помилка: ", err.stack);
            res.status(500).json({message: "Помилка сервера."});
        }
    }

    async createCustomer(req, res){
        const {cust_surname, cust_name,
                cust_patronymic, phone_number, city, 
                street, zip_code, percent} = req.body;

        if (!cust_surname || !cust_name || !phone_number || !percent) {
            return res.status(400).json({ message: "Прізвище, ім’я, номер телефону та відсоток є обов’язковими." });
        }
         if (![3, 5, 8].includes(Number(percent))) {
            return res.status(400).json({ message: "Некоректне значення відсотка. Допустимі значення: 3, 5, 8." });
        }

        try {
            const result = await pool.query(`
                INSERT INTO customer_card (cust_surname, cust_name,
                                            cust_patronymic, phone_number, city, 
                                            street, zip_code, percent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (phone_number) DO NOTHING
                RETURNING card_number, cust_surname, cust_name, percent;;
            `, [cust_surname, cust_name,
                cust_patronymic, phone_number, city, 
                street, zip_code, percent])
            if (result.rowCount > 0) {
                const newCustomer = result.rows[0]
                return res.status(200).json({
                    message: "Покупця з карткою створено",
                    customer: newCustomer
                })
            } else {
                return res.status(400).json({message: "Покупець із таким номером вже існує"})
            }
        }catch(err){
            console.error("Помилка створення покупця: ", err.stack)
            res.status(500).json({message: "Помилка сервера"})
        }  
    }

   async updateCustomerInfo(req, res) {
        const {
            card_number,
            cust_surname,
            cust_name,
            cust_patronymic,
            phone_number,
            city,
            street,
            zip_code,
            percent} = req.body;
        if (!card_number || !cust_surname || !cust_name || !phone_number || !percent) {
            return res.status(400).json({message: "Не вказані обов'язкові поля."});
        }
        if (![3, 5, 8].includes(Number(percent))) {
            return res.status(400).json({message: "Некоректне значення відсотка"})
        }
        try {
            const check_unique = `
                SELECT *
                FROM Customer_Card
                WHERE phone_number = $1 AND card_number <> $2;
            `
            const unique = await pool.query(check_unique, [phone_number, card_number]);
            if (unique.rowCount !== 0) {
                return res.status(400).json({message: "Спроба ввести існуючий номер телефона."})
            }
            const query = `
                UPDATE Customer_Card
                SET cust_surname = $1,
                    cust_name = $2,
                    cust_patronymic = $3,
                    phone_number = $4,
                    city = $5,
                    street = $6,
                    zip_code = $7,
                    percent = $8
                WHERE card_number = $9
                RETURNING *;
            `
            const result = await pool.query(query, [cust_surname, cust_name, cust_patronymic || null,
                phone_number, city || null, street || null, zip_code || null, percent, card_number
            ]);
            if (result.rowCount === 0) {
                return res.status(400).json({message: "Помилка оновлення картки покупця."})
            }
            return res.status(200).json(result.rows[0])
        } catch (err) {
            console.error("Помилка оновлення покупця: ", err.stack)
            return res.status(500).json({message: "Помилка сервера"})
        }      
    }

    async deleteCustomer(req, res) {
        const number = req.params.number;

        try {
            const query = `
                DELETE FROM Customer_Card
                WHERE card_number = $1
                RETURNING card_number;
            `;
            const result = await pool.query(query, [number]);

            if (result.rowCount === 0) {
                return res.status(400).json({ message: "Покупця з таким номером не знайдено." });
            }

            return res.status(200).json({ message: "Покупця успішно видалено." });
        } catch (err) {
            console.error("Помилка видалення покупця:", err.stack);
            return res.status(500).json({ message: "Помилка сервера." });
        }
    }

    async getAllCategories(req, res) {
        const name = req.query.name;
        
        let query = `SELECT * FROM Category`;
        const params = [];

        if (name && name.trim() !== '') {
            query += ` WHERE category_name ILIKE $1
                       ORDER BY category_name ASC`;
            params.push(`%${name.trim()}%`);
        } else {
            query += ` ORDER BY category_name ASC`;
        }
        try {
            const categories = await pool.query(query, params);
            return res.status(200).json(categories.rows);
        } catch (err) {
            console.error("Помилка отримання категорій:", err.stack);
            return res.status(500).json({ message: "Помилка сервера." });
        }
    }

    async getCategoryById(req, res) {
        const id = req.params.id;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({ message: "Некоректний ID категорії" });
        }

        try {
            const query = `
                SELECT * FROM Category
                WHERE category_number = $1;
            `
            const category = await pool.query(query, [id]);

            if (category.rowCount === 0) {
                return res.status(400).json({ message: "Категорію не знайдено" });
            }
            return res.status(200).json(category.rows[0])
        } catch (err) {
            console.error("Помилка отримання категорії: ", err.stack);
            return res.status(500).json({ message: "Помилка сервера" });
        }
    }

    async createCategory(req, res) {
        const {category_name} = req.body;

        if (!category_name || category_name.trim().length === 0) {
            return res.status(400).json({message: "Назва категорії обов'язкова"});
        }

        if (category_name.trim().length > 50) {
            return res.status(400).json({message: "Перевищення 50-ти симолів"});
        }

        try {
            const query = `
                INSERT INTO Category (category_name)
                VALUES ($1)
                ON CONFLICT (category_name) DO NOTHING
                RETURNING *;
            `
            const result = await pool.query(query, [category_name.trim()]);

            if (result.rowCount === 0) {
                return res.status(400).json({message: "Існує категорія з такою назвою"});
            }

            return res.status(200).json({
                message: "Категорію успішно створено",
                category: result.rows[0]
            });
        } catch (err) {
            console.error("Помилка створення категорії:", err.stack);
            return res.status(500).json({ message: "Помилка сервера." }); 
        }
    }

    async updateCategory(req, res) {
        const {category_number, category_name} = req.body;

        if (!Number.isInteger(Number(category_number)) || Number(category_number) <= 0) {
            return res.status(400).json({ message: "Некоректний ID категорії" });
        }

        if (!category_name || category_name.trim().length === 0) {
            return res.status(400).json({ message: "Назва категорії є обов’язковою" });
        }

        if (category_name.trim().length > 50) {
            return res.status(400).json({ message: "Назва категорії не може перевищувати 50 символів" });
        }

        try {
            const checkUnique = `
                SELECT * FROM Category
                WHERE category_name = $1 AND category_number <> $2;
            `;
            const unique = await pool.query(checkUnique, [category_name.trim(), category_number]);
            if (unique.rowCount !== 0) {
                return res.status(400).json({ message: "Категорія з такою назвою вже існує." });
            }
            const query = `
                UPDATE Category
                SET category_name = $1
                WHERE category_number = $2
                RETURNING *;
            `;
            const result = await pool.query(query, [category_name.trim(), category_number]);

            if (result.rowCount === 0) {
                return res.status(400).json({ message: "Категорію не знайдено" });
            }

            return res.status(200).json({
                message: "Категорію успішно оновлено.",
                category: result.rows[0]
            });
        } catch (err) {
            console.error("Помилка оновлення категорії: ", err.stack);
            return res.status(500).json({ message: "Помилка сервера" });
        }
    }

    async deleteCategory(req, res) {
        const id = req.params.id;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({ message: "Некоректний ID категорії" });
        }

        try {
            const query = `
                DELETE FROM Category
                WHERE category_number = $1
                RETURNING category_number;
            `
            const result = await pool.query(query, [id]);
            if (result.rowCount === 0) {
                return res.status(400).json({ message: "Категорію не знайдено" });
            }

            return res.status(200).json({ message: "Категорію успішно видалено" });
        } catch (err) {
            console.error("Помилка видалення категорії:", err.stack);
            if (err.code === '23503') {
                return res.status(400).json({ message: "Дана категорія використовується в продуктах. Видалення неможливе" });
            }
            return res.status(500).json({ message: "Помилка сервера" });
        }
    }

    async getAllProducts(req, res) {
        const {name, category, number} = req.query;

        let query = "SELECT * FROM Product";
        const params = [];
        let conditions = [];
        if (name && name.trim() !== '') {
            conditions.push(`product_name ILIKE $${params.length + 1}`)
            params.push(`%${name.trim()}%`)
        }
        if (category && category.trim() !== '') {
            query = `
                SELECT p.id_product, p.product_name, p.category_number, p.characteristics
                FROM Product p
                JOIN Category c ON p.category_number = c.category_number
            `;
            conditions.push(`c.category_name ILIKE $${params.length + 1}`);
            params.push(`%${category.trim()}%`);
        } else if (number) {
            if (!Number.isInteger(Number(number)) || Number(number) <= 0) {
                return res.status(400).json({ message: "Некоректний номер категорії" });
            }
            conditions.push(`category_number = $${params.length + 1}`);
            params.push(Number(number));
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY product_name ASC;`;

        try {
            const result = await pool.query(query, params);
            return res.status(200).json(result.rows);
        } catch (err) {
            console.error("Помилка отримання продуктів: ", err.stack);
            return res.status(500).json({ message: "Помилка сервера" });
        }
    }

    async getProductById(req, res) {
        const id = req.params.id;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({ message: "Некоректний ID продукту" });
        }

        try {
            const query = `
                SELECT * FROM Product
                WHERE id_product = $1;
            `;
            const result = await pool.query(query, [id]);
            if (result.rowCount.length === 0) {
                return res.status(400).json({ message: "Продукт не знайдено" });
            }
            res.status(200).json(result.rows[0]);
        } catch (err) {
            console.error("Помилка отримання продукту: ", err.stack);
            return res.status(500).json({ message: "Помилка сервера" });
        }
    }

    async createProduct(req, res) {
        const {
            product_name,
            characteristics,
            category_number
        } = req.body;

        if (!product_name || product_name.trim().length === 0) {
            return res.status(400).json({ message: "Назва продукту є обов’язковою" });
        }
        if (!characteristics || characteristics.trim().length === 0) {
            return res.status(400).json({ message: "Характеристики продукту є обов’язковими" });
        }
        if (!Number.isInteger(Number(category_number)) || Number(category_number) <= 0) {
            return res.status(400).json({ message: "Некоректний номер категорії" });
        }
        if (product_name.length > 50) {
            return res.status(400).json({ message: "Назва перевищила 50 символів" });
        }
        if (characteristics.length > 100) {
            return res.status(400).json({ message: "Характеристика перевищила 100 символів" });
        }

        try {
            const query = `
                INSERT INTO Product (product_name, characteristics, category_number)
                VALUES ($1, $2, $3)
                RETURNING  id_product, product_name, characteristics, category_number;
            `
            const result = await pool.query(query, [product_name.trim(), 
                characteristics.trim(), category_number]);
            
            if (result.rowCount === 0) {
                return res.status(500).json({ message: "Не вдалося створити продукт" });
            }
            
            return res.status(200).json({
                message: "Новий продукт створено",
                product: result.rows[0]
            });

        } catch (err) {
            console.error("Помилка створення продукту: ", err.stack);
            if (err.code === '23503') {
                return res.status(400).json({ message: "Вказаної категорії не існує" });
            }
            return res.status(500).json({ message: "Помилка сервера" });
        }
    }

    async updateProductInfo(req, res) {
        const {id_product, 
            product_name, 
            characteristics, 
            category_number} = req.body;

        if (!Number.isInteger(Number(id_product)) || Number(id_product) <= 0) {
            return res.status(400).json({ message: "Некоректний ID продукту" });
        }
        if (!product_name || product_name.trim().length === 0) {
            return res.status(400).json({ message: "Назва продукту є обов’язковою" });
        }
        if (!characteristics || characteristics.trim().length === 0) {
            return res.status(400).json({ message: "Характеристики продукту є обов’язковими" });
        }
        if (!Number.isInteger(Number(category_number)) || Number(category_number) <= 0) {
            return res.status(400).json({ message: "Некоректний номер категорії" });
        }
        if (product_name.length > 50) {
            return res.status(400).json({ message: "Назва перевищила 50 символів" });
        }
        if (characteristics.length > 100) {
            return res.status(400).json({ message: "Характеристика перевищила 100 символів" });
        }

        try {
            const query = `
                UPDATE Product
                SET product_name = $1,
                    characteristics = $2,
                    category_number = $3
                WHERE id_product = $4
                RETURNING id_product, product_name, category_number, characteristics;
            `
            const result = await pool.query(query, [product_name.trim(), characteristics.trim(), category_number, id_product]);

            if (result.rowCount === 0) {
                return res.status(400).json({ message: "Продукт не знайдено" });
            }

            return res.status(200).json({
                message: "Продукт успішно оновлено",
                product: result.rows[0]
            });
        } catch (err) {
           console.error("Помилка оновлення продукту:", err.stack);
            if (err.code === '23503') {
                return res.status(400).json({ message: "Вказаної категорії не існує" });
            }
            return res.status(500).json({ message: "Помилка сервера" }); 
        }
    }

    async deleteProduct(req, res) {
        const id = req.params.id;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({ message: "Некоректний ID продукту" });
        }

        try {
            const query = `
                DELETE FROM Product
                WHERE id_product = $1
                RETURNING id_product;
            `
            const result = await pool.query(query, [id]);
            if (result.rowCount.length === 0) {
                return res.status(400).json({ message: "Продукт не знайдено" });
            }
            return res.status(200).json({message: "Продукт видалено"});
        } catch (err) {
            console.error("Помилка видалення продукту: ", err.stack);
            return res.status(500).json({ message: "Помилка сервера" }); 
        }
    }

    async getAllStoreProducts(req, res) {
        try {
            const {search, promotional, sorting} = req.query;

            let query = `SELECT sp.UPC, p.product_name, sp.selling_price, sp.products_number 
                        FROM Store_Product sp
                        JOIN Product p ON sp.id_product = p.id_product`;
            const params = []
            let conditions = []
            
            if (search) {
                const cleanSearch = search.trim();
                if (cleanSearch.length > 50) {
                    return res.status(400).json({message: "Перевищена максимальна кількість символів"});
                }
                if (/^[0-9]{12}$/.test(cleanSearch)) {
                    conditions.push(`sp.UPC = $${params.length + 1}`);
                    params.push(cleanSearch);
                } else {
                    conditions.push(`p.product_name ILIKE $${params.length + 1}`);
                    params.push(`%${cleanSearch}%`);
                }
            }
            if (promotional !== undefined) {
                if (!['true', 'false'].includes(promotional)) {
                    return res.status(400).json({ message: 'Некоректне значення promotional: має бути true або false' });
                }
                const isPromotional = promotional === 'true';
                conditions.push(`sp.promotional_product = $${conditions.length + 1}`);
                params.push(isPromotional);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`
            }
            
            const validSortFields = ['products_number', 'product_name'];
            const sortField = validSortFields.includes(sorting) ? sorting : 'products_number';
            query += ` ORDER BY ${sortField === 'product_name' ? 'p.product_name' : 'sp.products_number'} ASC`;

            const result = await pool.query(query, params);

            res.status(200).json({
                message: result.rowCount > 0 ? 'Товари знайдено' : 'Товари не знайдено',
                store_products: result.rows
            });

        } catch (err) {
            console.error('Помилка отримання товарів:', err.message);
            res.status(500).json({ message: 'Помилка сервера' });
        }
    }

    async getStoreProductByUPC(req, res) {
        try {
            const { upc } = req.params;

            if (!/^[0-9]{12}$/.test(upc)) {
                return res.status(400).json({ message: 'Некоректний формат UPC' });
            }

            const query = `
                SELECT sp.UPC, p.product_name, sp.selling_price, sp.products_number,
                       sp.promotional_product, p.characteristics,
                       CASE WHEN sp.promotional_product = false THEN sp.UPC_prom ELSE NULL END AS UPC_prom
                FROM Store_Product sp
                JOIN Product p ON sp.id_product = p.id_product
                WHERE sp.UPC = $1
            `;
            const result = await pool.query(query, [upc]);

            if (result.rowCount === 0) {
                return res.status(400).json({ message: 'Товар із вказаним UPC не знайдено' });
            }

            res.status(200).json({
                message: 'Товар знайдено',
                store_product: result.rows[0]
            });
        } catch (err) {
            console.error('Помилка отримання товару:', err.message);
            res.status(500).json({ message: 'Помилка сервера' });
        }
    }

    async createStoreProduct(req, res) {
        try {
            const {
                selling_price,
                products_number,
                promotional_product,
                UPC_prom,
                id_product
            } = req.body;

            if (!id_product || products_number === undefined || promotional_product === undefined) {
                return res.status(400).json({ message: 'Відсутні обов’язкові поля: id_product, products_number, promotional_product' });
            }
            if (!promotional_product && !selling_price) {
                return res.status(400).json({ message: 'Для звичайного товару selling_price є обов’язковим' });
            }

            const parsedProductsNumber = parseInt(products_number, 10);
            if (!Number.isInteger(parsedProductsNumber) || parsedProductsNumber < 0) {
                return res.status(400).json({ message: 'Некоректне значення поля products_number' });
            }

            const productCheck = await pool.query(
                'SELECT 1 FROM Product WHERE id_product = $1',
                [id_product]
            );
            if (productCheck.rowCount === 0) {
                return res.status(400).json({ message: 'id_product не існує в таблиці Product' });
            }

            const existingProducts = await pool.query(
                'SELECT UPC, selling_price, products_number, promotional_product FROM Store_Product WHERE id_product = $1',
                [id_product]
            );
            if (existingProducts.rowCount >= 2) {
                return res.status(400).json({ message: 'Для цього id_product уже існує максимум два записи (звичайний і акційний)' });
            }

            const regularProduct = existingProducts.rows.find(p => !p.promotional_product);
            if (!promotional_product && regularProduct) {
                return res.status(400).json({ message: 'Звичайний товар для цього id_product уже існує' });
            }

            let finalPrice = null;
            let finalUPCProm = UPC_prom;

            if (promotional_product) {
                if (!regularProduct) {
                    return res.status(400).json({ message: 'Спочатку створіть звичайний товар для цього id_product' });
                }

                if (products_number > regularProduct.products_number) {
                    return res.status(400).json({ message: 'Кількість акційного товару не може перевищувати кількість звичайного' });
                }

                finalPrice = validatePrice((regularProduct.selling_price * 0.8).toFixed(4));
                finalUPCProm = null;
            } else {
                finalPrice = validatePrice(selling_price);

                if (UPC_prom) {
                    const promProduct = await pool.query(
                        'SELECT 1 FROM Store_Product WHERE UPC = $1 AND promotional_product = true AND id_product = $2',
                        [UPC_prom, id_product]
                    );
                    if (promProduct.rowCount === 0) {
                        return res.status(400).json({ message: 'Вказаний UPC_prom не існує або не є акційним товаром або не відповідає id_product' });
                    }
                }
            }

            const upc = await generateUPC();

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const result = await client.query(
                    `INSERT INTO Store_Product (
                        UPC, selling_price, products_number, promotional_product, UPC_prom, id_product
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *`,
                    [upc, finalPrice, products_number, promotional_product, finalUPCProm, id_product]
                );

                if (promotional_product) {
                    await client.query(
                        `UPDATE Store_Product 
                         SET UPC_prom = $1, products_number = products_number - $2
                         WHERE id_product = $3 AND promotional_product = false`,
                        [upc, products_number, id_product]
                    );
                }

                await client.query('COMMIT');
                res.status(200).json({
                    message: 'Товар успішно створено',
                    store_product: result.rows[0]
                });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }    
        } catch (err) {
            console.error('Помилка створення товару:', err.message);
            res.status(500).json({ message: 'Помилка сервера' });
        }
    }

    async updateStoreProduct(req, res) {
        try {
            const { upc, selling_price, products_number, id_product } = req.body;

            if (!upc || products_number === undefined) {
                return res.status(400).json({ message: 'Відсутні обов’язкові поля: upc, products_number' });
            }

            if (!/^[0-9]{12}$/.test(upc)) {
                return res.status(400).json({ message: 'Некоректний формат UPC: має бути 12 цифр' });
            }

            const parsedProductsNumber = parseInt(products_number, 10);
            if (!Number.isInteger(parsedProductsNumber) || parsedProductsNumber < 0) {
                return res.status(400).json({ message: 'Некоректне значення поля products_number' });
            }

            const existingProduct = await pool.query(
                'SELECT id_product, promotional_product, products_number, selling_price FROM Store_Product WHERE UPC = $1',
                [upc]
            );
            if (existingProduct.rowCount === 0) {
                return res.status(400).json({ message: 'Товар із вказаним UPC не знайдено' });
            }
            const { promotional_product, products_number: oldProductsNumber, id_product: oldIdProduct, UPC_prom, selling_price: oldSellingPrice } = existingProduct.rows[0];
            if (!promotional_product && id_product && id_product !== oldIdProduct && UPC_prom) {
                return res.status(400).json({ message: 'Не можна змінити id_product для звичайного товару, якщо він пов’язаний із акційним (UPC_prom не порожній)' });
            }
            const targetIdProduct = id_product || oldIdProduct;

            if (id_product) {
                const productCheck = await pool.query(
                    'SELECT 1 FROM Product WHERE id_product = $1',
                    [id_product]
                );
                if (productCheck.rowCount === 0) {
                    return res.status(400).json({ message: 'id_product не існує в таблиці Product' });
                }
            }

            if (!promotional_product && id_product && id_product !== oldIdProduct) {
                const regularProductCheck = await pool.query(
                    'SELECT 1 FROM Store_Product WHERE id_product = $1 AND promotional_product = false AND UPC != $2',
                    [id_product, upc]
                );
                if (regularProductCheck.rowCount > 0) {
                    return res.status(400).json({ message: 'Звичайний товар для цього id_product уже існує' });
                }
            }

            let finalPrice = oldSellingPrice;

            const existingProducts = await pool.query(
                'SELECT UPC, selling_price, products_number, promotional_product FROM Store_Product WHERE id_product = $1 AND UPC != $2',
                [targetIdProduct, upc]
            );

            if (promotional_product) {
                const regularProduct = existingProducts.rows.find(p => !p.promotional_product);
                if (!regularProduct) {
                    return res.status(400).json({ message: 'Звичайний товар для цього id_product не існує' });
                }

                if (parsedProductsNumber > regularProduct.products_number) {
                    return res.status(400).json({ message: 'Кількість акційного товару не може перевищувати кількість звичайного' });
                }
                if (oldProductsNumber === 0 && parsedProductsNumber > 0) {
                    finalPrice = validatePrice((regularProduct.selling_price * 0.8).toFixed(4));
                }
            } else {
                if (selling_price) {
                    finalPrice = validatePrice(selling_price);
                } else if (!promotional_product && !selling_price) {
                    return res.status(400).json({ message: 'Для звичайного товару selling_price є обов’язковим при оновленні' });
                }
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const result = await client.query(
                    `UPDATE Store_Product
                     SET selling_price = $1, products_number = $2, id_product = $3
                     WHERE UPC = $4
                     RETURNING *`,
                    [finalPrice, parsedProductsNumber, targetIdProduct, upc]
                );

                if (promotional_product) {
                    const regularProduct = existingProducts.rows.find(p => !p.promotional_product);
                    if (regularProduct) {
                        const delta = parsedProductsNumber - oldProductsNumber;
                        await client.query(
                            `UPDATE Store_Product 
                             SET products_number = products_number - $1
                             WHERE id_product = $2 AND promotional_product = false`,
                            [delta, targetIdProduct]
                        );
                    }
                }

                await client.query('COMMIT');
                res.status(200).json({
                    message: 'Товар успішно оновлено',
                    store_product: result.rows[0]
                });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Помилка оновлення товару:', err.message);
            res.status(500).json({ message: 'Помилка сервера' });
        }
    }

    async deleteStoreProduct(req, res) {
        try {
            const { upc } = req.params;

            if (!/^[0-9]{12}$/.test(upc)) {
                return res.status(400).json({ message: 'Некоректний формат UPC: має бути 12 цифр' });
            }

            const existingProduct = await pool.query(
                'SELECT id_product, promotional_product, products_number, UPC_prom FROM Store_Product WHERE UPC = $1',
                [upc]
            );
            if (existingProduct.rowCount === 0) {
                return res.status(404).json({ message: 'Товар із вказаним UPC не знайдено' });
            }

            const { promotional_product, UPC_prom } = existingProduct.rows[0];

            if (!promotional_product && UPC_prom) {
                return res.status(400).json({ message: 'Не можна видалити звичайний товар, якщо він пов’язаний із акційним (UPC_prom не порожній)' });
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                await client.query(
                    'DELETE FROM Store_Product WHERE UPC = $1',
                    [upc]
                );

                await client.query('COMMIT');
                res.status(200).json({
                    message: 'Товар успішно видалено'
                });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Помилка видалення товару:', err.message);
            res.status(500).json({ message: 'Помилка сервера' });
        }
    }
}

module.exports = new ManagerController();