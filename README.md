# Preview

Read text, images, audio and video, and download other files in an isolated Ink app.

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

## Development

`npm run dev` opens a local development server. Preview fixtures are separate from live Ink data.

## License

MIT for app code. Bundled third-party components retain their own licenses and notices.
