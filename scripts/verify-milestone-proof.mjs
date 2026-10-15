// Read-only live verifier. No account, key, wallet, or writes are used.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient,chains} from 'genlayer-js';
import {TransactionHashVariant} from 'genlayer-js/types';

const root=new URL('../',import.meta.url);
const proof=JSON.parse(fs.readFileSync(new URL('deployments/contrary_milestone_v12_proof.json',root),'utf8'));
const client=createClient({chain:chains.studionet});
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const digest=value=>crypto.createHash('sha256').update(value.replaceAll('\r\n','\n')).digest('hex');
const source=execFileSync('git',['show',`${proof.sourceCommit}:contracts/contrary.py`],{cwd:root,encoding:'utf8'});
assert(digest(source)===proof.sourceSha256,'Pinned Git source hash mismatch');
assert(source.startsWith(`# { "Depends": "${proof.runner}" }`),'Runner mismatch');
assert(Number(await client.request({method:'eth_chainId'}))===proof.chainId,'Wrong chain');
const onchain=await client.getContractCode(proof.contract);
assert(digest(onchain)===proof.sourceSha256,'On-chain source hash mismatch');
const config=await client.readContract({address:proof.contract,functionName:'get_config',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
assert(config.version===proof.version&&config.max_lineage_witnesses===4,'Contract configuration mismatch');

const standard=['deploy','reviewFast','reviewSlowRetry','finalizeFast','finalizeSlow','createLineage','addSlowWitness','proposePartial','checkPartialFast','checkPartialSlow','finalizePartial','proposeFull','checkFullFast','checkFullSlow','finalizeFull','withdrawChallenger'];
if(process.argv.includes('--all'))standard.push(...Object.keys(proof.transactions).filter(key=>!standard.includes(key)&&!['reviewSlowDisagreed','sponsorWeiTransfer','challengerTransfer'].includes(key)));
for(const key of standard){
 const tx=await client.getTransaction({hash:proof.transactions[key]});
 const leaders=tx.consensusData?.leaderReceipt??tx.consensus_data?.leader_receipt??[];
 const leader=Array.isArray(leaders)?[...leaders].reverse().find(item=>item.mode==='leader')??leaders.at(-1):leaders;
 assert(String(tx.statusName??tx.status_name).toUpperCase()==='FINALIZED',`${key}: not finalized`);
 assert((tx.result_name??tx.resultName)==='MAJORITY_AGREE',`${key}: validator disagreement`);
 assert((leader?.execution_result??leader?.executionResult)==='SUCCESS',`${key}: execution not successful`);
 console.log(`${key}: FINALIZED / MAJORITY_AGREE / SUCCESS`);
}
const disagreement=await client.getTransaction({hash:proof.transactions.reviewSlowDisagreed});
assert(String(disagreement.statusName??disagreement.status_name).toUpperCase()==='FINALIZED'&&disagreement.result_name==='MAJORITY_DISAGREE','Disagreed review record mismatch');
console.log('reviewSlowDisagreed: FINALIZED / MAJORITY_DISAGREE (no credited state)');

const read=(functionName,args)=>client.readContract({address:proof.contract,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
for(const claimId of proof.claims){const claim=await read('get_claim',[claimId]);assert(claim.status==='PROVEN',`${claimId}: not PROVEN`);}
const lineage=await read('get_lineage',[proof.lineage]);
assert(lineage.sealed&&lineage.revision_count===2&&JSON.stringify(lineage.witness_ids)===JSON.stringify(proof.claims),'Lineage witness set mismatch');
for(const [index,name] of [[0,'partial'],[1,'full']]){
 const actual=await read('get_revision',[proof.lineage,index]);
 const expected=proof.finalReadback[name];
 assert(actual.commit===expected.commit&&actual.status===expected.status,`${name}: final status or commit mismatch`);
 assert(actual.checks.every((item,i)=>item.status===expected.checks[i]&&item.line===expected.lines[i]),`${name}: witness result mismatch`);
 if(index===1)assert(actual.parent_index===expected.parentIndex,'Full fix does not descend from partial');
 console.log(`${name}: ${actual.status} / ${actual.checks.map(item=>item.status).join(', ')}`);
}
for(const [key,value] of [['sponsorWeiTransfer','1'],['challengerTransfer','22000000000000000']]){
 const tx=await client.getTransaction({hash:proof.transactions[key]});
 assert(String(tx.statusName??tx.status_name).toUpperCase()==='FINALIZED'&&String(tx.value)===value&&(tx.valueCredited??tx.value_credited)===true,`${key}: outbound value not credited`);
 console.log(`${key}: FINALIZED / valueCredited / ${value} wei`);
}
const transfer=await client.getTransaction({hash:proof.transactions.challengerTransfer});
const challenger=String(transfer.toAddress??transfer.to_address).toLowerCase();
const accounting=await read('get_accounting',[challenger]);
for(const [key,value] of Object.entries(proof.finalReadback.challengerAccounting))assert(String(accounting[key])===value,`Challenger accounting ${key} mismatch`);
console.log('Challenger accounting reconciled. Milestone proof verified.');

const release=JSON.parse(fs.readFileSync(new URL('deployments/contrary_milestone_v12.json',root),'utf8'));
assert(release.browserWalletSignatureVerified===true,'Browser wallet release gate is not recorded');
const browser=release.browserWalletWrite;
const browserTx=await client.getTransaction({hash:browser.transactionHash});
const browserLeaders=browserTx.consensusData?.leaderReceipt??browserTx.consensus_data?.leader_receipt??[];
const browserLeader=Array.isArray(browserLeaders)?[...browserLeaders].reverse().find(item=>item.mode==='leader')??browserLeaders.at(-1):browserLeaders;
assert(String(browserTx.statusName??browserTx.status_name).toUpperCase()==='FINALIZED','Browser wallet write is not finalized');
assert((browserTx.result_name??browserTx.resultName)==='MAJORITY_AGREE','Browser wallet write lacks validator agreement');
assert((browserLeader?.execution_result??browserLeader?.executionResult)==='SUCCESS','Browser wallet write failed execution');
assert(String(browserTx.fromAddress??browserTx.from_address).toLowerCase()===browser.account.toLowerCase(),'Browser wallet sender mismatch');
assert(String(browserTx.toAddress??browserTx.to_address).toLowerCase()===release.address.toLowerCase(),'Browser wallet target mismatch');
const browserClaim=await read('get_claim',[browser.claimId]);
assert(browserClaim.id===browser.claimId&&browserClaim.status===browser.claimStatus,'Browser wallet claim readback mismatch');
assert(browserClaim.sponsor.toLowerCase()===browser.account.toLowerCase(),'Browser wallet claim sponsor mismatch');
assert(browserClaim.reward===browser.rewardWei&&browserClaim.source_sha256===browser.sourceSha256,'Browser wallet claim terms mismatch');
console.log(`browserWalletCreateClaim: FINALIZED / MAJORITY_AGREE / SUCCESS / ${browserClaim.status} (unfunded)`);
