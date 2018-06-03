const readdir = require('fs').readdirSync;
const join = require('path').join;
const fork = require('child_process').fork;
const debug = require('util').debuglog('dispatcher');

// Get our config dir
const config = process.env.CONF || require('os').hostname();

// Start services
debug('START', config);
const srvDir = join(__dirname, config);
const services = readdir(srvDir).map((name) => {
	debug('    =>', name);
	const main = join(srvDir, name, 'index.js');
	const proc = fork(main);
	return { name, main, proc };
});

// Install message dispatcher
services.forEach((src) => src.proc.on('message', (msg) => {
	debug('MSG', msg);
	// We received a message from src
	// Transmit it to all other services
	services.filter((dst) => dst !== src).forEach((dst) => {
		debug('    =>', dst.name);
		dst.proc.send(msg);
	});
}));

