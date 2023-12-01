
function makeTable(members, defaults, table) {
  const result = {};
  for (const [k, v] of Object.entries(table)) {
    const item = {};
    for (let i = 0; i < members.length; ++i) {
      item[members[i]] = v[i] ?? defaults[i];
    }
    result[k] = item;
  }
  return result;
}

export const kMaxUnsignedLongValue = 4294967295;
export const kMaxUnsignedLongLongValue = Number.MAX_SAFE_INTEGER;

/** Info for each entry of GPUSupportedLimits */
const kLimitInfo = /* prettier-ignore */ makeTable(
                                               [    'class','type'    , 'default', 'compat' ,            'maximumValue'],
                                               [  'maximum',          ,          ,          ,     kMaxUnsignedLongValue], {
  'maxTextureDimension1D':                     [           , 'size'   ,      8192,      4096,                          ],
  'maxTextureDimension2D':                     [           , 'size'   ,      8192,      4096,                          ],
  'maxTextureDimension3D':                     [           , 'size'   ,      2048,      1024,                          ],
  'maxTextureArrayLayers':                     [           , 'size'   ,       256,       256,                          ],

  'maxBindGroups':                             [           , 'count'  ,         4,         4,                          ],
  'maxBindGroupsPlusVertexBuffers':            [           , 'count'  ,        24,        24,                          ],
  'maxBindingsPerBindGroup':                   [           , 'count'  ,      1000,      1000,                          ],
  'maxDynamicUniformBuffersPerPipelineLayout': [           , 'count'  ,         8,         8,                          ],
  'maxDynamicStorageBuffersPerPipelineLayout': [           , 'count'  ,         4,         4,                          ],
  'maxSampledTexturesPerShaderStage':          [           , 'count'  ,        16,        16,                          ],
  'maxSamplersPerShaderStage':                 [           , 'count'  ,        16,        16,                          ],
  'maxStorageBuffersPerShaderStage':           [           , 'count'  ,         8,         4,                          ],
  'maxStorageTexturesPerShaderStage':          [           , 'count'  ,         4,         4,                          ],
  'maxUniformBuffersPerShaderStage':           [           , 'count'  ,        12,        12,                          ],

  'maxUniformBufferBindingSize':               [           , 'mem'    ,     65536,     16384, kMaxUnsignedLongLongValue],
  'maxStorageBufferBindingSize':               [           , 'mem'    , 134217728, 134217728, kMaxUnsignedLongLongValue],
  'minUniformBufferOffsetAlignment':           ['alignment', 'mem'    ,       256,       256,                          ],
  'minStorageBufferOffsetAlignment':           ['alignment', 'mem'    ,       256,       256,                          ],

  'maxVertexBuffers':                          [           , 'count'  ,         8,         8,                          ],
  'maxBufferSize':                             [           , 'mem'    , 268435456, 268435456, kMaxUnsignedLongLongValue],
  'maxVertexAttributes':                       [           , 'count'  ,        16,        16,                          ],
  'maxVertexBufferArrayStride':                [           , 'mem'    ,      2048,      2048,                          ],
  'maxInterStageShaderComponents':             [           , 'count'  ,        60,        60,                          ],
  'maxInterStageShaderVariables':              [           , 'count'  ,        16,        16,                          ],

  'maxColorAttachments':                       [           , 'count'  ,         8,         4,                          ],
  'maxColorAttachmentBytesPerSample':          [           , 'mem'    ,        32,        32,                          ],

  'maxComputeWorkgroupStorageSize':            [           , 'mem'    ,     16384,     16384,                          ],
  'maxComputeInvocationsPerWorkgroup':         [           , 'count'  ,       256,       128,                          ],
  'maxComputeWorkgroupSizeX':                  [           , 'size'   ,       256,       128,                          ],
  'maxComputeWorkgroupSizeY':                  [           , 'size'   ,       256,       128,                          ],
  'maxComputeWorkgroupSizeZ':                  [           , 'size'   ,        64,        64,                          ],
  'maxComputeWorkgroupsPerDimension':          [           , 'mem'    ,     65535,     65535,                          ],
});

function createElem(tag, attrs = {}, children = []) { 
  const elem = document.createElement(tag);
  if (typeof attrs === 'string') {
    elem.textContent = attrs;
  } else {
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
  }
  for (const child of children) {
    elem.appendChild(child);
  }
  return elem;
}

/**
 * Creates a hidden span that will only be used when the when
 * the user copies or downloads text.
 */
