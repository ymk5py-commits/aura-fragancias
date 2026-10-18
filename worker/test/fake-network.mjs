// Se precarga con `node --import` para que el proceso real (src/main.js) hable con un YCloud/Pagopar simulados.
import { createFakeNetwork } from './helpers.mjs';

const net = createFakeNetwork();
globalThis.fetch = net.fetch.bind(net);
