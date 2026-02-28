require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const si = require('systeminformation');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3019;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Garante o caminho da pasta views
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'))); // Garante o caminho da pasta public
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'chave-secreta-vps-2026', // Pode ser qualquer texto
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Sessão dura 24 horas
}));

const SENHA_MESTRA = "Fabio1022@#$"; // <--- COLOQUE SUA SENHA AQUI

const checkAuth = (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/login');
    }
};

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

app.get('/login', (req, res) => {
    res.render('login');
});
// ROTA QUE PROCESSA A SENHA
app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === SENHA_MESTRA) {
        req.session.authenticated = true;
        res.redirect('/');
    } else {
        // Se errar, redireciona ou mostra erro (aqui vamos para o Google como exemplo de "outra página")
        res.render('login', { error: 'Senha incorreta! Tente novamente.' });
    }
});
app.get('/', checkAuth, async (req, res) => {
    try {
        
        // Coleta de dados básicos
        const [os, cpu, mem, disk, net, load, currentLoad, users, networkStats, connections, processes] = await Promise.all([
            si.osInfo(),
            si.cpu(),
            si.mem(),
            si.fsSize(),
            si.networkInterfaces(),
            si.fullLoad(),      // Aqui pegamos o Load Average real
            si.currentLoad(),   // Aqui pegamos a porcentagem de uso atual
            si.users(),
            si.networkStats(),
            si.networkConnections(),
            si.processes()
        ]);

        // IP Externo com Timeout curto
        let publicIp = 'N/A';
        try {
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 1000 });
            publicIp = response.data.ip;
        } catch (e) { publicIp = 'Erro IP'; }

        // Mapeamento de Portas
        const activePorts = [];
        const portSet = new Set();
        
        // Filtramos apenas portas únicas e que estejam no estado 'LISTEN' (Ouvindo)
        // Se quiser ver todas as conexões, remova o filtro .state === 'LISTEN'
        for (const conn of connections) {
            const portNum = conn.localPort;
            if (portNum && !portSet.has(portNum)) {
                portSet.add(portNum);
                activePorts.push({
                    porta: portNum,
                    nome: conn.process || 'Serviço Ativo',
                    tipo: (conn.protocol || 'TCP').toUpperCase(),
                    status: 'online' // Se está na lista de conexões, está online
                });
            }
        }
        // Ordena da menor porta para a maior
        activePorts.sort((a, b) => a.porta - b.porta);

        const data = {
            sistema: {
                hostname: os.hostname || 'localhost',
                ipExterno: publicIp,
                os: `${os.distro} ${os.release}`,
                ipLocal: net.find(i => !i.internal && i.ip4)?.ip4 || '127.0.0.1',
                arquitetura: os.arch,
                uptime: formatUptime(si.time().uptime)
            },
            cpu: {
                modelo: cpu.brand,
                cores: `${cpu.cores} / ${cpu.threads || cpu.cores}`,
                // CORREÇÃO: load.avgLoad é onde ficam as médias de 1, 5 e 15 min
                load: (load.avgLoad && Array.isArray(load.avgLoad)) ? load.avgLoad.join(', ') : '0.00, 0.00, 0.00',
                uso: Math.round(currentLoad.currentLoad || 0)
            },
            memoria: {
                total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                uso: (mem.active / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                livre: (mem.available / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                percent: Math.round((mem.active / mem.total) * 100)
            },
            disco: {
                fs: disk[0]?.fs || 'n/a',
                type: disk[0]?.type || 'n/a',
                mount: disk[0]?.mount || '/',
                total: disk[0] ? (disk[0].size / 1024 / 1024 / 1024).toFixed(2) + ' GB' : '0 GB',
                uso: disk[0] ? (disk[0].used / 1024 / 1024 / 1024).toFixed(2) + ' GB' : '0 GB',
                percent: Math.round(disk[0]?.use || 0)
            },
            rede: {
                rx: networkStats[0] ? (networkStats[0].rx_bytes / 1024 / 1024).toFixed(2) + ' MB' : '0 MB',
                tx: networkStats[0] ? (networkStats[0].tx_bytes / 1024 / 1024).toFixed(2) + ' MB' : '0 MB',
                conexoes: connections.length || 0,
                processos: processes.all || 0,
                usuarios: users.length || 0
            },
            portas: activePorts, 
            
            lastSync: new Date().toLocaleTimeString('pt-BR')
        };

        res.render('index', { data });

    } catch (error) {
        console.error("Erro interno:", error);
        res.status(500).send("Erro ao processar dados da VPS: " + error.message);
    }
});

app.listen(port, () => console.log(`Servidor rodando em http://localhost:${port}`));