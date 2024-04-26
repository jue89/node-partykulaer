const {openGpioChip, Input} = require('easy-gpiod');

const chip = openGpioChip('/dev/gpiochip0');
const {door} = chip.requestLines('door', {
	door: Input(26, {bias: 'pull-up', rising_edge: true, falling_edge: true, debounce: 100000})
});

door.on('change', (opened) => process.send({ event: 'DOOR', opened }));
