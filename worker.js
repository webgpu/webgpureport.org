async function checkWebGPU(id, data) {
  const results = {}
  if (navigator.gpu) {
    results.gpu = true;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        results.adapter = true;
        const device = await adapter.requestDevice();
        if (device) {
          results.device = true;
          const {canvas} = data;
          if (canvas) {
            results.context = !!canvas.getContext('webgpu');
          }
        }
      }
    } catch (e) {
      results.error = (e.message || e).toString();
    }
  }

  try {
    const offscreenCanvas = new OffscreenCanvas(300, 150);
    results.offscreen = true;
    const ctx = offscreenCanvas.getContext('2d');
    results.twoD = !!ctx;
  } catch (e) {
    console.error(e);
  }


  results.rAF = !!self.requestAnimationFrame;

  this.postMessage({id, data: results});
}

async function ping(id) {
  this.postMessage({id, data: { }});
}

const handlers = {
  ping,
  checkWebGPU,
};

function handleMessage(e) {
  const {command, id, data} = e.data;
  const handler = handlers[command];
  if (!handler) {
    throw new Error(`unknown command: ${command}`);
  }
  handler.call(this, id, data);
}

self.onmessage = function(e) {
  handleMessage.call(self, e);
};

self.onconnect = function(e) {
  const port = e.ports[0];
  port.onmessage = function(event) {
    handleMessage.call(port, event);
  };
  port.onmessageerror = function() {
    port.postMessage({data: 'messageerror'});
  };
};
