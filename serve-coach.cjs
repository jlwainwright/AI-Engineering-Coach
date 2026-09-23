'use strict';
const http = require('node:http');
const path = require('node:path');
const {createCanvasHost} = require('./dist/canvas-host.cjs');
const host = createCanvasHost({distDir:path.join(__dirname,'dist'),publicOrigin:'https://code.jacqueswainwright.com'});
const port = Number(process.env.PORT || 18741);
const server = http.createServer((req,res)=>{
  if(req.url === '/healthz') {res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,mode:'canvas',llm:false}));return;}
  host.handle(req,res);
});
server.listen(port,'127.0.0.1',()=>host.start());
function stop(){host.dispose();server.close(()=>process.exit(0));}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
