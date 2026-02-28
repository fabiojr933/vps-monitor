require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const si = require('systeminformation');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3019;

/* ================= CONFIG ================= */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'chave-secreta-vps-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const SENHA_MESTRA = "Fabio1022@#$";

/* ================= AUTH ================= */
const checkAuth = (req, res, next) => {
    if (req.session.authenticated) return next();
    res.redirect('/login');
};

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

/* ================= LOGIN ================= */
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === SENHA_MESTRA) {
        req.session.authenticated = true;
        return res.redirect('/');
    }
    res.render('login', { error: 'Senha incorreta! Tente novamente.' });
});

app.get('/', checkAuth, async (req, res) => {
  try {

    const [
      os, cpu, mem, disk, net,
      loadRaw, currentLoad, users,
      networkStatsRaw, connections,
      processes, tempRaw, diskIORaw
    ] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.networkInterfaces(),
      si.fullLoad().catch(() => null),
      si.currentLoad(),
      si.users(),
      si.networkStats().catch(() => []),
      si.networkConnections(),
      si.processes(),
      si.cpuTemperature().catch(() => ({})),
      si.disksIO().catch(() => ({}))
    ]);

    /* ===== NORMALIZAÇÃO SEGURA ===== */
    const load = loadRaw?.avgLoad || [0, 0, 0];
    const temp = tempRaw?.main || 0;
    const diskIO = {
      r: diskIORaw?.rIO_sec || 0,
      w: diskIORaw?.wIO_sec || 0
    };
    const networkStats = networkStatsRaw[0] || { rx_bytes: 0, tx_bytes: 0 };

    /* ===== IP EXTERNO ===== */
    let publicIp = 'N/A';
    try {
      const r = await axios.get('https://api.ipify.org?format=json', { timeout: 1000 });
      publicIp = r.data.ip;
    } catch {}

    /* ===== LATÊNCIA ===== */
    let latency = 'N/A';
    try {
      latency = (await si.inetLatency('8.8.8.8')) + ' ms';
    } catch {}

    /* ===== PORTAS ===== */
    const activePorts = [];
    const portSet = new Set();

    for (const c of connections) {
      if (c.localPort && !portSet.has(c.localPort)) {
        portSet.add(c.localPort);
        activePorts.push({
          porta: c.localPort,
          nome: c.process || 'Serviço',
          tipo: (c.protocol || 'TCP').toUpperCase(),
          status: 'online'
        });
      }
    }

    /* ===== MÉTRICAS ===== */
    const cpuUso = Math.round(currentLoad.currentLoad || 0);
    const memPercent = Math.round((mem.active / mem.total) * 100);
    const diskPercent = Math.round(disk[0]?.use || 0);

    const data = {
      sistema: {
        hostname: os.hostname,
        ipExterno: publicIp,
        ipLocal: net.find(i => !i.internal && i.ip4)?.ip4 || '127.0.0.1',
        os: `${os.distro} ${os.release}`,
        arquitetura: os.arch,
        uptime: formatUptime(si.time().uptime),
        latencia
      },

      cpu: {
        modelo: cpu.brand,
        cores: `${cpu.cores}/${cpu.threads || cpu.cores}`,
        load: load.join(', '),
        uso: cpuUso,
        temperatura: temp
      },

      memoria: {
        total: (mem.total / 1024 ** 3).toFixed(2) + ' GB',
        uso: (mem.active / 1024 ** 3).toFixed(2) + ' GB',
        livre: (mem.available / 1024 ** 3).toFixed(2) + ' GB',
        percent: memPercent
      },

      disco: {
        total: (disk[0]?.size / 1024 ** 3).toFixed(2) + ' GB',
        uso: (disk[0]?.used / 1024 ** 3).toFixed(2) + ' GB',
        percent: diskPercent,
        leitura: (diskIO.r / 1024 / 1024).toFixed(2) + ' MB/s',
        escrita: (diskIO.w / 1024 / 1024).toFixed(2) + ' MB/s'
      },

      rede: {
        rx: (networkStats.rx_bytes / 1024 / 1024).toFixed(2) + ' MB',
        tx: (networkStats.tx_bytes / 1024 / 1024).toFixed(2) + ' MB',
        conexoes: connections.length,
        processos: processes.all,
        usuarios: users.length
      },

      portas: activePorts,
      alertas: {
        cpuAlta: cpuUso >= 85,
        memoriaAlta: memPercent >= 85,
        discoCheio: diskPercent >= 90,
        temperaturaAlta: temp >= 80
      },

      lastSync: new Date().toLocaleTimeString('pt-BR')
    };

    res.render('index', { data });

  } catch (err) {
    console.error('ERRO REAL:', err);
    res.status(500).send('Erro ao processar dados da VPS');
  }
});


/* ================= START ================= */
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
