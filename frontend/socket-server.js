const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });

console.log('WebSocket server started on port 8080');

wss.on('connection', function connection(ws) {
  console.log('A new client connected');

  ws.on('message', function message(data) {
    console.log('received: %s', data);
    // Broadcast the message to all clients except the sender
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(data.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.send('Welcome to the agent log stream!');
});
