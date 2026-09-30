import {describe,expect,it} from 'vitest';
import {receiptOutcome,withdrawTransferOutcome,type Pending} from '../../src/chain.ts';

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
});
