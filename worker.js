async function createWebGPUDevice(data, adapterDesc, results) {
  const adapter = await navigator.gpu.requestAdapter(adapterDesc);
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
}

async function checkWebGPU(id, data) {
  const results = {}
  if (navigator.gpu) {
    results.gpu = true;
  }

  try {
    await createWebGPUDevice(data, {}, results);
  } catch (e) {
    results.error = (e.message || e).toString();
  }

  if (!results.adapter) {
    try {
      await createWebGPUDevice(data, {compatibilityMode: true}, results);
      results.compat = true;
      delete results.error;
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
  try {
    const {command, id, data} = e.data;
    const handler = handlers[command];
    handler.call(this, id, data);
  } catch(error) {
    this.postMessage({data: 'messageerror'});
  }
}

self.onmessage = function(e) {
  handleMessage.call(e.source || self, e);
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

self.onmessageerror = (e) => {
  const source = e.source || self;
  source.postMessage({data: 'messageerror'});
}
