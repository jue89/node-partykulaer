const SPI = require('spi-device');

const spi = new SPI.openSync(1, 0);
const transfer = (msg) => spi.transfer([{sendBuffer: msg, reveiveBuffer: msg, byteLength: msg.length, speedHz: 200000}], () => {});

// Default animation
let patternName = 'doorClosed';
let color = [0xff, 0, 0, 0];
const clear = Buffer.from([0x00, 0x00, 0x00, 0x00]);
const cnt = 50;
setInterval(() => {
	const bufColor = Buffer.from(color);
	const bufList = [clear];
	for (let i = 0; i < cnt; i++) {
		bufList.push(bufColor);
	}
	bufList.push(clear);
	transfer(Buffer.concat(bufList));
}, 1000 / 25);

// Event dispatcher
process.on('message', (m) => {
	if (m.event === 'DMX') {
		const [r, g, b] = m.color;
		color = [0xff, r, g, b];
	}
});
