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
const kLimitInfo = makeTable(
                                               [    'class','type'    ,            'maximumValue'],
                                               [  'maximum',          ,     kMaxUnsignedLongValue], {
  'maxTextureDimension1D':                     [           , 'size'   ,                          ],
  'maxTextureDimension2D':                     [           , 'size'   ,                          ],
  'maxTextureDimension3D':                     [           , 'size'   ,                          ],
  'maxTextureArrayLayers':                     [           , 'count'  ,                          ],

  'maxBindGroups':                             [           , 'count'  ,                          ],
  'maxBindGroupsPlusVertexBuffers':            [           , 'count'  ,                          ],
  'maxBindingsPerBindGroup':                   [           , 'count'  ,                          ],
  'maxDynamicUniformBuffersPerPipelineLayout': [           , 'count'  ,                          ],
  'maxDynamicStorageBuffersPerPipelineLayout': [           , 'count'  ,                          ],
  'maxSampledTexturesPerShaderStage':          [           , 'count'  ,                          ],
  'maxSamplersPerShaderStage':                 [           , 'count'  ,                          ],
  'maxStorageBuffersPerShaderStage':           [           , 'count'  ,                          ],
  'maxStorageTexturesPerShaderStage':          [           , 'count'  ,                          ],
  'maxUniformBuffersPerShaderStage':           [           , 'count'  ,                          ],

  'maxUniformBufferBindingSize':               [           , 'mem'    , kMaxUnsignedLongLongValue],
  'maxStorageBufferBindingSize':               [           , 'mem'    , kMaxUnsignedLongLongValue],
  'minUniformBufferOffsetAlignment':           ['alignment', 'mem'    ,                          ],
  'minStorageBufferOffsetAlignment':           ['alignment', 'mem'    ,                          ],

  'maxVertexBuffers':                          [           , 'count'  ,                          ],
  'maxBufferSize':                             [           , 'mem'    , kMaxUnsignedLongLongValue],
  'maxVertexAttributes':                       [           , 'count'  ,                          ],
  'maxVertexBufferArrayStride':                [           , 'mem'    ,                          ],
  'maxInterStageShaderComponents':             [           , 'count'  ,                          ],
  'maxInterStageShaderVariables':              [           , 'count'  ,                          ],

  'maxColorAttachments':                       [           , 'count'  ,                          ],
  'maxColorAttachmentBytesPerSample':          [           , 'mem'    ,                          ],

  'maxComputeWorkgroupStorageSize':            [           , 'mem'    ,                          ],
  'maxComputeInvocationsPerWorkgroup':         [           , 'count'  ,                          ],
  'maxComputeWorkgroupSizeX':                  [           , 'size'   ,                          ],
  'maxComputeWorkgroupSizeY':                  [           , 'size'   ,                          ],
  'maxComputeWorkgroupSizeZ':                  [           , 'size'   ,                          ],
  'maxComputeWorkgroupsPerDimension':          [           , 'size'   ,                          ],
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

const docElem = document.querySelector('#content');
function addElemToDocument(elem) {
  docElem.appendChild(elem);
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
  const hidden = createHidden('');
  const elem = createElem(tag, attribs, [
    createHidden('\n\n'),
    createElem('span', textContent),
    ...children,
    hidden,
  ]);

  hidden.textContent = `\n${''.padEnd(elem.textContent.length, padChar)}`;
  return elem;
}

const el = createElem;

/**
 * Given a blob and a filename, prompts user to
 * save as a file.
 */
const saveData = (function() {
  const a = document.body.appendChild(el('a'));
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

/**
 * Adds a row to table where first td is 'k'
 */
function addValueRow(className, k, _v) {
  const [v, attribs] = Array.isArray(_v) ? _v : [_v, {}];
  return el('tr', {className}, [
    el('td', {textContent: k}),
    ...(v instanceof HTMLElement
      ? [el('td', {}, _v)]
      : [el('td', {...attribs, textContent: v})]
    )
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
    if (obj[key] !== null) {
      entries.push([key, obj[key]]);
    }
  }
  return entries;
}

function expandMapLike(obj, sort = true) {
  const entries = mapLikeToKeyValueArray(obj);
  const result = entries
    .map(([k, v]) => addValueRow('feature', k, v));
  if (sort) {
    result.sort(byFirstColumn);
  }
  return result;
}

function setLikeToTableRows(values) {
  return values
    ? expandSetLike(values)
    : [el('tr', {}, [el('td', {colSpan: 2, className: 'nowrap', textContent: 'not yet implemented by this browser'})])];
}

function mapLikeToTableRows(values, sort = true) {
  return values
    ? expandMapLike(values, sort)
    : [el('tr', {}, [el('td', {colSpan: 2, textContent: 'not yet implemented by this browser'})])];
}

function makeBracketedLink(href, textContent, brackets = '()') {
  return [
    createElem('span', {className: 'bracketed-link hide-on-copy'}, [
      createElem('span', `${brackets[0]} `),
      createElem('a', { target: '_blank', href, textContent }),
      createElem('span', ` ${brackets[1]}`),
    ]),
  ];
}

function log(...args) {
  const elem = document.createElement('pre');
  elem.textContent = args.join(' ');
  addElemToDocument(elem);
}

function differenceWorse(name, defaultLimit, v) {
  if (name.startsWith('min')) {
    return v > defaultLimit;
  } else if (name.startsWith('max')) {
    return v < defaultLimit;
  } else {
    throw new Error(`unknown limit type: ${name}`)
  }
}

function markDifferencesInLimits(adapter, device) {
  const defaultLimits = device?.limits ?? {};
  return Object.fromEntries(
    mapLikeToKeyValueArray(adapter.limits)
      .map(([k, v]) => {
        const defaultLimit = defaultLimits[k];
        const info = kLimitInfo[k];
        const isDiff = defaultLimit !== undefined && defaultLimit !== v;
        const diffClass = defaultLimit !== undefined
           ?  (isDiff
                 ? differenceWorse(k, defaultLimit, v) ? 'different-worse' : 'different-better'
                : 'different-none')
           : 'unknown';
        const shortSize = shortSizeByType(v, info?.type ?? 'count');
        const defaultSize = shortSizeByType(defaultLimit, info?.type ?? 'count');
        const value = v > 1024 ? `${v} (${shortSize})` : shortSize;
        const defaultValue = defaultLimit > 1024 ? `${defaultLimit} (${defaultSize})` :  defaultSize;
        const defaultElem = el('span', {className: 'nowrap default-limit', textContent: defaultValue})
        const title = isDiff
          ? `default: ${defaultSize}\n${requestHint}`
          : 'same as default'
        const limitElem = el('span', {textContent: value, className: `${diffClass} nowrap adapter-limit`, title});
        return [
          k,
          [defaultElem, limitElem],
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

function parseAdapterFlags(adapter) {
  const flags = {
    'isFallbackAdapter': adapter.isFallbackAdapter,
  };
  if ('isCompatibilityMode' in adapter) {
    flags.isCompatibilityMode = adapter.isCompatibilityMode
  }
  return flags;
}

const requestLink = 'https://webgpufundamentals.org/webgpu/lessons/webgpu-limits-and-features.html';
const requestHint = 'limits greater than default must be specified when requesting adapter';

async function adapterToElements(adapter) {
  if (!adapter) {
    return;
  }
  const device = await adapter.requestDevice() || {}

  const limitsSectionElem = el('tr', {className: 'section'}, [
    el('td', {}, [
      createHeading('div', '-', {}, [
        createElem('span', {textContent: 'limits: ', title: requestHint}),
        ...makeBracketedLink(requestLink, 'must be requested'),
      ]),
    ]),
    el('td', {}, [
      el(
        'label',
        {
          className: 'nowrap hide-on-copy',
          textContent: 'show defaults',
          onInput: function() {
            this.closest('table').classList.toggle('show-default-limits', this.checked);
          },
        }, [
          el('input', {type: 'checkbox'}),
        ]),
    ]),
  ]);

  return el('table', {className: 'show-adapter-limits'}, [
    el('tbody', {}, [
      el('tr', {className: 'section'}, [
        el('td', {colSpan: 2}, [createHeading('div', '-', 'adapter info:')]),
      ]),
      ...mapLikeToTableRows(parseAdapterInfo(adapter.info)),
      el('tr', {className: 'section'}, [
        el('td', {colSpan: 2}, [createHeading('div', '-', 'flags:')]),
      ]),
      ...mapLikeToTableRows(parseAdapterFlags(adapter)),
      limitsSectionElem,
      ...mapLikeToTableRows({
        ...markDifferencesInLimits(adapter, device),
      }, true),
      el('tr', {className: 'section'}, [
        el('td', {colSpan: 2}, [
          createHeading('div', '-', {}, [
            createElem('span', {textContent: 'features: '}),
            ...makeBracketedLink(requestLink, 'must be requested'),
          ]),
        ]),
      ]),
      ...setLikeToTableRows(adapter.features),
    ]),
  ]);
}

class WorkerHelper {
  constructor(url, workerType) {
    this._id = 0;
    this._promisesByIdMap = new Map();
    this._messagesByIdMap = new Map();
    this._pinged = false;
    this._bad = false;
    this._readyPromise = this._createWorker(url, workerType);
  }
  async _createWorker(url, workerType) {
    const workerUrl = `${url}?${workerType}`;
    if (workerType === 'dedicated') {
      this._worker = new Worker(workerUrl, {type: 'module'});
      this._init(this._worker);
      return Promise.resolve();
    }
    if (workerType === 'shared') {
      const worker = new SharedWorker(workerUrl, {type: 'module'});
      this._worker = worker.port;
      this._init(this._worker);
      return Promise.resolve();
    }
    if (workerType === 'service') {
      const registration = await navigator.serviceWorker.register(workerUrl);
      await navigator.serviceWorker.ready;
      this._worker = registration.active;
      this._init(navigator.serviceWorker);
      return Promise.resolve();
    }
    return Promise.reject(`unknown worker type: ${workerType}`);
  }
  _init(worker) {
    worker.addEventListener('error', (e) => {
      this._bad = true;
      // reject all existing promises
      this._promisesByIdMap.forEach(({reject}) => {
        reject();
      });
    });
    worker.onmessage = (e) => {
      const {id, data} = e.data;
      if (data == "messageerror") {
        this._bad = true;
        // resolve all existing promises
        this._promisesByIdMap.forEach(({resolve}) => {
          resolve({});
        });
        return;
      }
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
  ready() {
    return this._readyPromise;
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

function checkWGSLLanguageFeatures(parent) {
  parent.appendChild(el('div', {className: 'other'}, [
    (createHeading('h2', '-', 'WGSL language features:')),
    el('table', { className: 'misc' }, [
      el('tbody', {}, [
        ...setLikeToTableRows(navigator.gpu.wgslLanguageFeatures || []),
      ]),
    ]),
  ]));
}

async function checkMisc(parent, {haveFallback}) {
  const obj = {};
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  obj.getPreferredCanvasFormat = presentationFormat;
  if (!haveFallback) {
    obj['fallback adapter'] = 'not supported';
  }

  let xrCompatibleAccessed = false;
  const xrAdapterOptions = {
    get xrCompatible() {
      xrCompatibleAccessed = true;
      return true;
    }
  };
  try {
    const adapter = await navigator.gpu.requestAdapter(xrAdapterOptions);
    obj['WebXR support'] = (adapter && xrCompatibleAccessed) ? 'supported' : 'not supported';
  }
  catch(error) {
    obj['WebXR support'] = 'unknown';
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgpu');
    context.configure({device, format: presentationFormat, toneMapping: {mode: 'extended'}});
    const config = context.getConfiguration();
    obj['HDR canvas support'] = config.toneMapping.mode === 'extended' ? 'supported' : 'not supported';
  }
  catch(error) {
    obj['HDR canvas support'] = 'not supported';
  }

  parent.appendChild(el('div', {className: 'other'}, [
    (createHeading('h2', '-', 'misc:')),
    el('table', { className: 'misc' }, [
        el('tbody', {}, mapLikeToTableRows(obj)),
    ]),
  ]));
}

async function getWorkerInfo(workerType) {
  const canvas = document.createElement('canvas');
  const offscreen = !!canvas.transferControlToOffscreen
  let offscreenCanvas = offscreen && canvas.transferControlToOffscreen();

  const obj = {};
  const addSupportsRow = (feature, supported, success = 'successful', fail = 'failed') => {
    obj[feature] = supported ? success : [fail, {className: 'not-supported'}];
  };

  let worker;
  try {
    worker = new WorkerHelper('worker.js', workerType);
    await worker.ready();
  } catch(error) {
    return el('table', { className: 'worker' }, [
      el('tbody', {}, setLikeToTableRows(undefined)),
    ]);
  }
  const {rAF, gpu, adapter, device, compat, context, offscreen: offscreenSupported, twoD } = await worker.getMessage('checkWebGPU', {canvas: offscreenCanvas}, [offscreenCanvas]);
  addSupportsRow('webgpu API', gpu, 'exists', 'n/a');
  if (gpu) {
    addSupportsRow(`requestAdapter${compat ? '(compat)' : ''}`, adapter);
    if (adapter) {
      addSupportsRow('requestDevice', device);
      if (context) {
        addSupportsRow('getContext("webgpu")', context);
      }
    }
  }

  if (workerType === "dedicated") {
    addSupportsRow('requestAnimationFrame', rAF);
  }
  addSupportsRow('transferControlToOffscreen', offscreen);
  addSupportsRow('OffscreenCanvas', offscreenSupported);
  addSupportsRow('CanvasRenderingContext2D', twoD);

  return el('table', { className: 'worker' }, [
    el('tbody', {}, mapLikeToTableRows(obj, false)),
  ]);
}

async function checkWorker(parent, workerType) {
  parent.appendChild(el('div', {className: 'other'}, [
    createHeading('h2', '=', `${workerType} workers:`),
    await getWorkerInfo(workerType),
  ]));
}

function adapterOptionsToDesc(requestAdapterOptions, adapter) {
  const parts = [
    ...(adapter?.isFallbackAdapter ? ['fallback'] : []),
    ...(adapter?.isCompatibilityMode ? ['compatibilityMode'] : []),
  ];
  return parts.length > 0
    ? parts.join(' ')
    : requestAdapterOptions.powerPreference;
}

function getSelectionText(all) {
    const dynamicStyle = document.querySelector('#dynamic-style');
    dynamicStyle.textContent = `
      body { white-space: pre !important; }
      .nowrap { white-space: pre !important; }
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
                     .replace(/([^ ][^ ])\n/g, '$1  \n')
                     .trim();

    if (all) {
      document.getSelection()?.removeAllRanges();
    }

    dynamicStyle.textContent = '';
    return text;
}

function formatSectionForCopyPasteSave({head, rows}) {
  // Get the width of each column
  const longest = [];
  for (const row of rows) {
    for (let c = 0; c < row.cells.length; ++c) {
      longest[c] = Math.max(longest[c] ?? 0, row.cells[c].textContent.length);
    }
  }

  // check the first row to see if this is a 2 column section. If so,
  // add space for a ':'
  if (rows.length) {
    const lastNonEmptyColumn = [...rows[0].cells].findLastIndex(e => e.textContent.trim().length > 0);
    if (lastNonEmptyColumn >= 1) {
      ++longest[0];
    }
  }

  // padEnd all except the last column unless there is nothing in trailing columns
  for (const row of rows) {
    const lastNonEmptyColumn = [...row.cells].findLastIndex(e => e.textContent.trim().length > 0);

    if (lastNonEmptyColumn >= 1) {
      row.cells[0].append(createHidden(':'));
    }

    for (let c = 0; c < lastNonEmptyColumn; ++c) {
      const cell = row.cells[c];
      cell.appendChild(createHidden(''.padEnd(longest[c] - cell.textContent.length)));
    }

    if (lastNonEmptyColumn >= 0) {
      row.cells[0].prepend(createHidden('* '));
    }
  }
}

function formatTableForCopyPasteSave(table) {
  const sections = [];
  let section = {
    rows: [],
  };

  const addSection = () => {
    if (section) {
      sections.push(section);
    }
  };
 
  for (const row of table.rows) {
    if (row.classList.contains('section')) {
      addSection();
      section = {
        head: row,
        rows: [],
      };
    } else {
      section.rows.push(row);
    }
  }
  addSection();

  sections.forEach(formatSectionForCopyPasteSave);
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
    { compatibilityMode: true, featureLevel: "compatibility" },
    { xrCompatible: true },
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

  const actualAdaptersIds = [...adapterIds].filter(([, {elem}]) => !!elem);
  if (actualAdaptersIds.length === 0) {
    addElemToDocument(
      el(
        'div', 
        {
          className: 'not-supported',
          textContent: adapterIds.size > 0
            ? `webgpu appears to be disabled`
            : `webgpu appears to not be supported`,
          },
      ));
  }
  window.a = adapterIds;
  const sectionsElem = el('div', {className: 'sections'},
    [...actualAdaptersIds].map(([id, {desc, elem}], ndx) => el('div', {className: 'adapter'}, [
      createHeading('h2', '=', `${adapterIds.size > 1 ? `#${ndx + 1} ` : ''}${(adapterIds.size > 1) ? `${desc}` : ''}`),
      elem,
    ])));
  addElemToDocument(sectionsElem);

  const others = el('div', {className: 'others'});
  //const outer = el('div', {className: 'outer'}, [others]);
  sectionsElem.appendChild(others);
  checkWGSLLanguageFeatures(others);
  await checkMisc(others, {haveFallback});
  await checkWorker(others, 'dedicated');
  await checkWorker(others, 'shared');
  await checkWorker(others, 'service');

  // Add a copy handler to massage the text for plain text.
  document.addEventListener('copy', (event) => {
    const text = getSelectionText(false);
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  });

  document.querySelector('#download').addEventListener('click', () => {
    const showDefaults = [...document.querySelectorAll('table.show-default-limits')];
    showDefaults.forEach(e => e.classList.remove('show-default-limits'));

    const text = getSelectionText(true);
    const blob = new Blob([text], {type: 'text/text'});
    const filename = `webgpureport-${new Date().toISOString().replace(/[^a-z0-9-]/ig, '-')}.txt`;
    saveData(blob, filename);

    showDefaults.forEach(e => e.classList.add('show-default-limits'));
  });

  document.querySelectorAll('table').forEach(formatTableForCopyPasteSave);
}

main();
