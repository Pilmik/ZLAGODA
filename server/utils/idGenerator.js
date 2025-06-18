const {pool} = require("../models/db.js")

async function generateDisplayId(role){
    if (!["MANAGER", "CASHIER"].includes(role)){
        throw new Error("Недопустима роль")
    }
    const prefix = role === "MANAGER" ? "MAN" : "CASH";
    const prefixLength = prefix.length;
    const client = await pool.connect();

    try {
        const result = await client.query(`
        SELECT display_id 
        FROM Employee 
        WHERE empl_role = $1 AND fired = FALSE;
        `, [role]);

        const occupiedNumbers = result.rows.map(row => parseInt(row.display_id.slice(prefixLength)));
    
        for (let num = 1; num <= 999; num++) {
        if (!occupiedNumbers.includes(num)) {
            return `${prefix}${num.toString().padStart(3, "0")}`;
            }
        }
        
        throw new Error("Немає вільних ID для ролі");
    } finally {
        client.release();
    }
}

module.exports = { generateDisplayId };