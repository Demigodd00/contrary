// Resumable StudioNet operator for disposable test accounts. Never opens a browser wallet.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createAccount,createClient,chains} from 'genlayer-js';
import {TransactionHashVariant} from 'genlayer-js/types';

const root=new URL('../',import.meta.url);
const local=new URL('.local/',root);
const stateFile=new URL('milestone-v11-state.json',local);
const accountsFile=new URL('accounts.json',local);
if(!fs.existsSync(accountsFile))throw Error('Existing disposable StudioNet accounts are missing.');
const keys=JSON.parse(fs.readFileSync(accountsFile,'utf8'));
const clients=Object.fromEntries(Object.entries(keys).map(([role,key])=>[role,createClient({chain:chains.studionet,account:createAccount(key)})]));
const accounts=Object.fromEntries(Object.entries(clients).map(([role,client])=>[role,client.account.address]));
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{network:'studionet',chainId:61999,transactions:[]};
const json=value=>JSON.stringify(value,(_,part)=>typeof part==='bigint'?part.toString():part,2);
const save=()=>fs.writeFileSync(stateFile,json(state));
const show=value=>console.log(json(value));
const source=kind=>fs.readFileSync(new URL(kind==='probe'?'../contracts/milestone_probe.py':'../contracts/contrary.py',import.meta.url),'utf8').replaceAll('\r\n','\n');
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const gitCommit=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:new URL('../',import.meta.url),encoding:'utf8'}).trim();
const [command,...args]=process.argv.slice(2);
if(Number(await clients.sponsor.request({method:'eth_chainId'}))!==61999)throw Error('Refusing non-StudioNet network');

