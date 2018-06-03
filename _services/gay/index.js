const GR = require('global-rainbow');
const color = new GR();

const offsetRE = /_([\-0-9]+)\/index\.js$/;
const offsetFromDir = offsetRE.exec(process.argv[1]);
const offset = offsetFromDir ? parseInt(offsetFromDir[1]) : 0;

const sendColor = (color) => process.send({ event: 'DMX', color });

// Default animation
let rainbow;
const defStart = () => {
	rainbow = setInterval(() => sendColor(color.get(offset)), 1000 / 30);
};
const defStop = () => {
	clearTimeout(rainbow);
	rainbow = undefined;
};

// Colors received by artnet
let artnet;
const processArtnet = (data) => {
	if (rainbow) defStop();
	sendColor(data.slice(0,3));
	if (artnet) clearTimeout(artnet);
	artnet = setTimeout(() => defStart(), 5000);
};

// Dispatch events
process.on('message', (msg) => {
	if (msg.event === 'ARTNET' && msg.data.length >= 3) {
		processArtnet(msg.data);
	}
});

defStart();
