const fs = require("fs");
const fetch = require("node-fetch");

const hueJsonConfig = JSON.parse(
	fs.readFileSync("config/hue_config.json")
);

module.exports = class Alert {

	constructor(type, amountOfLoops) {

		this.type = type;
		this.bridges = this._getBridges();
		this.lightSetup = {};
		this.amountOfLoops = amountOfLoops;
		this.currentLoop = 1;
		this.debug = false;
	}

	activateAlert() {

		console.log('Activate Alert: ', this.type);

		if (this._validAlertType(this.type)) {

			if (this.type === 'disco') {

				this._discoAlertSetup();
			}
		}
	}

	_validAlertType(type) {

		if (type !== 'disco') {

			console.log('Wrong alert type');
			return false;
		}

		return true;
	}

	_getBridges() {

		const bridgesConfig = [];
		let bridges = hueJsonConfig;

		const keys = Object.keys(bridges);
		keys.forEach(key => {

			bridgesConfig.push({
				ip: bridges[key].ip,
				username: bridges[key].username
			});
		});

		return bridgesConfig;
	}

	async _getLights() {

		const lights = [];

		for (let bridge of this.bridges) {

			let tempLights = bridge;
			tempLights.lights = await this._getLightsByBridge(bridge.ip, bridge.username);
			lights.push(tempLights);
		}

		return lights;
	}

	async _getLightsByBridge(bridgeIp, username) {

		const url = `http://${bridgeIp}/api/${username}/lights/`;
		const response = await fetch(url);
		const json = await response.json();
		return json;
	}

	async _combineBridgeWithLights() {

		this.lightSetup = await this._getLights();
	}

	async _discoAlertSetup() {

		//get all the lights
		await this._combineBridgeWithLights();
		this._discoAlert();
	}

	_discoAlert() {

		//let discoObject = Object.assign({}, this.lightSetup);
		let discoObject = this.lightSetup;

		discoObject.forEach((group, i) => {
			discoObject[i].lights = this._lightsObjectToArray(group.lights);
		});



		let bridgeCounter = 0;

		const discoInterval = setInterval(() => {

			if (this._allLightsFinished(discoObject)) {

				clearInterval(discoInterval);
				this._resetAll();
				if (this.currentLoop > this.amountOfLoops) {

					console.log('And we are done');
					this.currentLoop = 1;
					this._resetAllLights();
					return;
				}
				this.activateAlert();
			}

			if (bridgeCounter < discoObject.length) {

				if (discoObject[bridgeCounter].lights.length > 0) {

					let randomLight = this._getRandomInt(discoObject[bridgeCounter].lights.length - 1);
					let theLight = discoObject[bridgeCounter].lights[randomLight];
					discoObject[bridgeCounter].lights.splice(randomLight, 1);

					this._animateLight(
						discoObject[bridgeCounter].ip,
						discoObject[bridgeCounter].username,
						theLight
					);
				}
				bridgeCounter++;
			} else {

				bridgeCounter = 0;
			}
		}, 50)
	}

	_resetAll() {

		console.log('Reset');
		this.bridges = this._getBridges();
		this.lightSetup = {};
		this.currentLoop++;
	}

	_animateLight(bridgeIp, bridgeUsername, lightId) {

		let red = Math.random(1, 255);
		let green = Math.random(1, 255);
		let blue = Math.random(1, 255);

		let stateObject = {
			"bri": 254,
			"xy": this._RGBtoXY(red, green, blue)
		}

		if (!this.debug) {
			const url = `http://${bridgeIp}/api/${bridgeUsername}/lights/${lightId}/state`;
			fetch(url, {
				method: 'PUT',
				body: JSON.stringify(stateObject)
			});
		}
	}

	_allLightsFinished(lightsObject) {

		let allZero = true;
		lightsObject.forEach(lightObject => {

			if (lightObject.lights.length > 0) {

				allZero = false;
			}
		});

		return allZero;
	}

	_lightsObjectToArray(lights) {

		return Object.keys(lights);
	}

	_getRandomInt(max) {
		return Math.floor(Math.random() * Math.floor(max));
	}

	_RGBtoXY(red, green, blue) {
		//Gamma correctie
		red = (red > 0.04045) ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : (red / 12.92);
		green = (green > 0.04045) ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : (green / 12.92);
		blue = (blue > 0.04045) ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : (blue / 12.92);

		//Apply wide gamut conversion D65
		var X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
		var Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
		var Z = red * 0.000088 + green * 0.072310 + blue * 0.986039;

		var fx = X / (X + Y + Z);
		var fy = Y / (X + Y + Z);

		const XY = [parseFloat(fx.toPrecision(4)), parseFloat(fy.toPrecision(4))];
		return XY;
	}

	async _resetAllLights() {

		console.log('resetting the lights');

		for (let bridge of this.bridges) {

			console.log('getting all keys of the groups');
			let groupKeys = await this._getAllGroupKeysFromBridge(bridge.ip, bridge.username);
			for (let i = 0; i < groupKeys.length; i++) {

				this._resetGroup(groupKeys[i], bridge.ip, bridge.username);
			}
		}

	}

	async _getAllGroupKeysFromBridge(bridgeIp, bridgeUsername) {

		const url = `http://${bridgeIp}/api/${bridgeUsername}/groups`;
		const response = await fetch(url);
		const json = await response.json();

		return Object.keys(json);
	}

	async _resetGroup(groupKey, bridgeIp, bridgeUsername) {

		const stateObject =
		{
			"on": true,
			"bri": 254,
			"hue": 8418,
			"sat": 140,
			"effect": "none",
			"xy": [
				0.4573,
				0.41
			],
			"ct": 366,
			"alert": "none",
			"colormode": "ct",
			"mode": "homeautomation",
			"reachable": true
		}

		const url = `http://${bridgeIp}/api/${bridgeUsername}/groups/${groupKey}/action`;
		try {
			fetch(url, {
				method: 'PUT',
				body: JSON.stringify(stateObject)
			})
		} catch (error) {

			console.log('something went wrong', error);
		};

		console.log(`reset request send to group: ${groupKey} on: ${bridgeIp}`);
	}
}