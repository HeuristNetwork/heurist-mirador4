//import 'mirador-annotation-editor/dist/mirador-annotation-editor.css';
import 'quill/dist/quill.snow.css';
import './style.css';

import { getHeuristMiradorConfig } from './heuristConfig.js';
import { initHeuristMirador } from './initHeuristMirador.js';

const config = getHeuristMiradorConfig();

initHeuristMirador(config).catch((error) => {
  console.error('Failed to initialize Heurist Mirador 4', error);
});