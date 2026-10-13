const {DatabaseSync,constants:c}=require('node:sqlite');
let text='';process.stdin.on('data',d=>text+=d);process.stdin.on('end',()=>{
 try{
 const sql=JSON.parse(text),db=new DatabaseSync(':memory:',{allowExtension:false});
 // Tokenize strings/comments before enforcing one SELECT; result grading uses SQLite.
 const tokens=sql.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_]+|;|\S/g)||[];
 const meaningful=tokens.filter(t=>!t.startsWith('--')&&!t.startsWith('/*'));
 if(meaningful[0]?.toUpperCase()!=='SELECT'||meaningful.slice(0,-1).includes(';'))throw Error('Submit one read-only SELECT.');
 db.exec('CREATE TABLE Orders(id INTEGER PRIMARY KEY, customer TEXT NOT NULL, amount INTEGER NOT NULL);');
 const fixtures=[[[1,'Ana',40],[2,'Bo',30],[3,'Ana',70],[4,'Cy',20]],[[1,'Ana',40],[2,'Ana',70],[3,'Bo',50],[4,'Bo',60],[5,'Cy',120]],[[1,'Lia',50]],[[1,'May',49]]];
 const expected=[[['Ana',110]],[['Cy',120],['Ana',110],['Bo',110]],[['Lia',50]],[]];
 const grades=fixtures.map((rows,i)=>{
 db.setAuthorizer(null);db.exec('DELETE FROM Orders');const put=db.prepare('INSERT INTO Orders VALUES(?,?,?)');rows.forEach(r=>put.run(...r));db.exec('PRAGMA hard_heap_limit=16777216');
 db.setAuthorizer((action,a,b)=>action===c.SQLITE_SELECT||action===c.SQLITE_READ&&a==='Orders'||action===c.SQLITE_FUNCTION&&['sum','total','count','avg','min','max'].includes(String(b).toLowerCase())?c.SQLITE_OK:c.SQLITE_DENY);
 const q=db.prepare(sql);q.setReturnArrays(true);const out=[];for(const row of q.iterate()){out.push(row);if(out.length>20)throw Error('Too many result rows.');}return Number(JSON.stringify(out)===JSON.stringify(expected[i]));
 });db.close();process.stdout.write(JSON.stringify({criteria:grades}));
 }catch(e){process.stdout.write(JSON.stringify({error:e.message,invalidSubmission:/Submit one read-only SELECT|syntax error|no such|not authorized|prohibited|ambiguous|misuse|incomplete input/i.test(e.message)}));}
});
