const fs = require("fs");
const fetch = require("node-fetch");

const hueJsonConfig = JSON.parse(
	fs.readFileSync("config/hue_config.json")
);

module.exports = class Alert {

	constructor(type) {

		this.type = type;
		this.bridges = this._getBridges();
	}

	activateAlert() {

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

		let discoObject = this.lightSetup;

		discoObject.forEach((group, i) => {
			discoObject[i].lights = this._lightsObjectToArray(group.lights);
		});

		let bridgeCounter = 0;

		const discoInterval = setInterval(() => {

			if (this._allLightsFinished(discoObject)) {

				clearInterval(discoInterval);
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
		}, 100)
	}

	_animateLight(bridgeIp, bridgeUsername, lightId) {

		let stateObject = {
			"on": true,
			"bri": 254,
			"hue": 61946,
			"sat": 254,
			"effect": "none",
			"xy": [
				0.5866,
				0.2575
			],
			"ct": 153,
			"alert": "none",
			"colormode": "xy",
			"mode": "homeautomation",
			"reachable": false
		}

		const url = `http://${bridgeIp}/api/${bridgeUsername}/lights/${lightId}/state`;

		const response = fetch(url, {
			method: 'PUT',
			body: JSON.stringify(stateObject)
		});


		console.log('send to light ', lightId);
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
}