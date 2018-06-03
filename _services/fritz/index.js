const GR = require('global-rainbow');
const SPI = require('spi');
 
const spi = new SPI.Spi('/dev/spidev1.0', {
	'mode': SPI.MODE['MODE_0'],  // always set mode as the first option
	'chipSelect': SPI.CS['none'] // 'none', 'high' - defaults to low
}, function(s){s.open();});
 
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
		const curPattern = pattern[patternName](frame++);;
		const curPixels = pattern2color(curPattern, color.get());
		const curRows = curPixels
			.reverse()
			.map((row, n) => (n % 2) ? row : row.reverse())
			.reduce((acc, p) => acc.concat(p), []);
		const curCols = curRows
			.reduce((acc, p) => acc.concat(p), []);
		spi.write(Buffer.from(curCols));
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
	spi.write(buf);

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
