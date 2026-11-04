/* v7 hero: living office loop. Edit AGENTS and SCRIPT to swap copy. */
(()=>{
const AGENTS=[
 {id:'shuki',n:'Shuki',r:'Chief of Staff',c:'#d4ff3a',a:'routing today\'s tasks'},
 {id:'des',n:'Designer',r:'Design',c:'#ff6a4d',a:'exporting hero v2'},
 {id:'eng',n:'Engineer',r:'Build',c:'#4ff0ff',a:'building pricing page'},
 {id:'rui',n:'Rui',r:'Research',c:'#ffb020',a:'reading sources'},
 {id:'kit',n:'Kit',r:'Analyst',c:'#b49bff',a:'pulling last month'}];
const ME={id:'me',n:'You',r:'Manager',c:'#f4f6fb',a:'just dropped in'};
// [delay ms, who, text, mode]  mode: say (bubble) | act (status update) | join | hand | speak
const SCRIPT=[
 [150,'des','','hand'],[300,'des','hero v2 uploaded','say'],[1000,'shuki','routing to Engineer','say'],[1700,'eng','on it','say'],
 [2400,'rui','found competitor pricing pages','say'],[2600,'rui','summarizing pricing pages','act'],[3100,'kit','churn moved this week, writing it up','say'],
 [3900,'eng','building pricing table','act'],[4300,'me','','join'],[5000,'me','Designer, why didn\'t we finish this?','speak'],
 [6400,'des','','hand'],[6900,'des','Waiting on final copy. I can ship with the draft copy.','speak'],
 [8600,'shuki','I\'ll get copy to you next.','say'],[9300,'eng','Then I can ship it.','say'],[10200,'me','Do it.','speak'],[11600,null,'','reset']];
const $=s=>document.querySelector(s),G=$('[data-grid]'),CAP=$('[data-cap]'),CNT=$('[data-cnt]');if(!G)return;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const tile=a=>`<div class="ct" data-id="${a.id}" style="--c:${a.c}"><span class="cav">${a.n[0]}</span><span class="hnd">Hand raised</span><span class="bub"></span><span class="cn">${a.n}<small>${a.r}</small></span><span class="cs"><i class="ld"></i><span data-act>${a.a}</span></span></div>`;
let T=[];
function build(){G.innerHTML=tile(ME).replace('class="ct"','class="ct me slot"')+AGENTS.map(tile).join('');CAP.innerHTML='';CNT.textContent=AGENTS.length+' agents, working';}
function el(id){return G.querySelector(`[data-id="${id}"]`)}
function bubble(id,txt){const e=el(id);if(!e)return;const b=e.querySelector('.bub');b.textContent=txt;e.classList.remove('talk');void e.offsetWidth;e.classList.add('talk');}
function step([d,who,txt,mode]){
 if(mode==='reset')return run();
 const e=who&&el(who);
 if(mode==='say'){bubble(who,txt)}
 else if(mode==='act'){e.querySelector('[data-act]').textContent=txt;e.classList.add('upd');setTimeout(()=>e.classList.remove('upd'),600)}
 else if(mode==='join'){el('me').classList.remove('slot');el('me').classList.add('pop');CNT.textContent='You + '+AGENTS.length+' agents';}
 else if(mode==='hand'){e.classList.add('raised')}
 else if(mode==='speak'){G.querySelectorAll('.speak').forEach(x=>x.classList.remove('speak'));e.classList.add('speak');const n=who==='me'?'You':AGENTS.find(a=>a.id===who).n;CAP.innerHTML=`<b>${n}:</b> "${txt}"`;CAP.classList.remove('in');void CAP.offsetWidth;CAP.classList.add('in');if(who!=='me')bubble(who,txt)}
}
function run(){T.forEach(clearTimeout);T=[];build();if(RM){SCRIPT.slice(0,-1).forEach(step);return}SCRIPT.forEach(s=>T.push(setTimeout(()=>step(s),s[0])))}
run();
})();
