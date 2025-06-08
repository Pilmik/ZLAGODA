require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {pool} = require("../models/db.js");

const generateAccessToken = (id, roles) => {
    const payload = {
        id,
        roles
    }
    const secret = process.env.JWT_SECRET
    return jwt.sign(payload, secret, {expiresIn: "24h"})
}

class AuthController{
    async login(req, res){
        try {
           const {id, password} = req.body
            const userResult = await pool.query(`
                SELECT * 
                FROM employee 
                WHERE id_employee = $1`, [id])

            if (userResult.rows.length === 0) {
                return res.status(400).json({ message: "Користувача з таким ID не знайдено" });
            }

            const user = userResult.rows[0]
            console.log(user)

            const valid_password = await bcrypt.compare(password, user.empl_password)
            if (!valid_password) {
                return res.status(400).json({ message: "Неправильний пароль" });
            }
            const token = generateAccessToken(user.id_employee, user.empl_role)
            return res.json({token})
        } catch (e) {
            console.log(e)
            return res.status(500).json({ message: "Помилка сервера" });
        }
    }

    async registration(req, res){
        try{
            const {
                id,
                surname,
                name,
                patronymic,
                role,
                salary,
                date_of_birth,
                date_of_start,
                phone_number,
                city,
                street,
                zipcode,
                password
            } = req.body;
            if (!id || !surname || !name || !role || !salary || !date_of_birth || !date_of_start || !phone_number || !city || !street || !zipcode || !password) {
                return res.status(400).json({ message: "Усі обов’язкові поля повинні бути заповнені" });
            }
            const birthDate = new Date(date_of_birth);
            const startDate = new Date(date_of_start);
            const ageAtStart = startDate.getFullYear() - birthDate.getFullYear();
            if (ageAtStart < 18 || (ageAtStart === 18 && birthDate.getMonth() > startDate.getMonth()) 
                || (ageAtStart === 18 && birthDate.getMonth() === startDate.getMonth() && birthDate.getDate() > startDate.getDate())) {
                return res.status(400).json({ message: "Працівник повинен бути старше 18 років на момент вступу на посаду" });
            }
            const hashedPassword = await bcrypt.hash(password, 12);
            const { rowCount } = await pool.query(`
            INSERT INTO employee (
                id_employee, empl_surname, empl_name, empl_patronymic,
                empl_role, salary, date_of_birth, date_of_start, 
                phone_number, city, street, zip_code, empl_password
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id_employee) DO NOTHING
        `, [
            id, surname, name, patronymic, role,
            salary, date_of_birth, date_of_start, phone_number,
            city, street, zipcode, hashedPassword
        ]);
        if (rowCount > 0) {
            return res.status(200).json({message: "Користувача створено в системі: " + id})
        } else {
        console.log("Помилка створення користувача.");
        }

        }catch (e){
            console.log(e)
            return res.status(500).json({message: "Помилка сервера"});
        }
    }
}

module.exports = new AuthController();