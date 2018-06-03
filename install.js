const fs = require('fs');

const service = `
[Unit]
Description=Party Daemon
After=network.target

[Service]
Type=simple
ExecStart=${process.execPath} ${__dirname}
Restart=on-failure

[Install]
WantedBy=multi-user.target
`

fs.writeFileSync('/etc/systemd/system/partykulaer.service', service);
console.log('Installed service file');
console.log('Please exec: systemctl enable partykulaer; systemctl start partykulaer');
