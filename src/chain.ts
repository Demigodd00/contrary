import type {createClient} from 'genlayer-js';
import {TransactionHashVariant,type Hash} from 'genlayer-js/types';
import type {Deployment} from './model.ts';

export interface Provider{request(args:{method:string;params?:unknown[]}):Promise<unknown>;providers?:Provider[];isMetaMask?:boolean;on?(event:string,listener:(value:unknown)=>void):void;removeListener?(event:string,listener:(value:unknown)=>void):void}
export type WalletOption={info:{uuid:string;name:string};provider:Provider};
export type Session={address:`0x${string}`;provider:Provider};
export type Pending={hash:`0x${string}`;method:string;claimId:string;account:string;address:string;submittedAt:number};
const pendingKey='contrary:pending:61999';
let reader:Promise<ReturnType<typeof createClient>>|undefined;
let memoryPending:Pending|null=null;
const getReader=()=>reader??=import('genlayer-js').then(({createClient,chains})=>createClient({chain:chains.studionet}));
const isHash=(value:unknown):value is `0x${string}`=>typeof value==='string'&&/^0x[0-9a-fA-F]{64}$/.test(value);

export function loadPending():Pending|null{try{const raw=localStorage.getItem(pendingKey);if(!raw)return null;const p=JSON.parse(raw) as Pending;return isHash(p.hash)?p:null;}catch{return null;}}
export function discoverWallets(onChange:(wallets:WalletOption[])=>void){
 const found:WalletOption[]=[];
 const announce=(e:Event)=>{const wallet=(e as CustomEvent<WalletOption>).detail;if(wallet?.info?.uuid&&typeof wallet.provider?.request==='function'&&!found.some(item=>item.provider===wallet.provider)){found.push(wallet);onChange([...found]);}};
 window.addEventListener('eip6963:announceProvider',announce);window.dispatchEvent(new Event('eip6963:requestProvider'));
 const timer=setTimeout(()=>{const root=(window as unknown as {ethereum?:Provider}).ethereum;if(root){for(const provider of root.providers||[root])if(!found.some(item=>item.provider===provider))found.push({provider,info:{uuid:'legacy-'+found.length,name:provider.isMetaMask?'MetaMask':'Browser wallet'}});onChange([...found]);}},400);
 return()=>{clearTimeout(timer);window.removeEventListener('eip6963:announceProvider',announce);};
}
export async function connect(wallet:WalletOption):Promise<Session>{
 const {chains}=await import('genlayer-js');const chain=chains.studionet;
 await wallet.provider.request({method:'eth_requestAccounts'});
 if(Number(await wallet.provider.request({method:'eth_chainId'}))!==chain.id){
  try{await wallet.provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x'+chain.id.toString(16)}]});}
  catch(error){if((error as {code?:number}).code!==4902)throw error;await wallet.provider.request({method:'wallet_addEthereumChain',params:[{chainId:'0x'+chain.id.toString(16),chainName:chain.name,nativeCurrency:chain.nativeCurrency,rpcUrls:chain.rpcUrls.default.http,blockExplorerUrls:['https://explorer-studio.genlayer.com']}]});}
 }
 const accounts=await wallet.provider.request({method:'eth_accounts'}) as string[];
 if(!/^0x[0-9a-fA-F]{40}$/.test(accounts?.[0]||''))throw Error('Choose a wallet account.');
 return{address:accounts[0].toLowerCase() as `0x${string}`,provider:wallet.provider};
}
export async function verifySession(session:Session){const accounts=await session.provider.request({method:'eth_accounts'}) as string[];const chain=await session.provider.request({method:'eth_chainId'});if(accounts?.[0]?.toLowerCase()!==session.address||Number(chain)!==61999)throw Error('The wallet account or network changed. Reconnect to StudioNet.');}
export async function loadDeployment():Promise<Deployment>{const response=await fetch('/deployment.json',{cache:'no-store'});if(!response.ok)throw Error('Cannot load the deployment record.');return response.json() as Promise<Deployment>;}
export async function read<T>(deployment:Deployment,method:string,args:unknown[]=[]):Promise<T>{
 if(!deployment.verified||!deployment.address)throw Error('The StudioNet contract has not been verified yet.');
 const client=await getReader();const value=await client.readContract({address:deployment.address as `0x${string}`,functionName:method,args:args as never[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
 return JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v)) as T;
}
export async function verifyDeployment(deployment:Deployment){
 if(!deployment.verified||!/^0x[0-9a-fA-F]{40}$/.test(deployment.address||'')||deployment.chainId!==61999||deployment.network!=='studionet'||deployment.version!=='contrary.v0.2.0'||!/^\w{64}$/.test(deployment.sourceSha256))throw Error('Live signing is unavailable until the contract is verified.');
 const config=await read<{version:string;review_window_seconds:number;attempt_page_limit:number;fee_bps:number}>(deployment,'get_config');
 if(config.version!==deployment.version||config.review_window_seconds!==600||config.attempt_page_limit!==50||config.fee_bps!==0)throw Error('The on-chain policy does not match this release.');
 const code=await(await getReader()).getContractCode(deployment.address as `0x${string}`);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code.replaceAll('\r\n','\n')));
 const hash=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==deployment.sourceSha256)throw Error('The deployed source differs from this release. Signing is blocked.');
}
export function receiptOutcome(receipt:unknown):'pending'|'success'|'error'{
 if(!receipt||typeof receipt!=='object')return'pending';const value=receipt as Record<string,unknown>;
 const status=String(value.statusName??value.status_name??value.status??'').toUpperCase();
 if(['CANCELED','CANCELLED','DROPPED'].includes(status))return'error';if(status!=='FINALIZED')return'pending';
 const consensus=(value.consensusData??value.consensus_data) as Record<string,unknown>|undefined;
 const raw=consensus?.leaderReceipt??consensus?.leader_receipt;
 const lead=(Array.isArray(raw)?[...raw].reverse().find(x=>x?.mode==='leader')??raw.at(-1):raw) as Record<string,unknown>|undefined;
 const result=String(lead?.execution_result??lead?.executionResult??'').toUpperCase();
 const normalized=String(value.txExecutionResultName??value.tx_execution_result_name??'').toUpperCase();
 if(['ERROR','FAILURE','VM_ERROR'].includes(result)||normalized==='FINISHED_WITH_ERROR')return'error';
 return result==='SUCCESS'||normalized==='FINISHED_WITH_RETURN'?'success':'pending';
}
export function withdrawTransferOutcome(parent:unknown,child:unknown,pending:Pending):'pending'|'success'|'transfer_error'{
 const source=parent as Record<string,unknown>,transfer=child as Record<string,unknown>|null;
 const hashes=source.triggeredTransactions??source.triggered_transactions;
 if(!Array.isArray(hashes)||hashes.length!==1||!isHash(hashes[0]))return'transfer_error';
 if(!transfer)return'pending';
 const status=String(transfer.statusName??transfer.status_name??transfer.status??'').toUpperCase();
 if(['CANCELED','CANCELLED','DROPPED'].includes(status))return'transfer_error';
 if(status!=='FINALIZED')return'pending';
 const from=String(transfer.fromAddress??transfer.from_address??transfer.from??'').toLowerCase();
 const to=String(transfer.toAddress??transfer.to_address??transfer.to??'').toLowerCase();
 const credited=transfer.valueCredited??transfer.value_credited;
 const value=transfer.value;
 let positiveValue=false;
 try{positiveValue=value!==undefined&&BigInt(String(value))>0n;}catch{return'transfer_error';}
 return credited===true&&from===pending.address.toLowerCase()&&to===pending.account.toLowerCase()&&positiveValue?'success':'transfer_error';
}
export async function checkPending(pending:Pending){
 const client=await getReader(),receipt=await client.getTransaction({hash:pending.hash as Hash});
 let outcome:ReturnType<typeof receiptOutcome>|'transfer_error'=receiptOutcome(receipt);
 if(outcome==='success'&&pending.method==='withdraw'){
  const record=receipt as unknown as Record<string,unknown>;
  const hashes=record.triggeredTransactions??record.triggered_transactions;
  if(Array.isArray(hashes)&&hashes.length===1&&isHash(hashes[0])){
   try{const child=await client.getTransaction({hash:hashes[0] as Hash});outcome=withdrawTransferOutcome(receipt,child,pending);}catch{outcome='pending';}
  }else outcome='transfer_error';
 }
 if(outcome!=='pending'){const saved=loadPending();if(saved?.hash===pending.hash)localStorage.removeItem(pendingKey);if(memoryPending?.hash===pending.hash)memoryPending=null;}
 return outcome;
}
function message(error:unknown){const record=error as {message?:unknown;code?:number};if(record?.code===4001)return'Wallet request rejected.';if(record?.code===-32002)return'A wallet request is already open. Resolve it before trying again.';return typeof record?.message==='string'?record.message.slice(0,400):'Wallet or network request failed.';}
export async function send(deployment:Deployment,session:Session,method:string,args:unknown[],value:bigint,onPending:(pending:Pending)=>void){
 const counts:Record<string,number>={create_claim:1,submit_counterexample:5,review_counterexample:1,rebut_assessment:2,finalize:1,close_expired:1,recover_unreviewed:1,withdraw:0};
 if(!(method in counts)||args.length!==counts[method]||(!['create_claim','submit_counterexample'].includes(method)&&value!==0n))throw Error('Invalid contract action or value.');
 if(!navigator.locks)throw Error('Use a current browser over HTTPS for wallet signing.');
 return navigator.locks.request('contrary:sign:61999',{ifAvailable:true},async lock=>{
  if(!lock||memoryPending||loadPending())throw Error('A transaction is pending. Check its result before another signature.');
  let requested=false;let known:Pending|undefined;
  const remember=(hash:`0x${string}`)=>{if(known){if(known.hash!==hash)throw Error('Conflicting transaction hashes.');return;}known={hash,method,claimId:method==='create_claim'?JSON.parse(String(args[0])).id:String(args[0]??''),account:session.address,address:deployment.address!,submittedAt:Date.now()};memoryPending=known;localStorage.setItem(pendingKey,JSON.stringify(known));onPending(known);};
  const guarded:Provider={request:async request=>{if(!['eth_sendTransaction','eth_sendRawTransaction','eth_signTransaction'].includes(request.method))return session.provider.request(request);if(requested)throw Error('A second wallet submission was blocked. Check wallet Activity.');requested=true;const result=await session.provider.request(request);if(request.method!=='eth_signTransaction'&&isHash(result))remember(result);return result;}};
  try{
   const active=await loadDeployment();if(active.address!==deployment.address||active.sourceSha256!==deployment.sourceSha256||!active.verified)throw Error('The deployment changed. Reload this page.');
   await verifyDeployment(deployment);await verifySession(session);
   localStorage.setItem(pendingKey+':probe','1');localStorage.removeItem(pendingKey+':probe');
   const {createClient,chains}=await import('genlayer-js');
   const writer=createClient({chain:chains.studionet,account:session.address,provider:guarded as never});
   const hash=await writer.writeContract({address:deployment.address as `0x${string}`,functionName:method,args:args as never[],value});
   if(!isHash(hash))throw Error('The wallet returned no transaction hash.');remember(hash);return known!;
  }catch(error){
   if(known)throw Error(`Transaction ${known.hash} was submitted. Check its result before trying again. ${message(error)}`);
   if(requested)throw Error(`Wallet submission status is unknown. Check wallet Activity before any manual retry. ${message(error)}`);
   throw Error(message(error));
  }
 });
}
