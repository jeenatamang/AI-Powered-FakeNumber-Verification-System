// ── Polyfills — must come before everything else ──────────────────────────
import 'react-native-url-polyfill/auto';

// Patch globals before any module loads
if (typeof global.FormData === 'undefined') {
  global.FormData = require('react-native/Libraries/Network/FormData');
}
if (typeof global.Blob === 'undefined') {
  global.Blob = require('react-native/Libraries/Blob/Blob');
}
if (typeof global.FileReader === 'undefined') {
  global.FileReader = require('react-native/Libraries/Blob/FileReader');
}

// ── App entry point ───────────────────────────────────────────────────────
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);