// A real Tiptap editor (ProseMirror), like claude.ai's message box, for offline tests of how
// text inserted with execCommand behaves in each browser. Bundled by esbuild into
// out/editor/tiptap.js (test-only; never part of the extension).
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

window.makeEditor = (el) => {
  const editor = new Editor({ element: el, extensions: [StarterKit] });
  editor.view.dom.setAttribute('data-testid', 'chat-input');
  return editor;
};
