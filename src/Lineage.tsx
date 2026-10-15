import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,ArrowUpRight,RefreshCw,ShieldCheck} from 'lucide-react';
import {read,send,type Pending,type Session} from './chain.ts';
import {date,short,type Deployment,type Lineage as LineageRecord,type Revision} from './model.ts';
import './lineage.css';

const explorer='https://explorer-studio.genlayer.com';
const repo='https://github.com/Demigodd00/contrary';
const milestoneSource=`${repo}/blob/3958800b1a8fc74d44527254d33be9a23db09525/contracts/contrary.py`;
const proofManifest=`${repo}/blob/codex/contrary-regression-ledger/deployments/contrary_milestone_v12_proof.json`;
const finalizationProof:Record<string,string>={
 'a92a7f58b7e5645273fee4b63772f86c153c5be1':'0xd1505236dc30c71ed45a1953ca248e7cc71fa98bcee0339afcd0f0ecd853c87b',
 '78e3002567cf91206f586eb63f7ac2a652630e94':'0x45053fb6ec95c3b63c7672e6dd13d8ade5168284549e353fbbed14dd3fe84688',
};
const msg=(value:unknown)=>value instanceof Error?value.message:String(value);

type Props={deployment:Deployment|null;session:Session|null;pending:Pending|null;onConnect:()=>void;onPending:(pending:Pending)=>void;onNotice:(notice:string)=>void};

