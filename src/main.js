/**
 * @file main.js
 * @brief Entry point for the Heurist Mirador v4 bundle.
 * @fileOverview Loads CSS dependencies, reads runtime configuration from the hosting page, and starts the Mirador viewer initialization workflow.
 *
 * @project     Mirador v4 integration/bundle for Heurist with MAE annotation support.
 *
 * @link https://HeuristNetwork.org
 * @copyright (C) 2024 onwards Heurist Network
 * @license https://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
 * @author Artem Osmakov <osmakov@gmail.com>
 *
 *
 */
//import 'mirador-annotation-editor/dist/mirador-annotation-editor.css';
import 'quill/dist/quill.snow.css';
import './style.css';

import { getHeuristMiradorConfig } from './heuristConfig.js';
import { initHeuristMirador } from './initHeuristMirador.js';

const config = getHeuristMiradorConfig();

initHeuristMirador(config);