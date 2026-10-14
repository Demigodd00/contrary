import {describe,expect,it} from 'vitest';
import {receiptOutcome,send,withdrawTransferOutcome,type Pending} from '../../src/chain.ts';
import type {Deployment} from '../../src/model.ts';

const hash='0x'+'a'.repeat(64);
const address='0x'+'1'.repeat(40);
const recipient='0x'+'2'.repeat(40);
const pending:Pending={hash:hash as `0x${string}`,method:'withdraw',claimId:'CT-TEST',account:recipient,address,submittedAt:0};
const parent={statusName:'FINALIZED',consensusData:{leaderReceipt:[{mode:'leader',execution_result:'SUCCESS'}]},triggeredTransactions:[hash]};
const child={statusName:'FINALIZED',fromAddress:address,toAddress:recipient,value:'11000000000000000',valueCredited:true};

describe('transaction settlement',()=>{
 it('waits for finalized successful contract execution',()=>{
  expect(receiptOutcome({statusName:'ACCEPTED',consensusData:parent.consensusData})).toBe('pending');
  expect(receiptOutcome(parent)).toBe('success');
  expect(receiptOutcome({...parent,result_name:'MAJORITY_AGREE'})).toBe('success');
  expect(receiptOutcome({...parent,result_name:'MAJORITY_DISAGREE'})).toBe('error');
  expect(receiptOutcome({...parent,result_name:'NO_MAJORITY'})).toBe('error');
  expect(receiptOutcome({statusName:'FINALIZED',consensusData:{leaderReceipt:[{mode:'leader',execution_result:'ERROR'}]}})).toBe('error');
 });
 it('requires a separate credited withdrawal transfer',()=>{
  expect(withdrawTransferOutcome(parent,child,pending)).toBe('success');
  expect(withdrawTransferOutcome(parent,{...child,statusName:'ACCEPTED'},pending)).toBe('pending');
  expect(withdrawTransferOutcome(parent,{...child,valueCredited:false},pending)).toBe('transfer_error');
  expect(withdrawTransferOutcome(parent,{...child,toAddress:address},pending)).toBe('transfer_error');
  expect(withdrawTransferOutcome(parent,{...child,value:'0'},pending)).toBe('transfer_error');
  expect(withdrawTransferOutcome(parent,{...child,value:'invalid'},pending)).toBe('transfer_error');
  expect(withdrawTransferOutcome({...parent,triggeredTransactions:[]},child,pending)).toBe('transfer_error');
 });
 it('does not send milestone methods to the accepted v0.2 contract',async()=>{
  const old:Deployment={verified:true,address,chainId:61999,network:'studionet',version:'contrary.v0.2.0',sourceSha256:'a'.repeat(64)};
  await expect(send(old,{address:recipient as `0x${string}`,provider:{request:async()=>[]}},'create_lineage',['CL-TEST','CT-TEST'],0n,()=>{})).rejects.toThrow('requires the verified Contrary milestone contract');
 });
});
