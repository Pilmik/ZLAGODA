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
}

module.exports = new AuthController();