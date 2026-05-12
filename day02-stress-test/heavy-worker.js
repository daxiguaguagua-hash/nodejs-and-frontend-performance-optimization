const { parentPort } = require('worker_threads');
const crypto = require('crypto');

parentPort.on('message', ({ iterations }) => {
  let hash = '';
  for (let i = 0; i < iterations; i++) {
    hash = crypto.createHash('sha256').update(hash + i).digest('hex');
  }
  parentPort.postMessage(hash.slice(0, 16));
});