function execution(receipt){
 const raw=receipt.consensusData?.leaderReceipt??receipt.consensus_data?.leader_receipt;
 const leader=Array.isArray(raw)?[...raw].reverse().find(item=>item.mode==='leader')??raw.at(-1):raw;
 return {status:String(receipt.statusName??receipt.status_name??receipt.status).toUpperCase(),execution:String(leader?.execution_result??leader?.executionResult??''),result:leader?.result??null};
}
async function receipt(hash){
 if(!/^0x[0-9a-fA-F]{64}$/.test(hash||''))throw Error('Provide a 32-byte transaction hash');
 const raw=await clients.sponsor.getTransaction({hash});
 const summary={hash,...execution(raw),address:raw.contractAddress??raw.contract_address??raw.data?.contract_address??null,
  from:raw.fromAddress??raw.from_address??null,to:raw.toAddress??raw.to_address??null,value:String(raw.value??''),
  triggeredTransactions:raw.triggeredTransactions??raw.triggered_transactions??[],valueCredited:raw.valueCredited??raw.value_credited??null};
 show(summary);
}
async function deploy(kind){
 if(state[kind]?.deployHash)throw Error(kind+' deployment already submitted; inspect the saved hash before doing anything else');
 const code=source(kind),commit=gitCommit();
 const record={sourceSha256:sha256(code),sourceCommit:commit,submittedAt:new Date().toISOString()};
 record.deployHash=await clients.sponsor.deployContract({code,args:[]});
 state[kind]=record;save();show({kind,...record});
}
async function bind(kind,address){
 const record=state[kind];if(!record?.deployHash||record.address)throw Error('Missing or already-bound deployment');
 const raw=await clients.sponsor.getTransaction({hash:record.deployHash});
 const outcome=execution(raw);
 if(outcome.status!=='FINALIZED'||outcome.execution!=='SUCCESS')throw Error('Deployment is not FINALIZED + SUCCESS');
 address??=raw.contractAddress??raw.contract_address??raw.data?.contract_address;
 if(!/^0x[0-9a-fA-F]{40}$/.test(address||''))throw Error('Verified contract address is required');
 const onchain=await clients.sponsor.getContractCode(address);
 if(sha256(onchain.replaceAll('\r\n','\n'))!==record.sourceSha256)throw Error('Deployed code differs from submitted source');
 const config=kind==='contract'?await clients.sponsor.readContract({address,functionName:'get_config',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}):null;
 if(kind==='contract'&&(config.version!=='contrary.v1.1.0'||config.max_lineage_witnesses!==4||config.revision_check_window_seconds!==86400))throw Error('Wrong v1.1 policy');
 record.address=address;record.config=config;save();
 show({kind,address,sourceSha256:record.sourceSha256,sourceCommit:record.sourceCommit,config});
}
async function read(method,params=[]){
 const address=state.contract?.address;if(!address)throw Error('Bind v1 contract first');
 show(await clients.sponsor.readContract({address,functionName:method,args:params,transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
}
async function send(role,method,params=[],value=0n,key=''){
 const address=state.contract?.address;if(!address)throw Error('Bind v1 contract first');
 if(!clients[role])throw Error('Unknown test account role');
 if(key&&state.transactions.some(tx=>tx.key===key))throw Error('This action was already submitted; inspect its saved hash');
 const hash=await clients[role].writeContract({address,functionName:method,args:params,value});
 const row={key,hash,role,method,submittedAt:new Date().toISOString(),args:params,value:String(value)};
 state.transactions.push(row);save();show(row);
}
function id(value,prefix){if(typeof value!=='string'||!new RegExp('^'+prefix+'-[A-Z0-9-]{3,37}$').test(value))throw Error('Invalid '+prefix+' ID');return value;}
function sha(value){if(!/^[0-9a-f]{40}$/.test(value||''))throw Error('Full lowercase Git commit required');return value;}

if(command==='accounts')show(accounts);
else if(command==='balances'){
 const values={};for(const [role,address] of Object.entries(accounts))values[role]=String(await clients[role].getBalance({address}));
 if(state.contract?.address)values.contract=String(await clients.sponsor.getBalance({address:state.contract.address}));show(values);
}
else if(command==='state')show({network:state.network,chainId:state.chainId,probe:state.probe,contract:state.contract,transactions:state.transactions});
else if(command==='probe-deploy')await deploy('probe');
else if(command==='probe-bind')await bind('probe',args[0]);
else if(command==='probe-source'){
 const address=state.probe?.address;if(!address)throw Error('Bind probe first');
 const [repo,commit,path]=args;sha(commit);
 const hash=await clients.observer.writeContract({address,functionName:'check_source',args:[repo,commit,path]});
 state.probe.sourceCheck={hash,repo,commit,path,submittedAt:new Date().toISOString()};save();show(state.probe.sourceCheck);
}
else if(command==='probe-read'){
 const address=state.probe?.address;if(!address)throw Error('Bind probe first');
 show(await clients.sponsor.readContract({address,functionName:'get_result',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
}
else if(command==='deploy')await deploy('contract');
else if(command==='bind')await bind('contract',args[0]);
else if(command==='schema'){
 const kind=args[0]||'contract',record=state[kind];if(!record?.address)throw Error('Bind deployment first');
 record.schema=await clients.sponsor.getContractSchema(record.address);save();show(record.schema);
}
else if(command==='receipt')await receipt(args[0]);
else if(command==='payable-probe')await send('sponsor','fund_claim',['CT-NOT-PREPARED'],1n,'refundable-payable-probe');
else if(command==='create'){
 const [claimId,commit]=args;id(claimId,'CT');sha(commit);
 const terms={id:claimId,title:'Empty names are rejected',statement:'For fast and slow modes, allowed("", mode) returns False.',
  scope:'Call allowed with the empty Python string and mode fast or slow, using only the complete pinned file.',
  exclusions:'Do not infer imports or external runtime state.',repo:'Demigodd00/contrary',commit,path:'examples/lineage_fixture.py',deadline:Math.floor(Date.now()/1000)+7200,reward_wei:String(10n**16n)};
 await send('sponsor','create_claim',[JSON.stringify(terms)],0n,'create:'+claimId);
}
else if(command==='fund')await send('sponsor','fund_claim',[id(args[0],'CT')],10n**16n,'fund:'+args[0]);
else if(command==='challenge'){
 const [claimId,mode]=args;id(claimId,'CT');if(!['fast','slow'].includes(mode))throw Error('Choose fast or slow');
 await send('challenger','submit_counterexample',[claimId,`allowed("", "${mode}")`,'False','True',`The ${mode} branch returns True for an empty string in the frozen source.`],10n**15n,'challenge:'+claimId);
}
else if(command==='review')await send('observer','review_counterexample',[id(args[0],'CT')],0n,'review:'+args[0]);
else if(command==='finalize')await send('observer','finalize',[id(args[0],'CT')],0n,'finalize:'+args[0]);
else if(command==='lineage')await send('sponsor','create_lineage',[id(args[0],'CL'),id(args[1],'CT')],0n,'lineage:'+args[0]);
else if(command==='add')await send('sponsor','add_lineage_witness',[id(args[0],'CL'),id(args[1],'CT')],0n,'add:'+args[0]+':'+args[1]);
else if(command==='propose'){
 const [lineage,parent,commit]=args;id(lineage,'CL');sha(commit);
 if(!/^-?\d+$/.test(parent||''))throw Error('Integer parent index required');
 await send('sponsor','propose_revision',[lineage,Number(parent),commit],0n,'propose:'+lineage+':'+commit);
}
else if(command==='check'){
 const [lineage,revision,witness]=args;id(lineage,'CL');
 if(!/^\d+$/.test(revision||'')||!/^\d+$/.test(witness||''))throw Error('Nonnegative indexes required');
 await send('observer','check_revision_witness',[lineage,Number(revision),Number(witness)],0n,'check:'+lineage+':'+revision+':'+witness);
}
else if(command==='finish'){
 const [lineage,revision]=args;id(lineage,'CL');if(!/^\d+$/.test(revision||''))throw Error('Revision index required');
 await send('observer','finalize_revision',[lineage,Number(revision)],0n,'finish:'+lineage+':'+revision);
}
else if(command==='withdraw')await send(args[0]||'sponsor','withdraw',[],0n,'withdraw:'+String(args[0]||'sponsor'));
else if(command==='claim')await read('get_claim',[id(args[0],'CT')]);
else if(command==='attempts')await read('get_attempts',[id(args[0],'CT'),0,20]);
else if(command==='lineage-read')await read('get_lineage',[id(args[0],'CL')]);
else if(command==='revision-read')await read('get_revision',[id(args[0],'CL'),Number(args[1])]);
else if(command==='accounting'){
 const values={};for(const [role,address] of Object.entries(accounts))values[role]=await clients.sponsor.readContract({address:state.contract.address,functionName:'get_accounting',args:[address],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});show(values);
}
else throw Error('Unknown milestone operator command');
