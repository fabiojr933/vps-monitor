
class DashboardController {

    async index(req, res) {
        try {          
            res.render('index');

        } catch (error) {
            console.log('Erro: ' + error.message);
            //  return res.redirect('/login');
        }
    }
    async teste(req, res) {
        try {
           // const data = await systemService.getAll();
            res.render('teste');

        } catch (error) {
            console.log('Erro: ' + error.message);
            //  return res.redirect('/login');
        }
    }
}

module.exports = new DashboardController();
