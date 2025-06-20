require("dotenv").config();
const {pool} = require("../models/db.js");

class CashierController{
    async openDashboard(req, res){
        console.log("From endploint /dashb-cashier")
        res.sendFile('dashboard-cashier.html', { root: process.env.CLIENT_PATH});
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

    async getAllStoreProducts(req, res) {
        try {
            const {search, promotional, sorting} = req.query;

            let query = `SELECT sp.UPC, p.product_name, sp.selling_price, sp.products_number, sp.promotional_product
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
                SELECT sp.upc, p.product_name, sp.selling_price, sp.products_number,
                       sp.promotional_product, p.characteristics,
                       CASE WHEN sp.promotional_product = false THEN sp.upc_prom ELSE NULL END AS upc_prom
                FROM Store_Product sp
                JOIN Product p ON sp.id_product = p.id_product
                WHERE sp.upc = $1
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


    async getAllCustomers(req, res) {
        const search = req.query.search;

        let query = `
            SELECT card_number, cust_surname, cust_name, percent
            FROM customer_card
        `
        const params = [];

        if (search) {
            const cleanSearch = search.trim();
            if (cleanSearch.length > 50) {
                return res.status(400).json({message: "Перевищення числа символів для пошуку"})
            }
            if (/^\+?(380)?\d{7}$/.test(cleanSearch)){
                query += ` WHERE phone_number = $${params.length + 1}`;
                params.push(cleanSearch)
            } else {
                query += ` WHERE cust_surname ILIKE $${params.length + 1}`;
                params.push(`%${cleanSearch}%`)
            }
        }
        query += ` ORDER BY cust_surname ASC;`
        try {
            const result = await pool.query(query, params)
            res.status(200).json({
                message: result.rowCount > 0 ? 'Клієнтів знайдено' : 'Клієнтів не знайдено',
                clients: result.rows
            });
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
}

module.exports = new CashierController();