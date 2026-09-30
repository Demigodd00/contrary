import {describe,expect,it} from 'vitest';
import {formatGEN,parseGEN} from '../../src/model.ts';

describe('simulated GEN amounts',()=>{
 it('keeps all eighteen decimals visible to the signer',()=>{
  const amount=parseGEN('0.010000000000000001');
  expect(amount).toBe(10000000000000001n);
  expect(formatGEN(amount)).toBe('0.010000000000000001');
  expect(formatGEN(amount/10n)).toBe('0.001');
 });
 it('rejects amounts outside the contract bounds',()=>{
  expect(()=>parseGEN('0.009')).toThrow();
  expect(()=>parseGEN('1.000000000000000001')).toThrow();
  expect(()=>parseGEN('1.0000000000000000001')).toThrow();
 });
});
