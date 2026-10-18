// Registro en JSON por línea (stdout). Nunca recibe claves ni datos del comprador.
function write(level, msg, fields) {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields })}\n`);
}

export const log = {
  info: (msg, fields) => write('info', msg, fields),
  warn: (msg, fields) => write('warn', msg, fields),
  error: (msg, fields) => write('error', msg, fields),
};

export const silentLog = { info() {}, warn() {}, error() {} };
