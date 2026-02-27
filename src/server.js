const app = require('./app');

app.listen(process.env.APP_PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${process.env.APP_PORT}`);
});
