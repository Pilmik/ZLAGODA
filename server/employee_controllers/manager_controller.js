require("dotenv").config();
const bcrypt = require("bcrypt");
const {pool} = require("../models/db.js");

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
            SELECT id_employee, empl_surname, empl_name, empl_patronymic,
                empl_role, salary, date_of_birth, date_of_start, 
                phone_number, city, street, zip_code
            FROM employee
            `;
            const value = [];
            if (role) {
                query += ' WHERE empl_role = $1';
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
            SELECT id_employee, empl_surname, empl_name, empl_patronymic,
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
            SELECT id_employee, empl_surname, empl_name, empl_patronymic,
                empl_role, salary, date_of_birth, date_of_start, 
                phone_number, city, street, zip_code
            FROM employee
            WHERE id_employee = $1;
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
                id_employee,
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
            if (!id_employee || !empl_surname || !empl_name || !empl_role || !salary 
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
            const hashedPassword = await bcrypt.hash(empl_password, 12);
            const { rowCount } = await pool.query(`
            INSERT INTO employee (
                id_employee, empl_surname, empl_name, empl_patronymic,
                empl_role, salary, date_of_birth, date_of_start, 
                phone_number, city, street, zip_code, empl_password
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id_employee) DO NOTHING`, [
            id_employee, empl_surname, empl_name, empl_patronymic, empl_role,
            salary, date_of_birth, date_of_start, phone_number,
            city, street, zip_code, hashedPassword]);
            if (rowCount > 0) {
                return res.status(200).json({message: "Користувача створено в системі: " + id_employee})
            } else {
            console.log("Помилка створення користувача.");
            }

        }catch (e){
            console.log(e)
            return res.status(500).json({message: "Помилка сервера"});
        }
    }

    async updateEmployeeInfo(req, res){
        const updatedEmployee = req.body;
        if (!updatedEmployee.id_employee){
            res.status(400).json({message: "ID не вказано."})
        }
        try{
            const {
            id_employee, 
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
                    WHERE id_employee = $11
                    RETURNING *;
                `, [empl_surname, empl_name,
                    empl_patronymic || null, salary,
                    date_of_birth, date_of_start,
                    phone_number, city,
                    street, zip_code,
                    id_employee])
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
        const id_employee = req.params.id;
        if (!id_employee){
            return res.status(400).json({message: "Відсутнє ID."})
        }
        try{
            const result = await pool.query(`
                DELETE FROM employee
                WHERE id_employee = $1
                RETURNING *;
            `, [id_employee])
            if (result.rows.length === 0){
                return res.status(400).json({message: "Помилка видалення."})
            }
        return res.json({message: "Користувача " + id_employee + " успішно видалено."})
        }catch(e){
            console.error("Помилка: " + e)
            return res.status(500).json({message: "Помилка сервера."})
        }
    }

    async createCustomer(req, res){
        const {card_number, cust_surname, cust_name,
                cust_patronymic, phone_number, city, 
                street, zip_code, percent} = req.body;
        try {
            const {rowCount} = await pool.query(`
                INSERT INTO customer_card (card_number, cust_surname, cust_name,
                                            cust_patronymic, phone_number, city, 
                                            street, zip_code, percent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (card_number) DO NOTHING;
            `, [card_number, cust_surname, cust_name,
                cust_patronymic, phone_number, city, 
                street, zip_code, percent])
            if(rowCount > 0){
                res.status(200).json({message: "Додано покупця з карткою: " + card_number})
            } else {
                console.log("Поммлка створення картки покупця")
            }
        }catch(e){
            console.error("Помилка: " + e)
            res.status(500).json({message: "Помилка сервера"})
        }  
    }
}

module.exports = new ManagerController();