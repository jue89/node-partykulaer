const GPIO = require('onoff').Gpio;
const door = new GPIO(26, 'in', 'both');

door.watch((err, opened) => {
	process.send({ event: 'DOOR', opened });
});
