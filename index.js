
function createElem(tag, attrs = {}) { 
  const elem = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function') {
      const event = key.substring(2).toLowerCase();
      elem.addEventListener(event, value);
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        elem[key][k] = v;
      }
    } else if (elem[key] === undefined) {
      elem.setAttribute(key, value);
    } else {
      elem[key] = value;
    }
  }
  return elem;
}

function addElem(tag, attrs = {}, children  = []) {
  const elem = createElem(tag, attrs);
  for (const child of children) {
    elem.appendChild(child);
  }
  return elem;
}

function appendElem(parent, ...args) {
  const elem = addElem(...args);
  parent.appendChild(elem);
  return elem;
}

const el = addElem;

const shortSize = (function() {
  const suffixes = ['b', 'k', 'mb', 'gb', 'tb', 'pb'];
  return function(size) {
    const suffixNdx = Math.log2(Math.abs(size)) / 10 | 0;
    const suffix = suffixes[Math.min(suffixNdx, suffixes.length - 1)];
    const base = 2 ** (suffixNdx * 10);
    return `${(size / base).toFixed(0)}${suffix}`;
  };
})();

function addValueRow(className, k, v) {
  return el('tr', {className}, [
    el('td', {textContent: k}),
    el('td', {innerHTML: v >= 1024 ? `${v}&nbsp;(${shortSize(v)})` : v}),
  ]);
}

function byFirstColumn(trA, trB) {
  const a = trA.cells[0].textContent;
  const b = trB.cells[0].textContent;
  return a < b ? -1 : a > b ? 1 : 0; 
}

function expandSetLike(obj) {
  let entries = [...obj.values()];
  if (entries.length === 0) {
    entries = ['none'];
  }
  return entries
    .map(value => el('tr', {className: 'limit'}, [el('td', {colSpan: 2, textContent: value})]))
    .sort(byFirstColumn);
}

function expandMapLike(obj) {
  const entries = [];
  for (const key in obj) {
    entries.push([key, obj[key]]);
  }
  return entries
    .map(([k, v]) => addValueRow('feature', k, v))
    .sort(byFirstColumn);
}

function setLikeToTableRows(values) {
  return values
    ? expandSetLike(values)
    : [el('tr', {}, [el('td', {colSpan: 2, textContent: 'not yet implemented by this browser'})])];
}

function mapLikeToTableRows(values) {
  return values
    ? expandMapLike(values)
    : [el('tr', {}, [el('td', {colSpan: 2, textContent: 'not yet implemented by this browser'})])];
}

function log(...args) {
  const elem = document.createElement('pre');
  elem.textContent = args.join(' ');
  document.body.appendChild(elem);
}

async function adapterToElements(adapter) {
  // UGH!
  const adapterInfo = await (adapter.requestAdapterInfo ? adapter.requestAdapterInfo() : undefined);

  const limitsSectionElem = el('tr', {className: 'section'}, [
    el('td', {colSpan: 2, textContent: 'limits:'}),
  ]);

  return el('table', {}, [
    el('tbody', {}, [
      el('tr', {className: 'section'}, [
        el('td', {colSpan: 2}, [
          el('div', {className: 'space-around'}, [
            el('div', {textContent: 'adapter info:'}),
            ...(adapterInfo ? [el('button', {
              type: 'button', 
              onClick: async function() {
                // Note: The entire thing is a little big wonky. In order to make the data line up
                // all the data is in a single table so that the largest cell in each column defines the
                // size of that column. Where as, the data looks like it wants each section to have it's own
                // hierarchy of elements. But, because it's all one table there's no trivial definition of
                // "start of section" or "end of section". We end up adding rows by finding the top of our
                // section, then finding the next section, then inserting rows before that.
                const tbody = limitsSectionElem.parentElement;
                try {
                  const adapterInfo = await adapter.requestAdapterInfo(['vendor', 'architecture', 'device', 'description']);
                  const rows = mapLikeToTableRows(adapterInfo);
                  for (const row of rows) {
                    const desc = row.cells[0];
                    desc.textContent = `unmasked: ${desc.textContent}`;
                    tbody.insertBefore(row, limitsSectionElem);
                  }
                } catch (e) {
                  const row = el('tr', {className: 'error'}, [
                    el('td', {colSpan: 2, textContent: e.toString()}),
                  ]);
                  tbody.insertBefore(row, limitsSectionElem);
                }
                this.remove();
              },
              textContent: 'request unmasked',
            })] : []),
          ]),
        ]),
      ]),
      ...mapLikeToTableRows(adapterInfo),
      limitsSectionElem,
      ...mapLikeToTableRows(adapter.limits),
      el('tr', {className: 'section'}, [
        el('td', {colSpan: 2, textContent: 'features:'}),
      ]),
      ...setLikeToTableRows(adapter.features),
    ]),
  ]);
}

