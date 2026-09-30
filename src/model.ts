export type Verdict='PROVEN'|'REJECTED'|'INCONCLUSIVE';
export type Status='OPEN'|'REVIEW_READY'|'REVIEW_PENDING'|'PROVEN'|'CLOSED';
export type Assessment={kind:'initial'|'rebuttal';at:number;result:{scope:string;proof:string;quote:string;reason:string;outcome:Verdict}};
export type Attempt={challenger:string;stake:string;sample_input:string;expected:string;alleged_result:string;argument:string;submitted_at:number;review_by:number;status:string;assessments:Assessment[];rebuttal_used:boolean;rebuttal:string;challenge_until:number;finalized_at:number};
export type Claim={id:string;title:string;statement:string;scope:string;exclusions:string;repo:string;repository_id:number;commit:string;path:string;source?:string;source_sha256:string;source_bytes:number;sponsor:string;reward:string;created_at:number;deadline:number;status:Status;attempts?:Attempt[];recipient:string;settled_at:number};
export type Accounting={deposited:string;locked:string;credited:string;withdrawn:string;claimable:string};
export type Deployment={verified:boolean;address:string|null;chainId:number;network:'studionet';version:string;sourceSha256:string};
export function parseGEN(value:string){
 if(!/^\d+(\.\d{1,18})?$/.test(value))throw Error('Enter a GEN amount with at most 18 decimal places.');
 const [whole,fraction='']=value.split('.');const amount=BigInt(whole)*10n**18n+BigInt(fraction.padEnd(18,'0'));
 if(amount<10n**16n||amount>10n**18n)throw Error('Use 0.01 to 1 simulated GEN.');
 return amount;
}
export function formatGEN(value:string|bigint){const n=BigInt(value),whole=n/10n**18n,fraction=(n%10n**18n).toString().padStart(18,'0').replace(/0+$/,'');return `${whole}${fraction?'.'+fraction.slice(0,6):''}`;}
export function short(value:string){return value.length>20?value.slice(0,8)+'…'+value.slice(-6):value;}
export function date(value:number){return new Date(value*1000).toLocaleString();}
