import msg from './worker-import.js';

const handlers = {
  ping(id) {
    postMessage({id, data: {msg}});
  },
};

self.onmessage = function(e) {
  const {command, id, data} = e.data;
  const handler = handlers[command];
  if (!handler) {
    throw new Error(`unknown command: ${command}`);
  }
  handler(id, data);
};