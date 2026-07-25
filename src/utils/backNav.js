// src/utils/backNav.js
//
// Shared "back stack" for browser Back-button handling across the whole
// app. Any UI layer that should be undone by a single Back press — a
// screen/tab, an instruction opened on top of a business, the "View on
// Map" overlay, the entry-pin editor, etc. — pushes itself here instead of
// registering its own popstate listener. Keeping exactly ONE popstate
// listener means nested layers always unwind one at a time, in the right
// order (last opened, first closed), no matter which component opened
// them.
//
// Usage:
//   // when the layer opens:
//   pushBackLevel(() => { /* close this layer */ });
//
//   // when the layer closes itself via normal in-app UI (not a Back
//   // press) — e.g. its own "X" / Cancel / Save button:
//   popBackLevelSilently();

const stack = [];
let listening = false;

function handlePopState() {
  const onPop = stack.pop();
  if (onPop) onPop();
}

function ensureListening() {
  if (listening) return;
  window.addEventListener("popstate", handlePopState);
  listening = true;
}

export function pushBackLevel(onPop) {
  ensureListening();
  window.history.pushState({ cnsBack: true }, "");
  stack.push(onPop);
}

export function popBackLevelSilently() {
  stack.pop();
}