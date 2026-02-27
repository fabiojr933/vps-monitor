const si = require('systeminformation');
const os = require('os');
const axios = require('axios');
const { execSync } = require('child_process');

function bytesToGB(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

function bytesToMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

async function getExternalIP() {
  try {
    const res = await axios.get('https://api.ipify.org?format=json');
    return res.data.ip;
  } catch {
    return 'N/A';
  }
}

function getPorts() {
  try {
    const output = execSync(`ss -tulnp`).toString();
    const ports = [];
    output.split('\n').forEach(line => {
      const match = line.match(/:(\d+)/);
      if (match) {
        ports.push({
          port: match[1],
          name: 'Service',
          type: line.includes('tcp') ? 'TCP' : 'UDP'
        });
      }
    });
    return ports.slice(0, 10);
  } catch {
    return [];
  }
}

module.exports.getAll = async () => {
  const [
    cpu,
    mem,
    fs,
    net,
    load,
    osInfo
  ] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.currentLoad(),
    si.osInfo()
  ]);

  return {
    system: {
      hostname: os.hostname(),
      os: `${osInfo.distro} ${osInfo.release}`,
      arch: os.arch(),
      uptime: formatUptime(os.uptime()),
      ipExternal: await getExternalIP(),
      ipLocal: net[0]?.iface || 'N/A'
    },
    cpu: {
      model: cpu.manufacturer + ' ' + cpu.brand,
      cores: cpu.cores,
      threads: cpu.physicalCores,
      load: load.avgload.toFixed(2),
      usage: load.currentLoad.toFixed(1)
    },
    memory: {
      total: bytesToGB(mem.total),
      used: bytesToGB(mem.used),
      free: bytesToGB(mem.free),
      percent: ((mem.used / mem.total) * 100).toFixed(0)
    },
    disk: fs.map(d => ({
      filesystem: d.fs,
      type: d.type,
      mount: d.mount,
      total: bytesToGB(d.size),
      free: bytesToGB(d.available),
      percent: d.use
    }))[0],
    network: {
      rx: bytesToMB(net[0]?.rx_bytes || 0),
      tx: bytesToMB(net[0]?.tx_bytes || 0),
      connections: execSync('ss -tun | wc -l').toString().trim(),
      processes: execSync('ps aux | wc -l').toString().trim(),
      users: execSync('who | wc -l').toString().trim()
    },
    ports: getPorts()
  };
};
