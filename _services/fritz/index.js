const GR = require('global-rainbow');
const SPI = require('spi-device');

const spi = new SPI.openSync(1, 0);
const transfer = (msg) => spi.transfer([{sendBuffer: msg, reveiveBuffer: msg, byteLength: msg.length, speedHz: 200000}], () => {});

const shift = (pattern, offset) => pattern.map((row) => {
	return row.map((item, n, row) => row[Math.abs((n + offset) % row.length)]);
});

const pattern2color = (pattern, color) => pattern.map((row) => {
	return row.map((brightness) => [
		Math.floor(color[0] * brightness),
		Math.floor(color[1] * brightness),
		Math.floor(color[2] * brightness)
	]);
});

const pattern = {
	doorClosed: (frame) => shift([
		[0.0, 1.0, 0.2, 0.1, 0.0, 0.0],
		[1.0, 0.2, 0.1, 0.0, 0.0, 0.0],
		[1.0, 0.2, 0.1, 0.0, 0.0, 0.0],
		[0.0, 1.0, 0.2, 0.1, 0.0, 0.0],
	], Math.floor(frame / 5)),
	doorOpened: (frame) => (frame % 30 > 14) ? [
		[ 1, 1, 1, 1, 1, 1 ],
		[ 1, 0, 0, 0, 0, 1 ],
		[ 1, 0, 0, 0, 0, 1 ],
		[ 1, 1, 1, 1, 1, 1 ],
	] : [
		[ 0, 0, 0, 0, 0, 0 ],
		[ 0, 1, 1, 1, 1, 0 ],
		[ 0, 1, 1, 1, 1, 0 ],
		[ 0, 0, 0, 0, 0, 0 ],
	]
};

// Default animation
const color = new GR();
let patternName = 'doorClosed';
let frame = 0;
let defInterval;
const startDefaultAnimation = () => {
	defInterval = setInterval(() => {
		// Get current color
		const curColor = color.get();

		// Calc pattern for Firtz Kola
		const curPattern = pattern[patternName](frame++);
		const curPixels = pattern2color(curPattern, curColor);
		const curRows = curPixels
			.reverse()
			.map((row, n) => (n % 2) ? row : row.reverse())
			.reduce((acc, p) => acc.concat(p), []);
		const curCols = curRows
			.reduce((acc, p) => acc.concat(p), []);

		// Send pattern to Fritz Kola
		transfer(Buffer.from(curCols.concat(curCols)));
	}, 1000 / 25);
};
const stopDefaultAnimation = () => {
	clearInterval(defInterval);
	defInterval = undefined;
}

// Artnet animation
let artnetTimeout;
const displayArtnet = (color) => {
	if (defInterval) stopDefaultAnimation();

	// Send color of the first channel
	const buf = Buffer.alloc(3 * 24);
	for (let i = 0; i < buf.length; i++) {
		buf[i] = color[i % 3];
	}
	transfer(buf);

	// If no artnet packets are received, start the default animation again
	if (artnetTimeout) clearTimeout(artnetTimeout);
	artnetTimeout = setTimeout(() => startDefaultAnimation(), 5000);
}

// Event dispatcher
process.on('message', (m) => {
	if (m.event === 'DOOR') {
		patternName = m.opened ? 'doorOpened' : 'doorClosed';
	} else if (m.event === 'ARTNET' && m.data.length >= 3) {
		displayArtnet(m.data);
	}
});

startDefaultAnimation();
