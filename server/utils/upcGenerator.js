const {pool} = require("../models/db.js");
require("dotenv").config()

function calculateCheckDigit(digits) {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
        const digit = parseInt(digits[i])
        sum += i % 2 === 0? digit : digit*3;
    }
    return (10 - (sum % 10)) % 10
}


async function generateUPC() {
    try {
        const upcPrefix = process.env.UPC_PREFIX;
        const upcManuf = process.env.UPC_MANUF;
        
        const {rows} = await pool.query(`
            UPDATE upc_counter
            SET last_item_number = CASE
                WHEN last_item_number + 1 = 99999 THEN 100000
                ELSE last_item_number + 1
            END
            WHERE id = 1
            RETURNING last_item_number;
        `);

        let nextItemNumber = parseInt(rows[0].last_item_number);
        if (nextItemNumber > 99999) {
             throw new Error('Досягнуто максимального номера продукту');
        }

        const itemNumberStr = nextItemNumber.toString().padStart(5, '0');
        const digits = upcPrefix + upcManuf + itemNumberStr;
        const checkDigit = calculateCheckDigit(digits);

        return digits + checkDigit;
    } catch (err) {
        console.error('Помилка генерації UPC:', err.message);
        throw err;
    }
}

module.exports = {generateUPC};