const GR = require('global-rainbow');
const color = new GR();

const offsetRE = /_([\-0-9]+)\/index\.js$/;
const offsetFromDir = offsetRE.exec(process.argv[1]);
const offset = offsetFromDir ? parseInt(offsetFromDir[1]) : 0;
console.log(offset);

setInterval(() => {
	process.send({
		event: 'DMX',
		color: color.get(offset)
	});
}, 1000 / 30);
