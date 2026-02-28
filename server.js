const express = require('express');
const si = require('systeminformation');
const axios = require('axios');
const path = require('path');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

app.get('/', async (req, res) => {
    try {
        // Coleta os dados necessários
        const [os, cpu, mem, disk, net, currentLoad, users, networkStats, connections, processes] = await Promise.all([
            si.osInfo(),
            si.cpu(),
            si.mem(),
            si.fsSize(),
            si.networkInterfaces(),
            si.currentLoad(), // Este traz tanto o uso % quanto o avgLoad
            si.users(),
            si.networkStats(),
            si.networkConnections(),
            si.processes()
        ]);

        // IP Externo
        let publicIp = 'Desconhecido';
        try {
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 1500 });
            publicIp = response.data.ip;
        } catch (e) { publicIp = 'N/A'; }

        // Portas que você quer monitorar (exemplo manual)
        const monitorPortas = [
            { porta: 22, nome: 'SSH', tipo: 'TCP' },
            { porta: 80, nome: 'HTTP', tipo: 'TCP' },
            { porta: 3000, nome: 'Monitor', tipo: 'TCP' }
        ];

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
                cores: `${cpu.cores} / ${cpu.threads || cpu.cores}`,
                // O avgLoad fica dentro do currentLoad
                load: currentLoad.avgLoad ? currentLoad.avgLoad.join(', ') : 'N/A',
                uso: Math.round(currentLoad.currentLoad)
            },
            memoria: {
                total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                uso: (mem.active / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                livre: (mem.available / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                percent: Math.round((mem.active / mem.total) * 100)
            },
            disco: {
                fs: disk[0]?.fs || 'N/A',
                type: disk[0]?.type || 'N/A',
                mount: disk[0]?.mount || '/',
                total: (disk[0]?.size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                uso: (disk[0]?.used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                percent: Math.round(disk[0]?.use || 0)
            },
            rede: {
                rx: networkStats[0] ? (networkStats[0].rx_bytes / 1024 / 1024).toFixed(2) + ' MB' : '0 MB',
                tx: networkStats[0] ? (networkStats[0].tx_bytes / 1024 / 1024).toFixed(2) + ' MB' : '0 MB',
                conexoes: connections.length,
                processos: processes.all,
                usuarios: users.length
            },
            portas: monitorPortas.map(p => ({
                ...p,
                status: connections.some(c => c.localPort === p.porta.toString()) ? 'online' : 'offline'
            })),
            lastSync: new Date().toLocaleTimeString('pt-BR')
        };

        res.render('index', { data });
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao coletar dados: " + error.message);
    }
});

app.listen(port, () => console.log(`Monitor rodando em http://localhost:${port}`));