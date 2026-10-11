import ts from 'typescript';
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
/** Regression guard for the source graph. Next's native server-only poisoning
 * remains the authoritative build boundary, including dependencies outside this tree.
 */
export function clientServerViolations(root:string):string[] {
 const nodes=new Map<string,{client:boolean;server:boolean;dependencies:string[]}>();
 function walk(dir:string){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
   if(entry.name.startsWith('.')||entry.name==='node_modules'||entry.name==='tests')continue;
   const path=resolve(join(dir,entry.name));
   if(entry.isDirectory()){walk(path);continue;}
   if(!/\.[cm]?[jt]sx?$/.test(path)||/\.test\./.test(path))continue;
   const source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
   const client=source.statements.some(s=>ts.isExpressionStatement(s)&&ts.isStringLiteral(s.expression)&&s.expression.text==='use client');
   const imports:string[]=[];
   function visit(n:ts.Node){
    if(ts.isImportDeclaration(n)&&!n.importClause?.isTypeOnly&&ts.isStringLiteral(n.moduleSpecifier))imports.push(n.moduleSpecifier.text);
    if(ts.isExportDeclaration(n)&&!n.isTypeOnly&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier))imports.push(n.moduleSpecifier.text);
    if(ts.isCallExpression(n)&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||n.expression.getText(source)==='require')&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))imports.push(n.arguments[0].text);
    ts.forEachChild(n,visit);
   }visit(source);
   const dependencies=imports.flatMap(name=>{const result=ts.resolveModuleName(name,path,{moduleResolution:ts.ModuleResolutionKind.Bundler,allowJs:true},ts.sys).resolvedModule;return result?[resolve(result.resolvedFileName)]:[];});
   nodes.set(path,{client,server:imports.includes('server-only'),dependencies});
  }
 }walk(root);
 const violations:string[]=[];
 for(const [path,node] of nodes)if(node.client){
  const seen=new Set<string>(),queue=[path];let found=false;
  while(queue.length){const next=queue.pop()!;if(seen.has(next))continue;seen.add(next);const target=nodes.get(next);if(!target)continue;if(target.server){found=true;break;}queue.push(...target.dependencies);}
  if(found)violations.push(path);
 }
 return violations;
}
