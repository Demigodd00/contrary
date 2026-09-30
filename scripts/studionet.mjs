// Operator for dedicated disposable StudioNet accounts. Never reads a browser wallet.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createAccount,generatePrivateKey,createClient,chains} from 'genlayer-js';
import {TransactionHashVariant} from 'genlayer-js/types';

const root=new URL('../',import.meta.url);
const local=new URL('../.local/',import.meta.url);
fs.mkdirSync(local,{recursive:true});
const accountsFile=new URL('accounts.json',local);
if(!fs.existsSync(accountsFile)){
 const keys=Object.fromEntries(['sponsor','challenger','observer'].map(role=>[role,generatePrivateKey()]));
 fs.writeFileSync(accountsFile,JSON.stringify(keys),{flag:'wx',mode:0o600});
}
const keys=JSON.parse(fs.readFileSync(accountsFile,'utf8'));
const clients=Object.fromEntries(Object.entries(keys).map(([role,key])=>[role,createClient({chain:chains.studionet,account:createAccount(key)})]));
const accounts=Object.fromEntries(Object.entries(clients).map(([role,client])=>[role,client.account.address]));
const stateFile=new URL('state.json',local);
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{network:'studionet',chainId:61999,transactions:[]};
const json=value=>JSON.stringify(value,(_,part)=>typeof part==='bigint'?part.toString():part,2);
const save=()=>fs.writeFileSync(stateFile,json(state));
const show=value=>console.log(json(value));
const read=(method,args=[])=>clients.sponsor.readContract({address:state.address,functionName:method,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
const [command,...args]=process.argv.slice(2);
if(Number(await clients.sponsor.request({method:'eth_chainId'}))!==61999)throw Error('Refusing non-StudioNet network');

async function transaction(hash){return clients.sponsor.getTransaction({hash});}
function execution(receipt){
 const consensus=receipt.consensusData??receipt.consensus_data;
 const raw=consensus?.leaderReceipt??consensus?.leader_receipt;
 const leader=Array.isArray(raw)?[...raw].reverse().find(item=>item.mode==='leader')??raw.at(-1):raw;
 return {status:String(receipt.statusName??receipt.status_name??receipt.status).toUpperCase(),execution:String(leader?.execution_result??leader?.executionResult??''),result:leader?.result};
}
async function send(role,method,params,value=0n){
 if(!state.address)throw Error('Bind deployment first');
 if(!clients[role])throw Error('Unknown test role');
 const hash=await clients[role].writeContract({address:state.address,functionName:method,args:params,value});
 state.transactions.push({hash,role,method,at:new Date().toISOString()});save();show({hash,role,method});
}

if(command==='accounts')show(accounts);
else if(command==='balances'){
 const balances={};for(const [role,address] of Object.entries(accounts))balances[role]=String(await clients[role].getBalance({address}));
 show(balances);
}
else if(command==='fund'){
 const role=args[0];if(!clients[role])throw Error('Unknown test role');
 const result=await clients[role].request({method:'sim_fundAccount',params:[accounts[role],100000000000000000]});
 show({role,address:accounts[role],result});
}
else if(command==='deploy'){
 const code=fs.readFileSync(new URL('../contracts/contrary.py',import.meta.url),'utf8').replaceAll('\r\n','\n');
 const newHash=crypto.createHash('sha256').update(code).digest('hex');
 if(state.deployHash){
  if(!state.address||state.sourceSha256===newHash)throw Error('Existing deployment is unbound or this exact source was already deployed');
  state.history??=[];state.history.push({deployHash:state.deployHash,address:state.address,sourceSha256:state.sourceSha256,config:state.config});
  state.address=null;
 }
 state.sourceSha256=newHash;
 state.deployHash=await clients.sponsor.deployContract({code,args:[]});save();show({hash:state.deployHash,sourceSha256:state.sourceSha256});
}
else if(command==='receipt'){
 const hash=args[0]||state.transactions.at(-1)?.hash||state.deployHash;
 if(!/^0x[0-9a-fA-F]{64}$/.test(hash||''))throw Error('Missing transaction hash');
 const receipt=await transaction(hash);const detail=execution(receipt);
 show({hash,...detail,from:receipt.fromAddress??receipt.from_address??receipt.from??null,to:receipt.toAddress??receipt.to_address??receipt.to??null,value:String(receipt.value??''),valueCredited:receipt.value_credited??receipt.valueCredited??null,contractAddress:receipt.contractAddress??receipt.contract_address??null,triggeredTransactions:receipt.triggered_transactions??receipt.triggeredTransactions??[]});
}
else if(command==='bind'){
 if(state.address)throw Error('Contract already bound');
 const receipt=await transaction(state.deployHash);const outcome=execution(receipt);
 if(outcome.status!=='FINALIZED'||outcome.execution!=='SUCCESS')throw Error('Deployment has not finalized successfully');
 const address=args[0]||receipt.contractAddress||receipt.contract_address;
 if(!/^0x[0-9a-fA-F]{40}$/.test(address||''))throw Error('Provide the verified contract address');
 const code=await clients.sponsor.getContractCode(address);
 const actual=crypto.createHash('sha256').update(code.replaceAll('\r\n','\n')).digest('hex');
 if(actual!==state.sourceSha256)throw Error('On-chain source mismatch');
 const config=await clients.sponsor.readContract({address,functionName:'get_config',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
 if(config.version!=='contrary.v0.2.0'||config.review_window_seconds!==600||config.attempt_page_limit!==50||config.fee_bps!==0)throw Error('On-chain policy mismatch');
 state.address=address;state.config=config;state.accounts=accounts;state.schema=await clients.sponsor.getContractSchema(address);save();
 show({address,sourceSha256:actual,config,deployHash:state.deployHash});
}
else if(command==='create'){
 const id=args[0]||'CT-LIVE-EMPTY-001';
 if(state.transactions.some(tx=>tx.method==='create_claim'&&tx.id===id))throw Error('Claim already submitted; inspect its receipt');
 const publishedCommit=args[1];
 if(!/^[0-9a-f]{40}$/.test(publishedCommit||''))throw Error('Provide the full published fixture commit');
 const deadline=Math.floor(Date.now()/1000)+7200;
 const terms={id,title:'Empty names are always rejected',statement:'The allowed(name) function rejects every empty string.',scope:'Call allowed(name) with a Python string using this one complete source file.',exclusions:'Do not infer imported code or environment state.',repo:'Demigodd00/contrary',commit:publishedCommit,path:'examples/validator.py',deadline};
 await send('sponsor','create_claim',[JSON.stringify(terms)],10n**16n);
 state.transactions.at(-1).id=id;state.fixtureCommit=publishedCommit;save();
}
else if(command==='challenge')await send('challenger','submit_counterexample',[args[0]||'CT-LIVE-EMPTY-001',"name = ''",'False','True','The empty-string branch returns True directly from the pinned source.'],10n**15n);
else if(command==='review')await send('observer','review_counterexample',[args[0]||'CT-LIVE-EMPTY-001']);
else if(command==='rebut')await send('sponsor','rebut_assessment',[args[0]||'CT-LIVE-EMPTY-001','Do not rely on the explanatory docstring. Check the executable empty-string branch itself against the exact claim.']);
else if(command==='finalize')await send('observer','finalize',[args[0]||'CT-LIVE-EMPTY-001']);
else if(command==='close')await send('observer','close_expired',[args[0]||'CT-LIVE-EMPTY-001']);
else if(command==='recover')await send('observer','recover_unreviewed',[args[0]||'CT-LIVE-EMPTY-001']);
else if(command==='withdraw')await send(args[0]||'challenger','withdraw',[]);
else if(command==='claim')show(await read('get_claim',[args[0]||'CT-LIVE-EMPTY-001']));
else if(command==='attempts')show(await read('get_attempts',[args[0]||'CT-LIVE-EMPTY-001',Number(args[1]||0),Number(args[2]||20)]));
else if(command==='accounting'){
 const rows={};for(const [role,address] of Object.entries(accounts))rows[role]=await read('get_accounting',[address]);show(rows);
}
else if(command==='state')show({network:state.network,chainId:state.chainId,deployHash:state.deployHash,address:state.address,sourceSha256:state.sourceSha256,transactions:state.transactions});
else throw Error('Unknown command');