function createHidden(textContent) {
  return createElem('span', {className: 'copy', textContent});
}

/**
 * Given a string or Attributes returns the `textContent`
 * and the attributes with `textContent` removed
 */
function separateTextContentFromAttributes(attrs = {}) {
  return typeof attrs === 'string' ? {textContent: attrs, attribs: {}} : {
    textContent: attrs['textContent'] || '',
    attribs: {...attrs, textContent: ''},
  };
}

/**
 * Creates a heading tag with hidden text for copying
 * so the copy will be like markdown.
 */
function createHeading(tag, padChar, attrs = {}, children = []) {
  const {textContent, attribs} = separateTextContentFromAttributes(attrs);
  return createElem(tag, attribs, [
    createHidden('\n\n'),
    createElem('span', textContent),
    createHidden(`\n${''.padEnd(textContent.length, padChar)}`),
    ...children,
  ]);
}

function appendElem(parent, ...args) {
  const elem = createElem(...args);
  parent.appendChild(elem);
  return elem;
}

const el = createElem;

/**
 * Given a blob and a filename, prompts user to
 * save as a file.
 */
const saveData = (function() {
  const a = appendElem(document.body, 'a');
  a.style.display = 'none';
  return function saveData(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
  };
}());

const shortSize = (function() {
  return function(size, suffixes = ['', 'k', 'm', 'g', 't', 'p']) {
    const suffixNdx = Math.log2(Math.abs(size)) / 10 | 0;
    const suffix = suffixes[Math.min(suffixNdx, suffixes.length - 1)];
    const base = 2 ** (suffixNdx * 10);
    return `${(size / base).toFixed(0)}${suffix}`;
  };
})();

const shortSizeMem = (function() {
  const suffixes = ['b', 'k', 'mb', 'gb', 'tb', 'pb'];
  return function(size) {
    return shortSize(size, suffixes);
  };
})();

const shortSizeByType = (function() {
  const suffixesByType = {
    'mem': ['b', 'k', 'mb', 'gb', 'tb', 'pb'],
    'size': ['', 'k', 'm', 'g', 't', 'p'],
    'count': ['', 'k', 'm', 'g', 't', 'p'],
  };
  return function(size, type) {
    return shortSize(size, suffixesByType[type] || suffixesByType.count);
  };
})();

