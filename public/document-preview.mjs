import {marked, DOMPurify} from './vendor/markdown.mjs';

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
let mermaidPromise, serial = 0, renderQueue = Promise.resolve();

export async function readDocument(view, {signal, readText} = {}) {
  signal?.throwIfAborted();
  // The host reads stored content on our behalf; app frames cannot fetch across its origin.
  const text = view.source ? (await readText()).text : view.text;
  signal?.throwIfAborted();
  if (typeof text !== 'string') throw Error('Unable to read this file as text.');
  if (new TextEncoder().encode(text).byteLength > MAX_DOCUMENT_BYTES) throw Error('This file is too large to preview (maximum 2 MiB).');
  return text;
}

function node(tag, text, className) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}

function mermaid() {
  return mermaidPromise ||= import('./vendor/mermaid.mjs').then(({default: renderer}) => {
    renderer.initialize({
      startOnLoad: false, securityLevel: 'strict', theme: 'dark', htmlLabels: false,
      fontFamily: 'system-ui, sans-serif', suppressErrorRendering: true,
      maxTextSize: 50000, maxEdges: 500, flowchart: {htmlLabels: false},
      secure: ['securityLevel', 'startOnLoad', 'maxTextSize', 'maxEdges', 'suppressErrorRendering', 'htmlLabels', 'flowchart'],
    });
    return renderer;
  });
}

async function diagram(target, source, signal) {
  const current = () => !signal?.aborted && target.isConnected;
  const status = node('p', 'Rendering diagram…', 'diagram-status');
  const details = node('details', undefined, 'diagram-source');
  details.append(node('summary', 'Mermaid source'), node('pre', source));
  target.replaceChildren(status, details);
  try {
    const renderer = await mermaid();
    // Mermaid shares mutable parser/configuration state. Serialize render calls.
    const task = renderQueue.then(async () => {
      if (!current()) return;
      const staging = node('div');
      staging.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden';
      document.body.append(staging);
      try {return await renderer.render('ink-mermaid-' + (++serial), source, staging);}
      finally {staging.remove();}
    });
    renderQueue = task.catch(() => {});
    const result = await task;
    if (!result || !current()) return;
    const output = node('div', undefined, 'diagram-output');
    output.innerHTML = DOMPurify.sanitize(result.svg, {
      USE_PROFILES: {svg: true, svgFilters: true},
      FORBID_TAGS: ['foreignObject', 'image', 'a'],
    });
    const svg = output.querySelector('svg');
    if (!svg) throw Error('No diagram was produced.');
    svg.setAttribute('role', 'img');
    if (!svg.hasAttribute('aria-label') && !svg.hasAttribute('aria-labelledby')) svg.setAttribute('aria-label', 'Mermaid diagram');
    status.replaceWith(output);
  } catch (error) {
    if (!current()) return;
    status.textContent = 'Unable to render this Mermaid diagram. Check its source below.';
    status.setAttribute('role', 'alert');
    details.open = true;
    details.append(node('p', error.message || String(error), 'diagram-error'));
  }
}

export async function renderDocument(root, text, format = 'text', {signal} = {}) {
  if (signal?.aborted) return;
  root.classList.add('document-preview');
  if (format === 'text') {root.replaceChildren(node('pre', text)); return;}
  if (format === 'mermaid') {
    const figure = node('figure', undefined, 'mermaid-diagram');
    root.replaceChildren(figure);
    await diagram(figure, text, signal);
    return;
  }
  const article = node('article', undefined, 'markdown-document');
  // Limit Markdown to document elements; raw HTML must not start apps or load resources.
  article.innerHTML = DOMPurify.sanitize(marked.parse(text, {async: false, gfm: true}), {
    USE_PROFILES: {html: true},
    FORBID_TAGS: ['style', 'img', 'video', 'audio', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['style'],
  });
  for (const link of article.querySelectorAll('a')) {link.target = '_blank'; link.rel = 'noopener noreferrer';}
  root.replaceChildren(article);
  const tasks = [];
  for (const code of article.querySelectorAll('pre > code')) {
    if (![...code.classList].some(name => name.toLowerCase() === 'language-mermaid')) continue;
    const figure = node('figure', undefined, 'mermaid-diagram');
    const source = code.textContent;
    code.parentElement.replaceWith(figure);
    tasks.push(diagram(figure, source, signal));
  }
  await Promise.all(tasks);
}
