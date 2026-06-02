const http = require('http');
const url = 'http://localhost:5173/node_modules/.pnpm/sql.js@1.14.1/node_modules/sql.js/dist/sql-wasm-browser.wasm';

http.get(url, res => {
  console.log('STATUS', res.statusCode, res.headers['content-type']);
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', async () => {
    try {
      const buf = Buffer.concat(chunks);
      console.log('len', buf.length);
      const module = new WebAssembly.Module(buf);
      const imports = WebAssembly.Module.imports(module);
      console.log('imports count', imports.length);
      const importsObj = {};
      for (const imp of imports) {
        if (!importsObj[imp.module]) importsObj[imp.module] = {};
        importsObj[imp.module][imp.name] = function () {
          throw new Error('stub called ' + imp.module + ' ' + imp.name);
        };
      }
      try {
        const inst = await WebAssembly.instantiate(buf, importsObj);
        console.log('instantiate ok', Object.keys(inst.exports).length);
      } catch (e) {
        console.error('instantiate FAILED', e);
      }
    } catch (e) {
      console.error('error', e);
    }
  });
}).on('error', e => console.error('GET ERR', e));
