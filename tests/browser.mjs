import {renderDocument, readDocument} from '/document-preview.mjs';
import {renderQuickLook} from '/quick-look-render.mjs';
const results = document.querySelector('#results'), fixtures = document.querySelector('#fixtures');
let passed = 0, failed = 0;
const assert = (value, message) => {if (!value) throw Error(message);};
const root = () => fixtures.appendChild(document.createElement('section'));
async function test(name, run) {
  try {await run(); passed++; results.textContent += '\nPASS ' + name;}
  catch (error) {failed++; results.textContent += '\nFAIL ' + name + ': ' + error.message; console.error(error);}
}
results.textContent = '';
await test('standalone Mermaid renders SVG with accessible labels', async () => {
  const target = root();
  await renderDocument(target, 'flowchart LR\n  A[Write Mermaid] --> B[Preview in Ink OS]\n  B --> C[Works offline]', 'mermaid');
  assert(target.querySelector('svg[role="img"]'), 'No SVG');
  assert(target.querySelector('svg').textContent.includes('Preview in Ink'), 'Missing diagram label');
  assert(target.querySelector('details pre').textContent.includes('flowchart'), 'Source unavailable');
});
await test('Markdown renders multiple Mermaid diagrams alongside prose and code', async () => {
  const target = root();
  await renderDocument(target, '# Mermaid in Markdown\n\nA flowchart and sequence diagram.\n\n```mermaid\nflowchart TD\nA-->B\n```\n\n~~~mermaid\nsequenceDiagram\nAlice->>Bob: Hello\n~~~\n\n```js\nconst x = 1;\n```', 'markdown');
  assert(target.querySelectorAll('svg').length === 2, 'Expected two diagrams');
  assert(target.querySelector('h1').textContent === 'Mermaid in Markdown', 'Heading missing');
  assert(target.querySelector('code.language-js').textContent.includes('const x'), 'Other code changed');
});
await test('an invalid diagram shows a local error and preserves its source', async () => {
  const target = root();
  await renderDocument(target, 'flowchart LR\nA[', 'mermaid');
  assert(target.querySelector('[role=alert]'), 'No error message');
  assert(target.querySelector('details[open] pre').textContent === 'flowchart LR\nA[', 'Source lost');
  assert(!document.querySelector('body > svg'), 'Error SVG leaked outside document');
});
await test('raw markup stays literal in plain text and unsafe Markdown is removed', async () => {
  const target = root(), attack = '<script>window.previewAttack=true</script><img src=x onerror="window.previewAttack=true"><a href="javascript:alert(1)">bad</a>';
  await renderDocument(target, attack, 'text');
  assert(target.querySelector('pre').textContent === attack, 'Plain text changed');
  await renderDocument(target, attack, 'markdown');
  assert(!target.querySelector('script,img,[onerror],[href^="javascript:"]'), 'Unsafe markup remains');
  assert(!window.previewAttack, 'Markup executed');
  await renderDocument(target, 'flowchart LR\nA[Safe] --> B[Diagram]\nclick A "javascript:alert(1)"', 'mermaid');
  assert(target.querySelector('svg') && !target.querySelector('svg a'), 'Diagram links enabled');
});
await test('cancelled and detached previews do not render stale diagrams', async () => {
  const target = root(), controller = new AbortController();
  controller.abort(); target.textContent = 'Current file';
  await renderDocument(target, 'graph TD\nA-->B', 'mermaid', {signal:controller.signal});
  assert(target.textContent === 'Current file', 'Cancelled work changed the preview');
  const detached = document.createElement('div');
  await renderDocument(detached, 'graph TD\nOld-->File', 'mermaid');
  assert(!detached.querySelector('svg'), 'Detached diagram rendered');
});
await test('uploaded text is fetched, and reads over 2 MiB fail clearly', async () => {
  const text = await readDocument({source:'data:text/plain,flowchart%20LR%0AA--%3EB'});
  assert(text === 'flowchart LR\nA-->B', 'Wrong uploaded content');
  let error;
  try {await readDocument({source:URL.createObjectURL(new Blob(['x'.repeat(2*1024*1024+1)]))});} catch (value) {error=value;}
  assert(error?.message.includes('too large'), 'Oversized content was accepted');
});
await test('quick preview renders Mermaid and disposes immediately on selection change', async () => {
  const target = root(), file = {id:'example',kind:'file',title:'diagram.mmd',body:'{}',location:'blob:stored'};
  const dispose = renderQuickLook({root:target,file,ink:{files:{url:()=> 'data:text/plain,flowchart%20LR%0AQuick--%3ELook'}}});
  assert(typeof dispose === 'function', 'Disposal must be synchronous');
  for (let i = 0; i < 100 && !target.querySelector('svg'); i++) await new Promise(resolve => setTimeout(resolve, 20));
  assert(target.querySelector('svg'), 'Quick preview did not render');
  dispose();
  assert(!target.childElementCount, 'Preview was not disposed');
});
await test('quick preview preserves PDF and image readers', async () => {
  for (const [title, tag] of [['document.pdf','iframe'], ['photo.png','img']]) {
    const target=root(), dispose=renderQuickLook({root:target,file:{kind:'file',title,body:'{}',location:'blob:stored'},ink:{files:{url:()=> 'about:blank'}}});
    assert(target.querySelector(tag), title + ' reader missing'); dispose();
  }
});
results.textContent = `${passed} passed, ${failed} failed\n` + results.textContent;
document.title = `${failed ? 'FAIL' : 'PASS'} — Preview browser checks`;
