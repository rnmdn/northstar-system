const acorn=require('acorn');
// Bounded AST interpreter: no eval, Node globals, arbitrary calls, or prototype access.
function compile(source){
 let ast;
 try{ast=acorn.parse(source,{ecmaVersion:2022});}catch(e){throw Object.assign(Error('Invalid JavaScript syntax: '+e.message),{invalidSubmission:true});}
 const fn=ast.body[0];
 if(ast.body.length!==1||fn?.type!=='FunctionDeclaration'||fn.id?.name!=='summarizeScores'||fn.params.length!==1||fn.params[0].type!=='Identifier'||fn.async||fn.generator)throw Object.assign(Error('Submit one function summarizeScores(scores).'),{invalidSubmission:true});
 return scores=>{
 let budget=20000;const tick=()=>{if(--budget<0)throw Error('Execution limit exceeded.');};
 const safe=k=>{if(typeof k!=='string'||['__proto__','constructor','prototype','process','globalThis','require','eval','Function'].includes(k))throw Error('Unsupported name.');return k;};
 const scope=p=>({v:Object.create(null),p});const root=scope(null);root.v[safe(fn.params[0].name)]=scores;
 const find=(e,k)=>{safe(k);for(;e;e=e.p)if(Object.hasOwn(e.v,k))return e;throw Error('Only local variables are allowed.');};
 function val(n,e){tick();if(!n)return undefined;switch(n.type){
 case 'Literal':if(n.regex||typeof n.value==='bigint')throw Error('Unsupported literal.');return n.value;
 case 'Identifier':return find(e,n.name).v[n.name];
 case 'ArrayExpression':return n.elements.map(x=>val(x,e));
 case 'ObjectExpression':{const o=Object.create(null);for(const p of n.properties){if(p.type!=='Property'||p.kind!=='init'||p.method)throw Error('Use plain object fields.');o[safe(p.computed?val(p.key,e):p.key.name??p.key.value)]=val(p.value,e);}return o;}
 case 'MemberExpression':{const o=val(n.object,e),k=safe(String(n.computed?val(n.property,e):n.property.name));if(Array.isArray(o)&&(k==='length'||/^\d+$/.test(k)))return o[k];if(o&&typeof o==='object'&&Object.hasOwn(o,k))return o[k];throw Error('Unsupported property.');}
 case 'ArrowFunctionExpression':case 'FunctionExpression':if(n.async||n.generator||n.params.some(p=>p.type!=='Identifier'))throw Error('Use simple callback parameters.');return {fn:n,e};
 case 'ConditionalExpression':return val(n.test,e)?val(n.consequent,e):val(n.alternate,e);
 case 'UnaryExpression':{const a=val(n.argument,e);if(n.operator==='!')return !a;if(n.operator==='-')return -a;if(n.operator==='+')return +a;throw Error('Unsupported operator.');}
 case 'LogicalExpression':{const a=val(n.left,e);if(n.operator==='&&')return a&&val(n.right,e);if(n.operator==='||')return a||val(n.right,e);if(n.operator==='??')return a??val(n.right,e);throw Error('Unsupported operator.');}
 case 'BinaryExpression':{const a=val(n.left,e),b=val(n.right,e);switch(n.operator){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '%':return a%b;case '===':return a===b;case '!==':return a!==b;case '==':return a==b;case '!=':return a!=b;case '<':return a<b;case '>':return a>b;case '<=':return a<=b;case '>=':return a>=b;default:throw Error('Unsupported operator.');}}
 case 'AssignmentExpression':{if(n.left.type!=='Identifier')throw Error('Assign only to locals.');const s=find(e,n.left.name),a=s.v[n.left.name],b=val(n.right,e),ops={'=':()=>b,'+=':()=>a+b,'-=':()=>a-b,'*=':()=>a*b,'/=':()=>a/b};if(!ops[n.operator])throw Error('Unsupported assignment.');return s.v[n.left.name]=ops[n.operator]();}
 case 'UpdateExpression':{if(n.argument.type!=='Identifier'||!['++','--'].includes(n.operator))throw Error('Unsupported update.');const s=find(e,n.argument.name),old=s.v[n.argument.name];s.v[n.argument.name]+=n.operator==='++'?1:-1;return n.prefix?s.v[n.argument.name]:old;}
 case 'CallExpression':{
 if(n.optional||n.callee.type!=='MemberExpression'||n.callee.computed)throw Error('Use supported array methods.');
 const arr=val(n.callee.object,e),m=safe(n.callee.property.name),args=n.arguments.map(a=>val(a,e));if(!Array.isArray(arr)||arr.length>1000)throw Error('Only bounded arrays are supported.');
 const call=(cb,values)=>{if(!cb?.fn)throw Error('Use a function callback.');const s=scope(cb.e);cb.fn.params.forEach((p,i)=>s.v[safe(p.name)]=values[i]);return cb.fn.body.type==='BlockStatement'?run(cb.fn.body,s)?.value:val(cb.fn.body,s);};
 if(m==='filter')return arr.filter((v,i)=>call(args[0],[v,i]));if(m==='map')return arr.map((v,i)=>call(args[0],[v,i]));
 if(m==='reduce'){if(args.length!==2)throw Error('Supply an initial reduce value.');return arr.reduce((a,v,i)=>call(args[0],[a,v,i]),args[1]);}
 if(m==='forEach'){arr.forEach((v,i)=>call(args[0],[v,i]));return undefined;}throw Error('Supported methods: filter, map, reduce, forEach.');}
 default:throw Error('Unsupported expression: '+n.type);}}
 function run(n,e){tick();if(!n)return null;switch(n.type){
 case 'BlockStatement':{const s=scope(e);for(const c of n.body){const r=run(c,s);if(r)return r;}return null;}
 case 'VariableDeclaration':for(const d of n.declarations){if(d.id.type!=='Identifier')throw Error('Use simple local variables.');e.v[safe(d.id.name)]=val(d.init,e);}return null;
 case 'ReturnStatement':return {kind:'return',value:val(n.argument,e)};
 case 'IfStatement':return run(val(n.test,e)?n.consequent:n.alternate,e);
 case 'ExpressionStatement':val(n.expression,e);return null;
 case 'BreakStatement':return {kind:'break'};case 'ContinueStatement':return {kind:'continue'};
 case 'ForOfStatement':{const a=val(n.right,e),d=n.left.declarations?.[0];if(!Array.isArray(a)||n.left.type!=='VariableDeclaration'||d?.id.type!=='Identifier')throw Error('Use for (const score of scores).');for(const v of a){tick();const s=scope(e);s.v[safe(d.id.name)]=v;const r=run(n.body,s);if(r?.kind==='return')return r;if(r?.kind==='break')break;}return null;}
 case 'ForStatement':{const s=scope(e);if(n.init)n.init.type==='VariableDeclaration'?run(n.init,s):val(n.init,s);while(!n.test||val(n.test,s)){tick();const r=run(n.body,s);if(r?.kind==='return')return r;if(r?.kind==='break')break;if(n.update)val(n.update,s);}return null;}
 case 'WhileStatement':while(val(n.test,e)){tick();const r=run(n.body,e);if(r?.kind==='return')return r;if(r?.kind==='break')break;}return null;
 case 'EmptyStatement':return null;default:throw Error('Unsupported statement: '+n.type);}}
 return run(fn.body,root)?.value;
 };}
const groups=[[[[60,80,100],[3,240,80]],[[20,40],[2,60,30]]],[[[],[0,0,null]],[[null,null],[0,0,null]]],[[[10,null,30],[2,40,20]],[[null,50],[1,50,50]]],[[[0,0],[2,0,0]],[[12.5,37.5],[2,50,25]]]];
function grade(code){const fn=compile(code);return groups.map(g=>Number(g.every(([input,expected])=>{const a=fn([...input]);return a&&['count','total','average'].every((k,i)=>expected[i]===null?a[k]===null:typeof a[k]==='number'&&Number.isFinite(a[k])&&Math.abs(a[k]-expected[i])<=1e-9);})));}
module.exports={compile,grade};
