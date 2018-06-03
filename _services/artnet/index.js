const dgram = require('dgram');

const socket = dgram.createSocket('udp4')

socket.on('message', (pkt) => {
	// Check if this is an artnet packet:
	// Magic string
	if (pkt.toString('utf8', 0, 8) !== 'Art-Net\u0000') return;
	// Opcode
	if (pkt.readUInt16BE(8) !== 80) return;
	// Version
	if (pkt.readUInt16BE(10) !== 14) return;

	// Decode message
	const seq = pkt.readUInt8(12);
	const physical = pkt.readUInt8(13);
	const universe = pkt.readUInt16BE(14);
	const length = pkt.readUInt16BE(16);
	const data = pkt.slice(18);

	process.send({ event: 'ARTNET', seq, physical, universe, length, data: [...data] });
});

socket.bind(6454);

