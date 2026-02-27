const si = require('systeminformation');
const os = require('os');
const axios = require('axios');
const cache = require('./system.cache');
const { exec } = require('child_process');

function execCmd(cmd) {
  return new Promise(resolve => {
    exec(cmd, (err, stdout) => {
      resolve(stdout?.trim() || '0');
    });
  });
}

async function getExternalIP() {
  try {
    const { data } = await axios.get('https://api.ipify.org?format=json', { timeout: 1000 });
    return data.ip;
  } catch {
    return 'N/A';
  }
}

async function collect() {
  try {
    const [
      cpu,
      mem,
      fs,
      load,
      net,
      osInfo,
      ipExternal,
      connections,
      processes,
      users
    ] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.networkStats(),
      si.osInfo(),
      getExternalIP(),
      execCmd('ss -tun | wc -l'),
      execCmd('ps aux | wc -l'),
      execCmd('who | wc -l')
    ]);

    cache.set({
      system: {
        hostname: os.hostname(),
        os: `${osInfo.distro} ${osInfo.release}`,
        arch: os.arch(),
        uptime: Math.floor(os.uptime()),
        ipExternal
      },
      cpu: {
        model: cpu.brand,
        cores: cpu.cores,
        usage: load.currentLoad.toFixed(1)
      },
      memory: {
        total: mem.total,
        used: mem.used,
        percent: ((mem.used / mem.total) * 100).toFixed(0)
      },
      disk: fs[0],
      network: {
        rx: net[0]?.rx_bytes || 0,
        tx: net[0]?.tx_bytes || 0,
        connections,
        processes,
        users
      }
    });

  } catch (e) {
    console.error('Collector error', e.message);
  }
}

// roda a cada 3 segundos
setInterval(collect, 3000);
collect();
