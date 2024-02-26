import WebSocket from 'ws';

export function createBot() {
  const botWs = new WebSocket('ws://localhost:3000');

  botWs.on('open', () => {
    console.log('Bot connected');
  });

  botWs.on('close', () => {
    console.log('Bot disconnected');
  });

  return botWs;
}
