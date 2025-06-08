require("dotenv").config();

class CashierController{
    async openDashboard(req, res){
        console.log("From endploint /dashb-cashier")
        res.sendFile('dashboard-cashier.html', { root: process.env.CLIENT_PATH});
    }
}

module.exports = new CashierController();