const systemService = require('../services/systemService');

class DashboardController {

    async index(req, res) {
        try {
            const data = await systemService.getAll();
            res.render('index', { data });

        } catch (error) {
            req.flash('error', 'Erro: ' + error.message);
            //  return res.redirect('/login');
        }
    }
    async teste(req, res) {
        try {
           // const data = await systemService.getAll();
            res.render('teste');

        } catch (error) {
            req.flash('error', 'Erro: ' + error.message);
            //  return res.redirect('/login');
        }
    }
}

module.exports = new DashboardController();
