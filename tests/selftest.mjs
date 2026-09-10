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
globalThis.window={matchMedia:()=>({matches:false})};
globalThis.matchMedia=globalThis.window.matchMedia;

const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
eval(js+`\n;globalThis.__t={simulatePayoff};`);
const t=globalThis.__t;

let n=0; const check=(name,fn)=>{fn();n++;console.log('  ok -',name);};

check('single 0% debt: months = balance/payment, no interest',()=>{
  const r=t.simulatePayoff([{name:'A',balance:1000,apr:0,min:100}],100,'avalanche');
  // budget = 200 -> 1000/200 = 5 months
  assert.equal(r.months,5);
  assert.ok(Math.abs(r.totalInterest)<0.01);
  assert.equal(r.cleared,true);
  assert.deepEqual(r.order,['A']);
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

console.log(`\n${n} checks passed.`);
