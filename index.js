const Pusher = require('pusher-client');
const fs = require("fs");
const Alert = require("./assets/classes/alert");

const pusherJsonConfig = JSON.parse(
	fs.readFileSync("config/pusher_config.json")
);

const socket = new Pusher(pusherJsonConfig.key, {
	cluster: pusherJsonConfig.cluster
});

socket.subscribe(pusherJsonConfig.channel);
socket.bind(pusherJsonConfig.event,
	function (data) {

		activateAlert(data.alert_type, data.amount_of_loops);
	}
);

function activateAlert(alertType, amountOfLoops) {

	const alert = new Alert(alertType, amountOfLoops);
	alert.activateAlert();
}