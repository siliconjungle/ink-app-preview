// Keep temporary preview independent of the normal app's startup and side effects.
if (new URLSearchParams(location.search).get('mode') === 'preview') {
  const [{startPreview}, {renderQuickLook}] = await Promise.all([
    import('./quick-look.mjs'), import('./quick-look-render.mjs'),
  ]);
  await startPreview({render: renderQuickLook});
} else {
  await import('./app.mjs');
}
