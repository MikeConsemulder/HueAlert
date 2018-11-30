# HueAlert
Alerts for you hue across multiple bridges

# Install

 - First run npm install,
 - Then create a folder namen "config"
 - in this folder, create 2 files: 
    - hue_config.json
    - pusher_config.json

in hue_config.json you put your bridges with ip: nad username like this

{
    "1":{
        "ip":"00.00.00.00",
        "username": "username"
    },
    "2":{
        "ip":"00.00.00.00",
        "username": "username"
    }
}

in the pusher_config.json you create the following.

{
    "key":"key",
    "cluster": "cluster",
    "channel":"channel",
    "event": "event"
}