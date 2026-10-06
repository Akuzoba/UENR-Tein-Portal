// Copies the MediaPipe vision runtime (Wasm) into public/ so the passport-photo tool loads it from our own
// domain. Runs on every `npm install` (postinstall); the copies are git-ignored.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/@mediapipe/tasks-vision/wasm";
const to = "public/mediapipe";
const files = ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"];

if (existsSync(from)) {
  mkdirSync(to, { recursive: true });
  for (const f of files) copyFileSync(`${from}/${f}`, `${to}/${f}`);
}