export default function Lineage({deployment,session,pending,onConnect,onPending,onNotice}:Props){
 const active=deployment?.verified&&deployment.version==='contrary.v1.2.0';
 const [rows,setRows]=useState<LineageRecord[]>([]);
 const [selected,setSelected]=useState<LineageRecord|null>(null);
 const [revisions,setRevisions]=useState<Revision[]>([]);
 const [selectedId,setSelectedId]=useState(()=>new URLSearchParams(window.location.search).get('lineage')||'');
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [now,setNow]=useState(()=>Math.floor(Date.now()/1000));

 const refresh=useCallback(async(id=selectedId)=>{
  if(!active||!deployment)return;
  setLoading(true);
  try{
   const all=await read<LineageRecord[]>(deployment,'list_lineages',[0,50]);
   setRows(all);
   if(id){
    const detail=await read<LineageRecord>(deployment,'get_lineage',[id]);
    const versions=await Promise.all(Array.from({length:detail.revision_count},(_,i)=>read<Revision>(deployment,'get_revision',[id,i])));
    setSelected(detail);setRevisions(versions);
   }else{setSelected(null);setRevisions([]);}
   setError('');
  }catch(e){setError(msg(e));}finally{setLoading(false);}
 },[active,deployment,selectedId]);

 useEffect(()=>{const timer=window.setInterval(()=>setNow(Math.floor(Date.now()/1000)),5000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{if(!pending)void refresh();},[pending,refresh]);

 function select(id:string){setSelectedId(id);history.replaceState({},'',id?`/?view=lineage&lineage=${encodeURIComponent(id)}`:'/?view=lineage');window.scrollTo({top:0,behavior:'smooth'});}
 async function action(method:string,args:unknown[]){
  if(!active||!deployment)throw Error('The versioned ledger is not deployed yet.');
  if(!session){onConnect();throw Error('Connect a StudioNet wallet to sign this action.');}
  if(pending)throw Error('A transaction is already pending.');
  setBusy(true);setError('');
  try{await send(deployment,session,method,args,0n,onPending);onNotice('Transaction submitted. Wait for finalized execution before refreshing the ledger.');}
  catch(e){setError(msg(e));throw e;}finally{setBusy(false);}
 }
 async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);try{await action('create_lineage',[String(data.get('lineage')||'').trim().toUpperCase(),String(data.get('claim')||'').trim().toUpperCase()]);}catch{/* Error shown above. */}}
 async function addWitness(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;const data=new FormData(e.currentTarget);try{await action('add_lineage_witness',[selected.id,String(data.get('claim')||'').trim().toUpperCase()]);}catch{/* Error shown above. */}}
 async function propose(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;const data=new FormData(e.currentTarget);try{await action('propose_revision',[selected.id,Number(data.get('parent')),String(data.get('commit')||'').trim().toLowerCase()]);}catch{/* Error shown above. */}}
 const disabled=busy||!!pending||!active;

 return <section className="lineage-page">
  <div className="lineage-hero"><div><span className="kicker">CONTRARY V1 · MILESTONE</span><h1>Known failures should<br/><em>follow the code.</em></h1><p>When a counterexample is proven, it becomes a permanent obligation. A new source revision can claim to clear known cases only after GenLayer validators recheck every frozen input.</p><div className="lineage-links"><a href={milestoneSource} target="_blank" rel="noreferrer">Pinned v1.2 source <ArrowUpRight size={15}/></a><a href={proofManifest} target="_blank" rel="noreferrer">Recorded proof <ArrowUpRight size={15}/></a>{active&&<a href={`${explorer}/address/${deployment.address}`} target="_blank" rel="noreferrer">StudioNet contract <ArrowUpRight size={15}/></a>}</div></div><div className="lineage-invariant"><ShieldCheck size={24}/><strong>One invariant</strong><p>A patch cannot erase a proven counterexample by changing the claim, hiding a branch, or leaving an inherited witness unchecked.</p><small>“Known cases cleared” does not mean bug-free.</small></div></div>
  {!active&&<div className="lineage-unreleased"><strong>Milestone build in progress.</strong> The accepted Contrary v0.2 claim flow remains live. This ledger will accept signatures only after its new StudioNet source and deployment are verified.</div>}
  {error&&<div className="lineage-error" role="alert">{error}</div>}
  <div className="lineage-heading"><div><span className="kicker">PUBLIC RECORD</span><h2>Versioned ledgers<span className="title-dot">.</span></h2></div><button className="subtle-button" disabled={!active||loading} onClick={()=>void refresh()}><RefreshCw size={15}/> Refresh</button></div>
  {!selected&&<><div className="lineage-grid">{rows.map(item=><button key={item.id} className="lineage-card" onClick={()=>select(item.id)}><span>{item.id}</span><h3>{item.statement}</h3><p>{item.witness_ids.length} frozen counterexample{item.witness_ids.length===1?'':'s'} · {item.revision_count} revision{item.revision_count===1?'':'s'}</p><small>{item.repo}/{item.path}</small></button>)}</div>{!rows.length&&<div className="lineage-empty">{active?'No versioned ledger has been opened yet.':'Live ledgers will appear here after the milestone contract is deployed.'}</div>}<div className="lineage-action-card"><h3>Start a ledger</h3><p>The sponsor can attach a proven claim from this milestone contract. Witnesses must share the same frozen claim and source.</p><form onSubmit={create}><label>Ledger ID<input name="lineage" required pattern="CL-[A-Za-z0-9-]{3,37}" placeholder="CL-EMPTY-NAMES"/></label><label>Proven claim ID<input name="claim" required placeholder="CT-FAST-EMPTY"/></label><button className="button dark" disabled={disabled}>Create ledger <ArrowRight size={16}/></button></form></div></>}
  {selected&&<><button className="lineage-back" onClick={()=>select('')}>← All ledgers</button><div className="lineage-detail"><div><span className="kicker">{selected.id}</span><h2>{selected.statement}</h2><p><strong>Scope:</strong> {selected.scope}</p><p><strong>Exclusions:</strong> {selected.exclusions}</p><p><strong>Witnesses:</strong> {selected.witness_ids.map((id,i)=><span key={id}>{i?', ':''}<a href={`/?claim=${encodeURIComponent(id)}`}>{id}</a></span>)}</p><p><strong>Baseline:</strong> <a href={`https://github.com/${selected.repo}/blob/${selected.base_commit}/${selected.path}`} target="_blank" rel="noreferrer">{short(selected.base_commit)} ↗</a> · SHA-256 {short(selected.base_source_sha256)}</p></div><span className="lineage-count">{revisions.length} revisions</span></div>
    {!selected.sealed&&<div className="lineage-action-card"><h3>Add another proven counterexample</h3><p>Up to four claims with identical frozen terms and source can join before the first revision. The set then seals permanently.</p><form onSubmit={addWitness}><label>Proven claim ID<input name="claim" required placeholder="CT-SLOW-EMPTY"/></label><button className="button dark" disabled={disabled}>Add witness <ArrowRight size={16}/></button></form></div>}
    <div className="lineage-action-card"><h3>Propose a source revision</h3><p>The sponsor supplies a full Git commit that directly descends from the selected parent. The contract captures the same file and fixes the witness list.</p><form onSubmit={propose}><label>Parent<select name="parent" defaultValue="-1"><option value="-1">Baseline · {short(selected.base_commit)}</option>{revisions.filter(r=>r.status!=='CHECKING').map(r=><option value={r.index} key={r.index}>Revision {r.index+1} · {short(r.commit)}</option>)}</select></label><label>Full child commit SHA<input name="commit" required pattern="[0-9a-fA-F]{40}" placeholder="40-character Git commit"/></label><button className="button dark" disabled={disabled||selected.revision_count>=12}>Propose revision <ArrowRight size={16}/></button></form></div>
    <div className="lineage-heading"><div><span className="kicker">BRANCH-LOCAL HISTORY</span><h2>Source revisions<span className="title-dot">.</span></h2></div></div>
    {!revisions.length&&<div className="lineage-empty">No revisions yet. The proven counterexamples remain in the ledger.</div>}
    {revisions.map(revision=><article className="lineage-revision" key={revision.index}><div className="lineage-revision-top"><div><small>REVISION {revision.index+1} · PARENT {revision.parent_index<0?'BASELINE':`REVISION ${revision.parent_index+1}`}</small><h3>{revision.status==='KNOWN_CASES_CLEARED'?'Known cases cleared':revision.status==='BLOCKED'?'Certification blocked':'Witness checks pending'}</h3></div><span className={`lineage-badge ${revision.status==='KNOWN_CASES_CLEARED'?'clear':revision.status==='BLOCKED'?'blocked':''}`}>{revision.status.replaceAll('_',' ')}</span></div><p><a href={`https://github.com/${selected.repo}/blob/${revision.commit}/${selected.path}`} target="_blank" rel="noreferrer">View pinned source {short(revision.commit)} ↗</a> · SHA-256 {short(revision.source_sha256)}{selected.id==='CL-M2-EMPTY-001'&&finalizationProof[revision.commit]&&<> · <a href={`${explorer}/tx/${finalizationProof[revision.commit]}`} target="_blank" rel="noreferrer">Recorded finalization tx ↗</a></>}</p><div className="lineage-checks">{revision.checks.map((check,index)=><div className="lineage-check" key={index}><div><strong>{revision.witness_ids[index]}</strong><span>{check.status.replaceAll('_',' ')}</span></div>{check.quote&&<blockquote>{check.quote}</blockquote>}{check.status==='PENDING'&&revision.status==='CHECKING'&&now<revision.check_deadline&&<button disabled={disabled} onClick={()=>void action('check_revision_witness',[selected.id,revision.index,index]).catch(()=>{})}>Ask validators to check this witness <ArrowRight size={14}/></button>}</div>)}</div>{revision.status==='CHECKING'&&<div className="lineage-revision-bottom"><small>Unchecked cases become UNCLEAR after {date(revision.check_deadline)}.</small><button disabled={disabled||(!revision.checks.every(c=>c.status!=='PENDING')&&now<revision.check_deadline)} onClick={()=>void action('finalize_revision',[selected.id,revision.index]).catch(()=>{})}>Finalize revision</button></div>}<details className="lineage-source"><summary>Read complete frozen source ({revision.source_bytes} bytes)</summary><pre>{revision.source}</pre></details></article>)}
   </>}
  <p className="lineage-footnote">Validators independently fetch the complete pinned file and evaluate each unchanged input with a restricted, side-effect-free Python interpreter. Unsupported syntax is unclear; a cleared case does not prove there are no other defects. StudioNet GEN is simulated.</p>
 </section>;
}
