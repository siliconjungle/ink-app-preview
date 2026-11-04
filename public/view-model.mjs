export const isFile = file => file && !file.archived && ['note', 'code', 'link', 'image', 'audio', 'video', 'file'].includes(file.kind) && !file.tags?.includes('app-source');

export function documentFormat(name = '', mime = '', text = '') {
  mime = mime.toLowerCase().split(';')[0].trim();
  if (/\.(mmd|mermaid)$/i.test(name) || ['text/vnd.mermaid', 'text/x-mermaid', 'application/vnd.mermaid'].includes(mime)) return 'mermaid';
  if (/\.(md|markdown)$/i.test(name) || mime === 'text/markdown' || /(?:^|\n) {0,3}(?:`{3,}|~{3,})mermaid\s*(?:\r?\n|$)/i.test(text)) return 'markdown';
  return 'text';
}

export function presentation(file, desktopOrigin, assetsToken = '') {
  if (!isFile(file)) return {kind: 'missing'};
  let meta = {};
  try {meta = JSON.parse(file.body) || {};} catch {}
  const mime = typeof meta.mime === 'string' ? meta.mime : 'application/octet-stream';
  const name = typeof meta.originalName === 'string' ? meta.originalName : file.title || 'Untitled';
  const format = documentFormat(name, mime, file.location ? '' : file.body || '');
  let source = '';
  if (file.location) {
    if (file.location.startsWith('/art/')) source = file.location;
    else {
      const url = new URL('/api/blob', desktopOrigin);
      url.searchParams.set('location', file.location);
      url.searchParams.set('mime', mime);
      if (assetsToken) url.searchParams.set('access', assetsToken);
      source = url.href;
    }
  } else if (file.kind === 'image' && /^[a-z0-9-]+$/.test(file.cover || '')) {
    source = '/art/' + file.cover + (['forest', 'mountain'].includes(file.cover) ? '.jpg' : '.svg');
  }
  const media = /^(image|audio|video)\//.exec(mime)?.[1];
  const textFile = ['note', 'code', 'link'].includes(file.kind) || format !== 'text' || /^text\//i.test(mime) || /\.(txt|log)$/i.test(name);
  return {kind: media || (textFile ? 'text' : file.kind), title: file.title || 'Untitled file', text: file.body || '', mime, source, name, format};
}
