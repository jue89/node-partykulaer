const DMX = require( 'dmx4pi' )( {
    pinTx: 22,   // Data pin
    pinEn: 27,   // Enable ping
    invTx: true, // Data pin
    invEn: true  // Enable pin
} );

const output = (c) => {
	const buf = Buffer.from([0, c[0], c[1], c[2], 0]);
	DMX.transmit(buf);
};

process.on('message', (msg) => {
	if (msg.event === 'DMX') {
		output(msg.color);
	}
});

