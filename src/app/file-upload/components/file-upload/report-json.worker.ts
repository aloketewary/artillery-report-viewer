addEventListener('message', (event: MessageEvent<string>) => {
  try {
    postMessage({ok: true, value: JSON.parse(event.data)});
  } catch {
    postMessage({ok: false});
  }
});
