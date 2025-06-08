require("dotenv").config();

class ManagerController{
    async openDashboard(req, res){
        console.log("From endploint /dashb-manager")
        res.sendFile('dashboard-manager.html', { root: process.env.CLIENT_PATH});
    }
}

module.exports = new ManagerController();