const assert = require('assert');
const spi = require('spi-device');
const gpiod = require('easy-gpiod');
const http = require('http');
const qsem = require('qsem');

class VolatileValue {
	constructor (defaultValue, timeout) {
		this.defaultValue = defaultValue;
		this.value = defaultValue;
		this.timeout = timeout;
	}

	setValue (value) {
		clearTimeout(this.to);
		this.value = value;
		this.to = setTimeout(() => {
			this.value = this.defaultValue;
		}, this.timeout);
	}
}

class PID {
	constructor ({k_p, k_i, k_d, u_max, u_min, target}) {
		this.k_p = k_p;
		this.k_i = k_i;
		this.k_d = k_d;
		this.u_max = u_max;
		this.u_min = u_min;
		this.target = target;
		this.summed_error = 0;
		this.last_error = 0;
		this.last_time = 0;
	}

	step (value) {
		const time = process.uptime();

		// P
		const error = this.target - value;

		// I
		const dt = this.last_time ? time - this.last_time : 0;
		this.last_time = time;
		const summed_error = this.summed_error + error * dt;

		// D
		const diff_error = dt ? (error - this.last_error) / dt : 0;
		this.last_error = error;

		let u = this.k_p * error + this.k_i * summed_error + this.k_d * diff_error;
		if (u >= this.u_max) {
			u = this.u_max;
		} else if (u <= this.u_min) {
			u = this.u_min;
		} else {
			// Only store the integrated error if u hasn't reached its bounds
			// -> Anti-windup */
			this.summed_error = summed_error;
		}

		return u;
	}
}

const chip = gpiod.openGpioChip('/dev/gpiochip0');
const {heat, fog} = chip.requestLines('fogger', {
	heat: gpiod.Output(23, { initial_value: false, final_value: false }),
	fog: gpiod.Output(24, { initial_value: false, final_value: false }),
}).lines;

const heatPower = new VolatileValue(0, 2000);

const lastTemp = new VolatileValue(0, 2000);

const PWM_LENGTH = 1000; // ms
function pwm_cycle () {
	const pwr = heatPower.value;

	if (pwr <= 0) {
		heat.value = false;
	} else {
		heat.value = true;
		if (pwr < 1) setTimeout(
			() => { heat.value = false; },
			PWM_LENGTH * pwr
		);
	}

	console.log(heatPower.value.toFixed(2), lastTemp.value.toFixed(2));

	setTimeout(pwm_cycle, PWM_LENGTH);
}
setImmediate(pwm_cycle);

const dev = spi.openSync(0, 0);
const buf = Buffer.alloc(4);
function readTemp () {
	dev.transferSync([{
		receiveBuffer: buf,
		byteLength: buf.length,
		speedHz: 500000,
	}]);

	const data = buf.readUInt32BE();

	const fault = !!(data & 0x10000);
	assert(!fault, 'Cannot read temperature sensor');

	const temp_raw = (data >> 18) & 0x3fff;
	const neg = !!(data & 0x80000000);

	const temp = ((neg ? -1 * (1 << 14) : 0) + temp_raw) * 0.25;

	assert(temp > 5);

	return temp;
}

const pid = new PID({
	k_p: 1 / 20,
	k_i: 1 / 3000,
	k_d: 0,
	u_max: 1,
	u_min: 0,
	target: 220
});

setInterval(() => {
	try {
		const temp = readTemp();
		lastTemp.setValue(temp);
		heatPower.setValue(pid.step(temp));
	} catch (e) {}
}, 100);

const mutex = qsem(1);
function fogNow (duration = 2000) {
	if (duration > 10000) return;
	return mutex.limit(async () => {
		if (lastTemp.value < 190 || lastTemp.value > 250) return;
		fog.value = true;
		await new Promise((resolve) => setTimeout(resolve, duration));
		fog.value = false;
	});
}

http.createServer((req, res) => {
	if (req.method !== 'POST') {
		res.writeHead(404);
		return res.end();
	};

	const chunks = [];
	req.on('data', (chunk) => chunks.push(chunk)).on('end', () => {
		const duration = parseInt(Buffer.concat(chunks).toString());
		fogNow(duration);
	});

	res.end();
}).listen(8080);

process
	.on('SIGUSR1', () => fogNow())
	.on('SIGINT', () => process.exit())
	.on('SIGTERM', () => process.exit());

