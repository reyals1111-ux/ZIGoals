// Local stand-in for the Cloudflare API, used only to make a real wrangler write its deploy output entry.
// It runs inside a network namespace with no route off the machine.
import {createServer} from 'node:http';
import {appendFileSync} from 'node:fs';
const log=process.argv[3];
const VERSION='5f2b7c1e-3a4d-4e6f-8a9b-0c1d2e3f4a5b',DEPLOYMENT='0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const ok=(res,result,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<400,errors:status<400?[]:[{code:10007,message:'not found'}],messages:[],result}));};
createServer((req,res)=>{let body=0;const chunks=[];req.on('data',c=>{body+=c.length;chunks.push(c);});req.on('end',()=>{
 const url=new URL(req.url,'http://x'),p=url.pathname.replace(/^\/client\/v4/,'');appendFileSync(log,`${req.method} ${p}${url.search} ${body}\n`);if(req.method==='PUT')appendFileSync(log+'.body',Buffer.concat(chunks).toString('utf8')+'\n----\n');
 if(/\/workers\/services\/[^/]+$/.test(p))return ok(res,null,404);
 if(/\/workers\/workers\/[^/]+$/.test(p)&&req.method==='GET')return ok(res,{id:'fixture-worker-id',name:'zigoals-alpha',subdomain:{enabled:false,previews_enabled:false}});
 if(/\/workers\/scripts\/[^/]+\/subdomain$/.test(p))return ok(res,{enabled:false,previews_enabled:false});
 if(/\/workers\/subdomain$/.test(p))return ok(res,{subdomain:'fixture'});
 if(/\/workers\/scripts\/[^/]+\/versions\/?$/.test(p)&&req.method==='POST')return ok(res,{id:VERSION,number:1,metadata:{}});
 if(/\/workers\/scripts\/[^/]+\/deployments$/.test(p))return ok(res,req.method==='GET'?{deployments:[]}:{id:DEPLOYMENT,strategy:'percentage',versions:[{version_id:VERSION,percentage:100}]});
 if(/\/workers\/scripts\/[^/]+\/schedules$/.test(p))return ok(res,{schedules:[]});
 if(/\/workers\/scripts\/[^/]+$/.test(p)&&req.method==='PUT')return ok(res,{id:'zigoals-alpha',etag:'fixture',deployment_id:VERSION,has_assets:false,has_modules:true,startup_time_ms:1,compatibility_date:'2026-09-13',usage_model:'standard',handlers:['fetch'],placement:{},tag:'fixturetag'});
 if(/\/workers\/scripts\/[^/]+\/settings$/.test(p))return ok(res,{});
 return ok(res,{});
});}).listen(Number(process.argv[2]),'127.0.0.1');