function addValueRow(className, k, _v) {
  const [v, attribs] = Array.isArray(_v) ? _v : [_v, {}];
  return el('tr', {className}, [
    el('td', {textContent: k}),
    el('td', {...attribs, textContent: v}),
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

function mapLikeToKeyValueArray(obj) {
  const entries = [];
  for (const key in obj) {
    entries.push([key, obj[key]]);
  }
  return entries;
}

function expandMapLike(obj, sort = true) {
  const entries = mapLikeToKeyValueArray(obj);
  const longestDesc = entries.reduce((longest, [description]) => Math.max(longest, description.length), 0);  
  const result = entries
    .map(([k, v]) => addValueRow('feature', k.padEnd(longestDesc + 1), v));
  if (sort) {
    result.sort(byFirstColumn);
  }
  return result;
}

function setLikeToTableRows(values) {
  return values
    ? expandSetLike(values)
    : [el('tr', {}, [el('td', {colSpan: 2, textContent: 'not yet implemented by this browser'})])];
}

function mapLikeToTableRows(values, sort = true) {
  return values
    ? expandMapLike(values, sort)
    : [el('tr', {}, [el('td', {colSpan: 2, textContent: 'not yet implemented by this browser'})])];
}

function log(...args) {
  const elem = document.createElement('pre');
  elem.textContent = args.join(' ');
  document.body.appendChild(elem);
}

function differenceWorse(info, v) {
  switch (info.class) {
    case 'alignment':
      return v > info.default;
    case 'maximum':
      return v < info.default;
    default:
      throw new Error(`unknown className: ${info.class}`)
  }
}

function markDifferencesInLimits(adapter) {
  return Object.fromEntries(
    mapLikeToKeyValueArray(adapter.limits)
      .map(([k, v]) => {
        const info = kLimitInfo[k];
        const isDiff = info && info.default !== v;
        const diffClass = isDiff
           ? differenceWorse(info, v) ? 'different-worse' : 'different-better'
           : '';
        const value = v > 1024 && info ? `${v} (${shortSizeByType(v, info.type)})` : v;
        return [
          k,
          isDiff
            ? [value, {className: `${diffClass} nowrap`, title: `default${adapter.isCompatibilityMode ? ' in compat' : ''}: ${shortSizeByType(adapter.isCompatibilityMode ? info.compat : info.default, info.type)}`}]
            : [value, {className: 'nowrap', title: 'same as default'}]
        ];
      })
  );
}

function parseAdapterInfo(adapterInfo) {
  return Object.fromEntries(
    mapLikeToKeyValueArray(adapterInfo).map(([k, v]) => {
      if (k !== "memoryHeaps") {
        return [k, v];
      }
      const value = adapterInfo.memoryHeaps.map(({ size, properties }) => {
        const heapProperties = [];
        for (const [k, v] of Object.entries(GPUHeapProperty)) {
          if ((parseInt(properties, 10) & v) !== 0) {
            heapProperties.push(k);
          }
        }
        return `[ size: ${size}, properties: ${heapProperties.join(" | ")} ]`;
      });
      return [k, [value.join(", ")]];
    }),
  );
}

async function adapterToElements(adapter) {
  if (!adapter) {
    return;
  }
  // UGH!
  const adapterInfo = await (adapter.requestAdapterInfo ? adapter.requestAdapterInfo() : undefined);

  const limitsSectionElem = el('tr', {className: 'section'}, [
    el('td', {colSpan: 2}, [createHeading('div', '-', 'limits:')]),
  ]);

  return el('table', {}, [
    el('tbody', {}, [
      el('tr', {className: 'section'}, [
        el('td', {colSpan: 2}, [createHeading('div', '-', 'adapter info:')]),
      ]),
      ...mapLikeToTableRows(parseAdapterInfo(adapterInfo)),
      el('tr', {className: 'section'}, [
        el('td', {colSpan: 2}, [createHeading('div', '-', 'flags:')]),
      ]),
      ...mapLikeToTableRows({
        'isFallbackAdapter': adapter.isFallbackAdapter,
        'isCompatibilityMode': adapter.isCompatibilityMode,
      }),
      limitsSectionElem,
      ...mapLikeToTableRows(markDifferencesInLimits(adapter)),
      el('tr', {className: 'section'}, [
        el('td', {colSpan: 2}, [createHeading('div', '-', 'features:')]),
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

async function checkMisc({haveFallback}) {
  const body = document.body;
  body.appendChild(createHeading('h2', '=', 'misc'));

  const obj = {};
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  obj.getPreferredCanvasFormat = presentationFormat;
  if (!haveFallback) {
    obj['fallback adapter'] = 'not supported';
  }

  appendElem(body, 'table', { className: 'misc' }, [
    el('tbody', {}, mapLikeToTableRows(obj)),
  ]);
}

async function checkWorkers() {
  const body = document.body;
  body.appendChild(createHeading('h2', '=', 'workers'));

  const canvas = document.createElement('canvas');
  const offscreen = !!canvas.transferControlToOffscreen
  let offscreenCanvas = offscreen && canvas.transferControlToOffscreen();

  const obj = {};
  const addSupportsRow = (feature, supported, success = 'successful', fail = 'failed') => {
    obj[feature] = supported ? success : fail;
  };

  const worker = new WorkerHelper('worker.js');
  const {rAF, gpu, adapter, device, context, offscreen: offscreenSupported, twoD } = await worker.getMessage('checkWebGPU', {canvas: offscreenCanvas}, [offscreenCanvas]);
  addSupportsRow('webgpu API', gpu, 'exists', 'n/a');
  if (gpu) {
    addSupportsRow('requestAdapter', adapter);
    if (adapter) {
      addSupportsRow('requestDevice', device);
      if (context) {
        addSupportsRow('getContext("webgpu")', context);
      }
    }
  }

  addSupportsRow('requestAnimationFrame', rAF);
  addSupportsRow('transferControlToOffscreen', offscreen);
  addSupportsRow('OffscreenCanvas', offscreenSupported);
  addSupportsRow('CanvasRenderingContext2D', twoD);

  let moduleSupport = false;
  try {
    const workerModule = new WorkerHelper('worker-module.js');
    const data = await workerModule.getMessage('ping');
    moduleSupport = true;
  } catch (e) {
    //
  }
  addSupportsRow('es6 modules', moduleSupport);

  appendElem(body, 'table', { className: 'worker' }, [
    el('tbody', {}, mapLikeToTableRows(obj, false)),
  ]);
}

function adapterOptionsToDesc(requestAdapterOptions, adapter) {
  const parts = [
    ...(adapter.isFallbackAdapter ? ['fallback'] : []),
    ...(adapter.isCompatibilityMode ? ['compatibilityMode'] : []),
  ];
  return parts.length > 0
    ? parts.join(' ')
    : requestAdapterOptions.powerPreference;
}

function getSelectionText(all) {
    const dynamicStyle = document.querySelector('#dynamic-style');
    dynamicStyle.textContent = `
      body { white-space: pre !important; }
      .copy { display: initial; }
      .hide-on-copy { display: none !important; }
    `;
    const selection = document.getSelection();

    if (all) {
      selection.removeAllRanges();
      selection.selectAllChildren(document.body);
    } else {
      const position =
          selection.anchorNode?.compareDocumentPosition(selection.focusNode);
      const [startNode, startOffset, endNode, endOffset] =
          ((position || 0) & Node.DOCUMENT_POSITION_FOLLOWING) ?
          [
            selection.anchorNode,
            selection.anchorOffset,
            selection.focusNode,
            selection.focusOffset,
          ] :
          [
            selection.focusNode,
            selection.focusOffset,
            selection.anchorNode,
            selection.anchorOffset,
          ];
      if (startOffset === 0) {
        // Given the selection between > and <
        //
        //   * >abc
        //   * def<
        //
        // We need to move the start of the selection back to the parent
        // otherwise the selection above will copied as
        //
        //   abc
        //   * def
        //
        // since the * (the list item's bullet) is not selectable directly.
        const li = startNode.parentElement?.closest('li');
        selection.setBaseAndExtent(
            li || startNode.parentNode, 0, endNode, endOffset);
      }
    }

    // Get text and remove superfluous lines and whitespace.
    const text = selection.toString()
                     .replace(/\s*\n\s*\n\s*\n+/g, '\n\n')
                     .replace(/\t/g, ' ')
                     .trim();

    if (all) {
      document.getSelection()?.removeAllRanges();
    }

    dynamicStyle.textContent = '';
    return text;
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
    { compatibilityMode: true },
  ];

  const adapterIds = new Map();
  for (const requestAdapterOptions of requestAdapterOptionsSets) {
    try {
      const adapter = await navigator.gpu.requestAdapter(requestAdapterOptions);
      // The id is the the actual adaptor limits as a string.
      // Effectively if the limits are the same then it's *probably* the 
      // same adaptor.
      const elem = await adapterToElements(adapter);
      const id = elem?.innerHTML;
      if (!adapterIds.has(id)) {
        adapterIds.set(id, {
          desc: adapterOptionsToDesc(requestAdapterOptions, adapter),
          fallback: adapter?.isFallbackAdapter,
          elem,
        });
      }
    } catch (e) {
      if (!requestAdapterOptions.forceFallbackAdapter) {
        log(`  webgpu request with adapterOptions: ${JSON.stringify(requestAdapterOptions)} failed:`, e.message || e);
      }
    }
  }

  const haveFallback = [...adapterIds].findIndex(([, desc]) => desc.fallback) >= 0;
  const numUniqueGPUs = adapterIds.size - (haveFallback ? 1 : 0)

  const actualAdaptersIds = [...adapterIds].filter(([, {elem}]) => !!elem);
  if (actualAdaptersIds.length === 0) {
    if (adapterIds.size > 0) {
      document.body.appendChild(el('div', {textContent: `webgpu appears to be disabled`}));
    } else {
      document.body.appendChild(el('div', {textContent: `webgpu appears to not be supported`}));
    }
  }
  window.a = adapterIds;
  document.body.appendChild(el('div', {className: 'adapters'},
    [...actualAdaptersIds].map(([id, {desc, elem}], ndx) => el('div', {className: 'adapter'}, [
      createHeading('h2', '=', `${adapterIds.size > 1 ? `#${ndx + 1} ` : ''}${(adapterIds.size > 1) ? `${desc}` : ''}`),
      elem,
    ]))));
  await checkMisc({haveFallback});
  await checkWorkers();

  // Add a copy handler to massage the text for plain text.
  document.addEventListener('copy', (event) => {
    const text = getSelectionText(false);
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  });

  document.querySelector('#download').addEventListener('click', () => {
    const text = getSelectionText(true);
    const blob = new Blob([text], {type: 'text/text'});
    const filename = `webgpureport-${new Date().toISOString().replace(/[^a-z0-9-]/ig, '-')}.txt`;
    saveData(blob, filename);
  });  
}

main();
