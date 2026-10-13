const acorn = require('acorn');
const version = 'larger_checks_v2_ast_v1';
const checks = [[8,3,8],[2,9,9],[-5,-2,-2],[4,4,4],[0,0,0],[-8,-3,-3],[0,-1,0],[100,100,100]];
// Interpret only the numeric language needed by this task. Student code is never eval'd.
function compile(code) {
  if (typeof code !== 'string' || !code.trim() || code.length > 20000) throw new Error('Enter code within the 20,000-character limit.');
  const ast = acorn.parse(code, { ecmaVersion: 2022 });
  const statements = ast.body.filter(node => node.type !== 'EmptyStatement');
  if (statements.length !== 1) throw new Error('Define only larger(a, b), without code outside the function.');
  let fn = statements[0];
  if (fn.type === 'VariableDeclaration' && fn.declarations.length === 1 && fn.declarations[0].id.name === 'larger') fn = fn.declarations[0].init;
  else if (fn.type !== 'FunctionDeclaration' || fn.id?.name !== 'larger') throw new Error('Define a function named larger(a, b).');
  if (!fn || !['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(fn.type) || fn.async || fn.generator || fn.params.length !== 2 || fn.params.some(node => node.type !== 'Identifier') || fn.params[0].name===fn.params[1].name) throw new Error('larger must be a synchronous function with two named parameters.');
  if(fn.params.some(node=>node.name==='Math'))throw new Error('Do not use Math as a parameter name.');
  const allowed = new Set(['BlockStatement','ReturnStatement','IfStatement','VariableDeclaration','VariableDeclarator','ExpressionStatement','AssignmentExpression','EmptyStatement','Literal','Identifier','BinaryExpression','LogicalExpression','UnaryExpression','ConditionalExpression','CallExpression','MemberExpression']);
  let count=0;
  const inspect = node => {
    if (!node || typeof node !== 'object') return;
    if (++count > 1000) throw new Error('Simplify this function before submitting.');
    if (!allowed.has(node.type)) throw new Error('Use comparisons, if/else, a ternary, local variables, or Math.max/Math.min for this task. Loops and other calls are not supported.');
    if (node.type==='Literal' && (typeof node.value!=='number' || !Number.isFinite(node.value))) throw new Error('Use numeric values only.');
    if (node.type==='CallExpression' && (node.callee.type!=='MemberExpression' || node.callee.computed || node.callee.object.name!=='Math' || !['max','min','abs'].includes(node.callee.property.name))) throw new Error('Only Math.max, Math.min and Math.abs calls are supported.');
    if (node.type==='MemberExpression' && (node.computed || node.object.type!=='Identifier' || node.object.name!=='Math' || !['max','min','abs'].includes(node.property.name))) throw new Error('Object access is not supported in this task.');
    if (node.type==='AssignmentExpression' && (node.left.type!=='Identifier' || node.operator!=='=')) throw new Error('Use a simple assignment to a local variable.');
    for (const value of Object.values(node)) { if (Array.isArray(value)) value.forEach(child=>child?.type&&inspect(child)); else if(value?.type)inspect(value); }
  };
  inspect(fn.body);
  const binary = {
    '>':(a,b)=>a>b,'<':(a,b)=>a<b,'>=':(a,b)=>a>=b,'<=':(a,b)=>a<=b,
    '===':(a,b)=>a===b,'!==':(a,b)=>a!==b,'==':(a,b)=>a==b,'!=':(a,b)=>a!=b,
    '+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>a/b,'%':(a,b)=>a%b
  };
  return (a,b) => {
    const env = new Map([[fn.params[0].name,{value:a,kind:'parameter'}],[fn.params[1].name,{value:b,kind:'parameter'}]]);
    let budget=2000;
    const visit = node => {
      if (!node) return undefined;
      if (--budget < 0) throw new Error('Function exceeds the task complexity limit.');
      switch(node.type) {
        case 'Literal': return node.value;
        case 'Identifier': if(!env.has(node.name))throw new Error(`Unknown variable: ${node.name}`); return env.get(node.name).value;
        case 'BinaryExpression': if(!binary[node.operator])throw new Error('Unsupported operator.'); return binary[node.operator](visit(node.left),visit(node.right));
        case 'LogicalExpression': { const left=visit(node.left); if(node.operator==='&&')return left&&visit(node.right); if(node.operator==='||')return left||visit(node.right); if(node.operator==='??')return left??visit(node.right); throw new Error('Unsupported operator.'); }
        case 'UnaryExpression': { const value=visit(node.argument); if(node.operator==='-')return -value; if(node.operator==='+')return +value; if(node.operator==='!')return !value; throw new Error('Unsupported operator.'); }
        case 'ConditionalExpression': return visit(node.test)?visit(node.consequent):visit(node.alternate);
        case 'CallExpression': return Math[node.callee.property.name](...node.arguments.map(visit));
        case 'AssignmentExpression': if(!env.has(node.left.name)||env.get(node.left.name).kind==='const')throw new Error('Assign only to a declared mutable local variable.'); {const value=visit(node.right);env.get(node.left.name).value=value;return value;}
        default: throw new Error('Unsupported expression.');
      }
    };
    const execute = node => {
      if (!node) return null;
      switch(node.type) {
        case 'BlockStatement': { const snapshot=new Map(env); for(const child of node.body){const result=execute(child);if(result)return result;} for(const key of env.keys())if(!snapshot.has(key)&&env.get(key).kind!=='var')env.delete(key);return null; }
        case 'ReturnStatement': return {value:visit(node.argument)};
        case 'IfStatement': return execute(visit(node.test)?node.consequent:node.alternate);
        case 'VariableDeclaration': node.declarations.forEach(declaration=>{if(declaration.id.type!=='Identifier'||declaration.id.name==='Math'||(env.has(declaration.id.name)&&!(node.kind==='var'&&env.get(declaration.id.name).kind==='var')))throw new Error('Use distinct local variable names and do not shadow Math.');env.set(declaration.id.name,{value:visit(declaration.init),kind:node.kind});}); return null;
        case 'ExpressionStatement': visit(node.expression); return null;
        case 'EmptyStatement': return null;
        default: throw new Error('Unsupported statement.');
      }
    };
    return fn.body.type==='BlockStatement'?execute(fn.body)?.value:visit(fn.body);
  };
}
function scoreCode(code) {
  const larger = compile(code);
  const results = checks.map(([a,b,expected])=>{try{const actual=larger(a,b);return {input:[a,b],expected,actual:String(actual),passed:actual===expected};}catch(error){return {input:[a,b],expected,error:error.message,passed:false};}});
  return {version,passed:results.filter(result=>result.passed).length,total:checks.length,results};
}
module.exports = {scoreCode,checks,version};
