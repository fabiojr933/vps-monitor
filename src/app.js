require('dotenv').config();

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const cookieParser = require('cookie-parser');

const routes = require('./routes/routes');
const cache = require('./services/system.cache');

// inicia o coletor EM BACKGROUND (não bloqueia)
require('./services/collector');

const app = express();

/* =========================
   CONFIGURAÇÕES BÁSICAS
========================= */

app.set('trust proxy', 1); // IMPORTANTE para VPS atrás de proxy/CDN

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* =========================
   COOKIES + SESSION
========================= */

app.use(cookieParser(process.env.SESSION_SECRET || 'keyboard_cat'));

app.use(
  session({
    name: 'vps_monitor_sid',
    secret: process.env.SESSION_SECRET || 'keyboard_cat',
    resave: false,
    saveUninitialized: false, // evita sessão inútil
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 2 // 2 horas
    }
  })
);

app.use(flash());

/* =========================
   VARIÁVEIS GLOBAIS EJS
========================= */

app.use((req, res, next) => {
  let ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket?.remoteAddress ||
    req.ip;

  if (ip?.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  if (ip === '::1') ip = '127.0.0.1';

  res.locals.clientIp = ip;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentDate = new Date().toLocaleDateString('pt-BR');
  res.locals.messages = req.flash();

  next();
});

/* =========================
   ROTAS
========================= */

app.use(routes);

/* =========================
   API STATUS (RÁPIDA ⚡)
========================= */

app.get('/api/status', (req, res) => {
  res.json(cache.get() || {});
});

/* =========================
   FALLBACK 404
========================= */

app.use((req, res) => {
  res.status(404).render('errors/404');
});

module.exports = app;
