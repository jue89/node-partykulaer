const SPI = require('spi-device');
const GR = require('global-rainbow');

const spiWand = SPI.openSync(0, 0);
const wandTransfer = (msg) => spiWand.transfer([{sendBuffer: msg, byteLength: msg.length, speedHz: 500000}], () => {});
const spiTreppe = SPI.openSync(0, 1);
const treppeTransfer = (msg) => spiTreppe.transfer([{sendBuffer: msg, byteLength: msg.length, speedHz: 500000}], () => {});

const color = new GR();
const seqWand = [];
for (let i = 0; i > -35; i--) seqWand.push(i);
const seqTreppe = [];
for (let i = 0; i < 200; i++) seqTreppe.push(i);

let defInterval;
const startDefaultAnimation = () => {
	defInterval = setInterval(() => {
		const colorsWand = color.get(seqWand);
		const rowWand = colorsWand.reduce((acc, color) => {
			if (acc.length) acc.unshift(color);
			acc.push(color);
			return acc;
		}, []);
		const pixelsWand = rowWand.concat(rowWand).reduce((acc, color) => acc.concat(color), []);
		wandTransfer(Buffer.from(pixelsWand));

		const colorsTreppe = color.get(seqTreppe);
		const pixelsTreppe = colorsTreppe.reduce((acc, color) => acc.concat(color));
		treppeTransfer(Buffer.from(pixelsTreppe));
	}, 1000/50);
};
const stopDefaultAnimation = () => {
	clearInterval(defInterval);
	defInterval = undefined;
}

// Artnet animation
let artnetTimeout;
const displayArtnet = (color) => {
	if (defInterval) stopDefaultAnimation();

	const buf = Buffer.allocUnsafe(200 * 3);
	for (let i = 0; i < buf.length; i++) buf[i] = color[i % 3];

	treppeTransfer(buf);
	wandTransfer(buf);

	// If no artnet packets are received, start the default animation again
	if (artnetTimeout) clearTimeout(artnetTimeout);
	artnetTimeout = setTimeout(() => startDefaultAnimation(), 5000);
}

// Event dispatcher
process.on('message', (m) => {
	if (m.event === 'ARTNET' && m.data.length >= 3) {
		displayArtnet(m.data);
	}
});

startDefaultAnimation();
