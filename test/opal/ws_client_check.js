// Standalone WebSocket check client for the up command.
// Run from an app directory that has the ws npm package installed,
// after starting a server with lib/opal/exe/up.rb:
//
//   exe/up -p 3000                                    # in one shell
//   node /path/to/opal/test/ws_client_check.js 3000   # in another
//
// Requires the app's RackApp to follow the example_rack_ws_app
// protocol: echoing messages and publishing "sent to a_channel:"
// messages to subscribers of a_channel.

const path = require('node:path');
const WebSocket = require(path.join(process.cwd(), 'node_modules', 'ws'));

const port = process.argv[2] || '3000';
const received = [];
const ws = new WebSocket(`ws://127.0.0.1:${port}/`);

ws.on('open', () => {
  console.log('connected, sending message');
  ws.send('client-check');
});
ws.on('message', (m) => {
  received.push(m.toString());
  console.log('message:', m.toString());
});
ws.on('error', (e) => {
  console.log('error:', e.message);
  process.exit(1);
});

setTimeout(() => {
  const echo = received.some((r) => r === 'client-check');
  const chan = received.some((r) => r.startsWith('sent to a_channel'));
  console.log(`echo: ${echo}, pubsub: ${chan}`);
  process.exit(echo && chan ? 0 : 1);
}, 4000);
