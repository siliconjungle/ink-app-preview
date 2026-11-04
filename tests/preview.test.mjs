import test from'node:test';import assert from'node:assert/strict';import{presentation,isFile}from'../public/view-model.mjs';
test('text documents are rendered as literal text without treating markup as an app',()=>{const source='<script>bad()</script>';assert.equal(presentation({kind:'note',title:'Document',body:source},'https://desktop.example').text,source);assert.equal(isFile({kind:'app'}),false);assert.equal(presentation({kind:'note',archived:true},'https://desktop.example').kind,'missing');});
test('imported media uses the scoped read grant and preserves the original download name',()=>{const view=presentation({kind:'image',title:'Photo',location:'r2://test/photo',body:JSON.stringify({mime:'image/png',originalName:'photo.png'})},'https://desktop.example','read-grant'),url=new URL(view.source);assert.equal(url.origin,'https://desktop.example');assert.equal(url.pathname,'/api/blob');assert.equal(url.searchParams.get('access'),'read-grant');assert.equal(url.searchParams.get('location'),'r2://test/photo');assert.equal(view.name,'photo.png');});
test('unknown binary formats remain downloads and source releases are never listed as documents',()=>{assert.equal(presentation({kind:'file',body:'{}',location:'blob:stored'},'https://desktop.example').kind,'file');assert.equal(isFile({kind:'file',tags:['app-source']}),false);});

test('generic uploaded file records preview media according to their MIME type',()=>{for(const kind of ['image','audio','video'])assert.equal(presentation({kind:'file',body:JSON.stringify({mime:kind+'/test'}),location:'r2://stored'},'https://desktop.example').kind,kind);});

import {documentFormat} from '../public/view-model.mjs';
test('Mermaid and Markdown uploads are text previews even with generic binary MIME', () => {
  for (const name of ['diagram.mmd', 'diagram.MERMAID', 'notes.md', 'notes.markdown']) {
    const view = presentation({kind:'file',title:'Imported',location:'blob:stored',body:JSON.stringify({originalName:name})}, 'https://desktop.example');
    assert.equal(view.kind, 'text');
    assert.equal(view.name, name);
    assert.equal(view.format, /\.(mmd|mermaid)$/i.test(name) ? 'mermaid' : 'markdown');
  }
});
test('Mermaid fences in notes render as Markdown; ordinary source stays literal', () => {
  for (const fence of ['```mermaid', '~~~mermaid', '````Mermaid']) {
    assert.equal(documentFormat('', '', '# Diagram\n'+fence+'\nflowchart LR\nA-->B\n'+fence.replace(/mermaid/i,'')), 'markdown');
  }
  assert.equal(documentFormat('source.js', 'text/javascript', '<script>bad()</script>'), 'text');
  assert.equal(documentFormat('example.txt', 'text/plain', 'mermaid is useful'), 'text');
  assert.equal(documentFormat('', 'text/markdown; charset=utf-8'), 'markdown');
  assert.equal(documentFormat('', 'text/vnd.mermaid'), 'mermaid');
});
test('uploaded plain text is read as text while binary downloads stay unchanged', () => {
  assert.equal(presentation({kind:'file',title:'notes.txt',location:'blob:stored',body:'{}'}, 'https://desktop.example').kind, 'text');
  assert.equal(presentation({kind:'file',title:'archive.zip',location:'blob:stored',body:'{}'}, 'https://desktop.example').kind, 'file');
});
