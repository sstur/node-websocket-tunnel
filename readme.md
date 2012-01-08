#TCP over WebSocket

This tool allows you to tunnel TCP connections over WebSocket protocol using SSL. It consists of a server agent and
a client console. If the server agent is running on a remote machine you can use it as a middle-man to route connections
securely to any network host even through firewalls and proxies.

##Example use cases:
 - You are on a restricted network that only allows traffic on ports 80 and 443
 - You wish to connect securely to a service from a public access point, and cannot use SSH

Due to WebSocket connections starting out as normal HTTPS, this can be used to tunnel connections through certain
restrictive firewalls that do not even allow SSH or OpenVPN over port 443.

##Usage

On a server, run `server.js` specifying optional port and address to bind to (defaults to 0.0.0.0:443):

`node server.js 74.125.227.148:443`

On a client, run `connect.js` specifying remote host and optional port (defaults to 443):

`node connect.js 74.125.227.148`

You will be prompted for username/password which the server will verify against users.txt and then you are presented
with a command shell where you can create and destroy tunnels.

`> tunnel 3306 8.12.44.238:3306`

This will listen on port 3306 on the client (localhost) and forward connections to remote host 8.12.44.238 via the
WebSocket server. Destination port, if omitted, will default to source port.

The server uses SSL key files present in `keys/` and users listed in `users.txt` (in which passwords are md5 hashed).

