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
    threads: cpu.cores, // fallback realista
    load: os.loadavg().map(v => v.toFixed(2)).join(', '),
    usage: Number(load.currentLoad.toFixed(1))
  },

  memory: {
    total: (mem.total / 1024 / 1024 / 1024).toFixed(2),
    used: (mem.used / 1024 / 1024 / 1024).toFixed(2),
    free: ((mem.total - mem.used) / 1024 / 1024 / 1024).toFixed(2),
    percent: ((mem.used / mem.total) * 100).toFixed(0)
  },

  disk: fs.map(d => ({
    filesystem: d.fs,
    type: d.type,
    mount: d.mount,
    total: (d.size / 1024 / 1024 / 1024).toFixed(2),
    free: (d.available / 1024 / 1024 / 1024).toFixed(2),
    percent: d.use
  })),

  network: {
    rx: net[0]?.rx_bytes || 0,
    tx: net[0]?.tx_bytes || 0,
    connections: Number(connections),
    processes: Number(processes),
    users: Number(users)
  },

  ports: [
    { port: 22, name: 'SSH', type: 'TCP' },
    { port: 80, name: 'HTTP', type: 'TCP' },
    { port: 443, name: 'HTTPS', type: 'TCP' }
  ]
});
