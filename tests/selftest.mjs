// Regression self-test for Payoff. Extracts the app's real <script>, evaluates it
// against a minimal browser stub, and asserts simulatePayoff().
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

function el(){ return {value:'',textContent:'',innerHTML:'',style:{},dataset:{},addEventListener(){},setAttribute(){},getAttribute(){return null;},querySelectorAll(){return[];},appendChild(){},onclick:null}; }
const ids={};
globalThis.document={getElementById:id=>ids[id]||(ids[id]=el()),createElement:()=>el(),querySelectorAll:()=>[],documentElement:el()};
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
globalThis.location={hash:'',origin:'',pathname:''};
globalThis.window={matchMedia:()=>({matches:false}),location:globalThis.location};
globalThis.matchMedia=globalThis.window.matchMedia;
try{Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:()=>Promise.resolve()}},configurable:true});}catch{}

const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
eval(js+`\n;globalThis.__t={simulatePayoff,solveExtraForMonths,encodeShare,decodeShare,extraSensitivity};`);
const t=globalThis.__t;

let n=0; const check=(name,fn)=>{fn();n++;console.log('  ok -',name);};

check('single 0% debt: months = balance/payment, no interest',()=>{
  const r=t.simulatePayoff([{name:'A',balance:1000,apr:0,min:100}],100,'avalanche');
  // budget = 200 -> 1000/200 = 5 months
  assert.equal(r.months,5);
  assert.ok(Math.abs(r.totalInterest)<0.01);
  assert.equal(r.cleared,true);
  assert.deepEqual(r.order,['A']);
  assert.deepEqual(r.schedule,[{name:'A',month:5}]);
  assert.equal(r.series.length,6);          // start + 5 months
  assert.equal(r.series[0],1000);
  assert.ok(r.series[5]<0.01);              // ends at zero
});
check('interest accrues: pay-in-full next month',()=>{
  const r=t.simulatePayoff([{name:'A',balance:1000,apr:12,min:100000}],0,'avalanche');
  // month1 interest = 1000*0.01 = 10, min covers full 1010 -> 1 month, interest 10
  assert.equal(r.months,1);
  assert.ok(Math.abs(r.totalInterest-10)<0.01,'int '+r.totalInterest);
});
check('avalanche targets highest APR first',()=>{
  const debts=[{name:'Low',balance:1000,apr:5,min:50},{name:'High',balance:1000,apr:25,min:50}];
  const r=t.simulatePayoff(debts,200,'avalanche');
  assert.equal(r.order[0],'High');
});
check('snowball targets smallest balance first',()=>{
  const debts=[{name:'Big',balance:5000,apr:25,min:100},{name:'Small',balance:800,apr:5,min:40}];
  const r=t.simulatePayoff(debts,200,'snowball');
  assert.equal(r.order[0],'Small');
});
check('avalanche pays no more interest than snowball',()=>{
  const debts=[{name:'A',balance:5000,apr:24,min:100},{name:'B',balance:1000,apr:6,min:40}];
  const av=t.simulatePayoff(debts,150,'avalanche'), sn=t.simulatePayoff(debts,150,'snowball');
  assert.ok(av.totalInterest<=sn.totalInterest+0.01);
});
check('under-water budget never clears',()=>{
  const r=t.simulatePayoff([{name:'A',balance:10000,apr:30,min:10}],0,'avalanche'); // interest >> payment
  assert.equal(r.cleared,false);
  assert.equal(r.months,Infinity);
});

check('solveExtraForMonths: min extra to hit a target',()=>{
  const d=[{name:'A',balance:1200,apr:0,min:100}];
  // budget = 100+extra; to clear in 4 months need 1200/budget<=4 -> budget>=300 -> extra>=200
  assert.equal(t.solveExtraForMonths(d,4,'avalanche'),200);
  // generous horizon that minimums already meet -> 0
  assert.equal(t.solveExtraForMonths(d,12,'avalanche'),0);
  // impossible horizon -> null
  assert.equal(t.solveExtraForMonths(d,0,'avalanche'),null);
});

check('extra payments cut months and interest vs minimums only',()=>{
  const d=[{name:'A',balance:6000,apr:22,min:150},{name:'B',balance:9000,apr:6,min:250}];
  const base=t.simulatePayoff(d,0,'avalanche'), plan=t.simulatePayoff(d,300,'avalanche');
  assert.ok(plan.months<base.months);
  assert.ok(plan.totalInterest<base.totalInterest);
});

check('share codec: round-trips debts+extra+strategy, rejects garbage',()=>{
  const d=[{name:'Card',balance:6000,apr:22.9,min:150},{name:'Loan',balance:9000,apr:6.5,min:250}];
  const back=t.decodeShare(t.encodeShare(d,300,'snowball'));
  assert.equal(back.extra,300);
  assert.equal(back.strategy,'snowball');
  assert.equal(back.debts.length,2);
  assert.equal(back.debts[0].name,'Card');
  assert.equal(back.debts[1].balance,9000);
  assert.equal(t.decodeShare('###bad'),null);
});

check('extraSensitivity: more extra never increases months or interest',()=>{
  const d=[{name:'A',balance:6000,apr:22,min:150},{name:'B',balance:9000,apr:6,min:250}];
  const rows=t.extraSensitivity(d,[0,200,500],'avalanche');
  assert.equal(rows.length,3);
  assert.ok(rows[0].months>=rows[1].months && rows[1].months>=rows[2].months);
  assert.ok(rows[0].totalInterest>=rows[1].totalInterest && rows[1].totalInterest>=rows[2].totalInterest);
});

console.log(`\n${n} checks passed.`);
