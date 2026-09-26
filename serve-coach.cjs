'use strict';
const http = require('node:http');
const path = require('node:path');
const {createCanvasHost} = require('./dist/canvas-host.cjs');
// COACH_PUBLIC_ORIGIN is the exact HTTPS origin of the authenticated proxy in
// front of this process. Leave it unset to accept loopback requests only, which
// is what a local or Copilot canvas wants.
const host = createCanvasHost({distDir:path.join(__dirname,'dist'),publicOrigin:process.env.COACH_PUBLIC_ORIGIN});
const port = Number(process.env.PORT || 18741);
const server = http.createServer((req,res)=>{
  if(req.url === '/healthz') {res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,mode:'canvas',llm:false}));return;}
  host.handle(req,res);
});
server.listen(port,'127.0.0.1',()=>host.start());
function stop(){host.dispose();server.close(()=>process.exit(0));}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
