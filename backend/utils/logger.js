const LEVELS = ['error','warn','info','debug'];
const CURRENT = process.env.LOG_LEVEL || 'info';
const activeIdx = LEVELS.indexOf(CURRENT);

function ts(){return new Date().toISOString();}
function logAt(level, ...args){
  if(LEVELS.indexOf(level) <= activeIdx){
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](`[${ts()}] [${level.toUpperCase()}]`, ...args);
  }
}

module.exports = {
  error: (...a)=>logAt('error',...a),
  warn: (...a)=>logAt('warn',...a),
  info: (...a)=>logAt('info',...a),
  debug: (...a)=>logAt('debug',...a)
};
