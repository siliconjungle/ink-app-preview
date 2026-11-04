# Preview

Read text, Markdown, Mermaid diagrams, images, audio and video, and download other files in an isolated Ink app.

## Install

Requires a running [Ink OS](https://github.com/siliconjungle/ink-os-platform) instance and its `ink-os` CLI. Use Node.js 24 or later for development.

```sh
git clone https://github.com/siliconjungle/ink-app-preview.git
cd ink-app-preview
npm test
# Select your Ink instance using its CLI connection profile.
ink-os deploy .
```

The CLI deploys committed source from your checkout. Commit any edits before deploying them. No credentials or personal instance configuration belong in this repository.

## Behaviour and limits

Read-only: files remain in their owning namespaces. More specific installed file handlers take precedence over Preview.

## Mermaid and Markdown

Open a `.mmd` or `.mermaid` file to render a standalone diagram. Markdown files (`.md`, `.markdown`, or `text/markdown`) render prose, tables, code blocks and fenced `mermaid` diagrams. Notes containing Mermaid fences work too. Both normal Preview windows and temporary Space-key previews use the same renderer.

Each diagram includes an expandable **Mermaid source** section. Invalid syntax shows an error beside the original source; other diagrams in the document still render. Text uploads are read from their stored contents rather than their metadata. Uploaded document previews are limited to 2 MiB; Mermaid diagrams use a 50,000-character and 500-edge limit. Downloads preserve the original file.

Mermaid, Markdown parsing and sanitization are bundled locally, so rendering does not require a CDN or internet access. Plain text stays literal. Markdown is sanitized, remote images and embedded apps are excluded, and Mermaid uses strict mode with diagram links disabled.

## Development

`npm run dev` opens a local development server. Preview fixtures are separate from live Ink data.

Browser dependencies are pinned in `package-lock.json`. Run `npm ci && npm run build` to regenerate the committed `public/vendor` bundles and third-party notices before deployment. Lazy-loaded Mermaid chunks are served by the app itself.

`npm test` checks file classification and existing media behavior. Run `npm run test:browser` and open the printed localhost URL for browser checks covering real SVG rendering, Markdown diagrams, invalid syntax, sanitized markup, uploaded text, cancellation, and temporary-preview disposal.

## License

MIT for app code. Bundled third-party components retain their own licenses and notices.

## Quick preview

Displays supported files without starting the normal editing workflow. Ink OS can select this reader through `desktop.preview.fileTypes`, independently of Open with. Space opens the temporary preview from a selection; Escape or Space dismisses it, and arrow keys browse the supplied item order.
