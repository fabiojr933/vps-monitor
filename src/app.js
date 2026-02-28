const express = require('express');
const si = require('systeminformation');
const axios = require('axios');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Função para formatar segundos em uptime legível
function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

app.get('/', async (req, res) => {
    try {
        // Coleta de dados em paralelo para performance
        const [os, cpu, mem, disk, net, load, currentLoad, users, networkStats] = await Promise.all([
            si.osInfo(),
            si.cpu(),
            si.mem(),
            si.fsSize(),
            si.networkInterfaces(),
            si.currentLoad(),
            si.fullLoad(),
            si.users(),
            si.networkStats()
        ]);

        // IP Externo (via API externa)
        let publicIp = 'Desconhecido';
        try {
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 2000 });
            publicIp = response.data.ip;
        } catch (e) { publicIp = 'Erro ao obter'; }

        // Formatação de Dados
        const data = {
            sistema: {
                hostname: os.hostname,
                ipExterno: publicIp,
                os: `${os.distro} ${os.release}`,
                ipLocal: net.find(i => !i.internal && i.ip4)?.ip4 || '127.0.0.1',
                arquitetura: os.arch,
                uptime: formatUptime(si.time().uptime)
            },
            cpu: {
                modelo: cpu.brand,
                cores: `${cpu.cores} / ${cpu.physicalCores}`,
                load: load.avgLoad.join(', '),
                uso: Math.round(currentLoad)
            },
            memoria: {
                total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                uso: (mem.active / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                livre: (mem.available / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                percent: Math.round((mem.active / mem.total) * 100)
            },
            disco: {
                fs: disk[0].fs,
                type: disk[0].type,
                mount: disk[0].mount,
                total: (disk[0].size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                uso: (disk[0].used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                percent: Math.round(disk[0].use)
            },
            rede: {
                rx: (networkStats[0].rx_bytes / 1024 / 1024).toFixed(2) + ' MB',
                tx: (networkStats[0].tx_bytes / 1024 / 1024).toFixed(2) + ' MB',
                conexoes: (await si.networkConnections()).length,
                processos: (await si.processes()).all,
                usuarios: users.length
            },
            portas: [
                { porta: 22, nome: 'SSH', tipo: 'TCP' },
                { porta: 80, nome: 'HTTP', tipo: 'TCP' },
                { porta: 3000, nome: 'Monitor', tipo: 'TCP' }
            ],
            lastSync: new Date().toLocaleTimeString('pt-BR')
        };

        res.render('index', { data });
    } catch (error) {
        res.status(500).send("Erro ao coletar dados: " + error.message);
    }
});

app.listen(port, () => console.log(`Monitor rodando em http://localhost:${port}`));