class WorkerHelper {
  constructor(url) {
    this._id = 0;
    this._promisesByIdMap = new Map();
    this._messagesByIdMap = new Map();
    this._pinged = false;
    this._bad = false;
    this._worker = new Worker(url, {type: 'module'});
    this._worker.addEventListener('error', (e) => {
      this._bad = true;
      // reject all existing promises
      this._promisesByIdMap.forEach(({reject}) => {
        reject();
      });
    });
    this._worker.onmessage = (e) => {
      const {id, data} = e.data;
      this._messagesByIdMap.set(id, data);
      this._process(id);
    };
    this._pingPromise = this.getMessage('ping');
    (async () => {
      try {
        await this._pingPromise;
        this._pinged = true;
      } catch (e) {
        //
      }
    })();
  }
  _process(id) {
    const p = this._promisesByIdMap.get(id);
    if (this._bad) {
      p.reject();
      this._messagesByIdMap.delete(id);
      this._promisesByIdMap.delete(id);
    }
    const data = this._messagesByIdMap.get(id);
    if (p && data) {
      this._messagesByIdMap.delete(id);
      this._promisesByIdMap.delete(id);
      p.resolve(data);
    }
  }
  async getMessage(command, data = {}, transfer = []) {
    let resolve;
    let reject;
    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    const id = this._id++;
    this._promisesByIdMap.set(id, {resolve, reject});
    this._worker.postMessage({command, id, data}, transfer);
    this._process(id);
    return (this._pinged || !this._pingPromise) ? promise : this._pingPromise.then(() => promise);
  }
}

function addSupportsRow(tbody, section, feature, supported) {
  tbody.appendChild(addValueRow(section, feature, supported ? 'successful' : 'failed'));
}

async function checkMisc() {
  const body = document.body;
  appendElem(body, 'h2', {textContent: 'misc'});
  const tbody = el('tbody');
  appendElem(body, 'table', {}, [tbody]);

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  tbody.appendChild(addValueRow('misc', 'getPreferredCanvasFormat', presentationFormat));

}
async function checkWorkers() {
  const body = document.body;
  appendElem(body, 'h2', {textContent: 'workers'});
  const tbody = el('tbody');
  appendElem(body, 'table', {}, [tbody]);

  const canvas = document.createElement('canvas');
  const offscreen = !!canvas.transferControlToOffscreen
  let offscreenCanvas = offscreen && canvas.transferControlToOffscreen();

  const worker = new WorkerHelper('worker.js');
  const {rAF, gpu, adapter, device, context} = await worker.getMessage('checkWebGPU', {canvas: offscreenCanvas}, [offscreenCanvas]);
  tbody.appendChild(addValueRow('worker', 'webgpu API', gpu ? 'exists' : 'n/a'));
  if (gpu) {
    addSupportsRow(tbody, 'worker', 'requestAdapter', adapter);
    if (adapter) {
      addSupportsRow(tbody, 'worker', 'requestDevice', device);
      if (context) {
        addSupportsRow(tbody, 'worker', 'getContext("webgpu")', context);
      }
    }
  }

  addSupportsRow(tbody, 'worker', 'requestAnimationFrame', rAF);
  addSupportsRow(tbody, 'worker', 'transferControlToOffscreen', offscreen);

  let moduleSupport = false;
  try {
    const workerModule = new WorkerHelper('worker-module.js');
    const data = await workerModule.getMessage('ping');
    moduleSupport = true;
  } catch (e) {
    //
  }
  addSupportsRow(tbody, 'worker', 'es6 modules', moduleSupport);
}

function adapterOptionsToDesc(requestAdapterOptions, adapter) {
  return adapter.isFallbackAdapter ? `fallback` : requestAdapterOptions.powerPreference;
}

async function main() {
  if (!navigator.gpu?.requestAdapter) { 
    log('  webgpu not available on this browser');
    return;
  }

  const requestAdapterOptionsSets = [
    { powerPreference: "high-performance" },
    { powerPreference: "low-power", },
    { powerPreference: "low-power", forceFallbackAdapter: true, },
  ];

  const adapterIds = new Map();
  for (const requestAdapterOptions of requestAdapterOptionsSets) {
    try {
      const adapter = await navigator.gpu.requestAdapter(requestAdapterOptions);
      // The id is the the actual adaptor limits as a string.
      // Effectively if the limits are the same then it's *probably* the 
      // same adaptor.
      const elem = await adapterToElements(adapter);
      const id = elem.innerHTML;
      if (!adapterIds.has(id)) {
        adapterIds.set(id, {desc: adapterOptionsToDesc(requestAdapterOptions, adapter), fallback: adapter.isFallbackAdapter, elem});
      }
    } catch (e) {
      log('  webgpu request failed:', e.message || e);
    }
  }

  const haveFallback = [...adapterIds].findIndex(([, desc]) => desc.fallback) >= 0;
  const numUniqueGPUs = adapterIds.size - (haveFallback ? 1 : 0)

  window.a = adapterIds;
  document.body.appendChild(el('div', {className: 'adapters'}, 
    [...adapterIds].map(([id, {desc, elem, fallback}], ndx) => el('div', {className: 'adapter'}, [
      el('h2', {textContent: `#${ndx + 1} ${(adapterIds.size > numUniqueGPUs || fallback) ? `${desc}` : ''}`}),
      elem,
    ]))));
  await checkMisc();
  await checkWorkers();
}

main();