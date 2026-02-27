require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const cookieParser = require('cookie-parser');
const routes = require('./routes/routes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORREÇÃO AQUI:
app.use(cookieParser('keyboard cat'));
app.use(session({ 
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 6000000 } 
}));

app.use(flash());

app.set('trust proxy', true);

app.use((req, res, next) => {
  let ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.ip ||
    req.socket.remoteAddress;

  // Remove prefixo IPv6 (::ffff:)
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  // Normaliza localhost
  if (ip === '::1') ip = '127.0.0.1';

  res.locals.clientIp = ip;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentDate = new Date().toLocaleDateString('pt-BR');

  next();
});


app.use((req, res, next) => {
  // Aqui definimos 'messages' para que o EJS o reconheça
  res.locals.messages = req.flash(); 
  next();
});

app.use(routes);

module.exports = app;