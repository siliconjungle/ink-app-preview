import {previewKind} from './quick-look.mjs';
import {presentation, documentFormat} from './view-model.mjs';
import {readDocument, renderDocument} from './document-preview.mjs';

export function renderQuickLook({ink, file, root}) {
  const view = presentation(file, new URLSearchParams(location.search).get('desktopOrigin') || location.origin);
  const kind = view.kind === 'text' ? 'text' : previewKind(file);
  const container = document.createElement('div');
  root.append(container);
  const controller = new AbortController();
  const dispose = () => {controller.abort(); container.remove();};
  if (kind === 'text') {
    container.textContent = 'Loading preview…';
    // A dedicated container prevents an older asynchronous read from changing a newer selection.
    void (async () => {try {
      const text = await readDocument({...view, source: file.location ? ink.files.url(file.id) : ''}, {signal: controller.signal});
      if (container.isConnected) await renderDocument(container, text, documentFormat(view.name, view.mime, text), {signal: controller.signal});
    } catch (error) {
      if (container.isConnected) {container.textContent = error.message; container.setAttribute('role', 'alert');}
    }})();
  } else if (['image', 'audio', 'video', 'pdf'].includes(kind)) {
    const media = document.createElement(kind === 'image' ? 'img' : kind === 'pdf' ? 'iframe' : kind);
    media.src = ink.files.url(file.id);
    media.title = file.title;
    if (kind === 'image') media.alt = file.title;
    if (kind === 'audio' || kind === 'video') media.controls = true;
    container.append(media);
    return () => {media.pause?.(); media.removeAttribute('src'); dispose();};
  } else {
    const heading = document.createElement('h2'), details = document.createElement('p');
    heading.textContent = file.title || 'Untitled';
    let meta = {};
    try {meta = JSON.parse(file.body) || {};} catch {}
    details.textContent = [meta.mime || file.kind, Number.isFinite(meta.bytes) ? meta.bytes.toLocaleString() + ' bytes' : '', file.summary].filter(Boolean).join(' · ');
    container.append(heading, details);
    if (file.kind === 'link' && /^https?:\/\//.test(file.source)) {
      const link = document.createElement('a');
      link.href = file.source; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = file.source;
      container.append(link);
    }
  }
  return dispose;
}
