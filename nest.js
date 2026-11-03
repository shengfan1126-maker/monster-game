/* 魔物篇｜nest.js：巢穴、存糧、派工、俘虜、聚落、注目度、搬家、討伐戰、關係、邀請入隊、打倒對手。
   所有 .js 共用同一個全域範圍，載入順序見 index.html；改之前先讀 README.md。 */
/* 巢穴：存糧是實際的份數。每天吃掉「人口格數」份；吃光人口掉一格，連吃飽 3 天人口漲一格。 */
const SHARE={F:1,E:3,D:6,C:10,B:15,A:20,S:30};
const needOf=()=>S.nest.pop+(S.npcs?kept().length:0);
const daysOf=()=>Math.floor((S.nest.food||0)/needOf());
const pOfDays=d=>d<=0?1:d<=2?2:d<=6?3:d<=13?4:5;
function nestSync(){
  const n=S.nest; if(n.d>dCap())n.d=dCap(); n.food=Math.max(0,Math.round(n.food||0)); n.p=pOfDays(daysOf());
  const need=n.tags.find(t=>t.t==="需求（食物）");
  if(daysOf()>=3&&need)n.tags=n.tags.filter(t=>t!==need);
  if(daysOf()<1&&!need)n.tags.push({t:"需求（食物）",c:"bad"});
}
function dayChange(notes){
  notes.push(`—— 第 ${S.day} 天 ——`);
  const n=S.nest; dayJobs(notes); raidDay(notes); const need=needOf(), hungry=(n.food||0)<need;
  dayCaptives(notes,hungry);
  if(!hungry){n.food-=need;n.fed=(n.fed||0)+1;
    if(n.fed>=3&&n.pop<POP.length){n.pop++;n.fed=0;notes.push(`${NEST()}連著三天都吃飽了，聚過來的同類變多了。人口：${POP[n.pop-1]}。`)}}
  else{n.food=0;n.fed=0;
    if(n.pop>1){n.pop--;notes.push(`${NEST()}的存糧吃光了，有幾隻餓死或跑了。人口：${POP[n.pop-1]}。`+(n.pop===1?`${NEST()}快散了。`:""))}
    else notes.push(`${NEST()}的存糧吃光了。剩下的同類只能自己找吃的。`)}
  nestSync();
}
const shareOfCorpse=c=>c.small?0:(SHARE[c.lv]||1)*(c.harvested?1:1);
const shareOfItem=n=>EDIBLE_ITEM(n)||/肉/.test(n)?(/精肉|大塊|整/.test(n)?2:1):0;
/* 交給巢穴：屍體或能吃的東西入庫 */
function toNest(names,notes){
  let got=0; const done=[];
  names.forEach(x=>{
    const k=String(x).replace(/的?屍體|殘骸/g,"").trim();
    const j=S.corpses.findIndex(c=>!c.evo&&(c.name===x||cleanName(c.name)===k||(k&&cleanName(c.name).includes(k))));
    if(j>=0){const c=S.corpses[j],v=shareOfCorpse(c);if(!v)return;got+=v;done.push(c.name);S.corpses.splice(j,1);return}
    const i=S.items.findIndex(it=>it===x||it.includes(k)||k.includes(it));
    if(i>=0){const v=shareOfItem(S.items[i]);if(!v)return;got+=v;done.push(S.items[i]);delete S.mat[S.items[i]];S.items.splice(i,1)}
  });
  if(got){S.nest.food=(S.nest.food||0)+got;nestSync();notes.push(`交給巢穴：${done.join("、")}，存糧 +${got} 份（現在 ${S.nest.food} 份，夠吃 ${daysOf()} 天）`)}
  return got;
}
function giveNest(kind,i){
  if(busy||S.dead)return;
  const pre=snap(), notes=[], nm=kind==="c"?S.corpses[i]&&S.corpses[i].name:S.items[i];
  if(!nm)return;
  S.log.push({who:"you",text:`把${nm}交給巢穴`,pre});
  toNest([nm],notes);
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
/* 模型回報巢穴變化 */
const dCap=()=>Math.min(DEF.length,S.nest.pop+2);
function nestChange(c,notes){
  if(!c)return; const n=S.nest;
  if(c.pop){const v=Math.max(-1,Math.min(1,c.pop|0));if(v&&n.pop+v>=1&&n.pop+v<=POP.length){n.pop+=v;notes.push(`巢穴人口：${POP[n.pop-1]}`)}}
  if(c.d){const v=Math.max(-1,Math.min(1,c.d|0));
    if(v>0&&n.d>=dCap())notes.push(`巢穴戰力到頂了（人口${POP[n.pop-1]}，最多「${DEF[dCap()-1]}」）`);
    else if(v>0&&n.dDay===S.day){}
    else if(v&&n.d+v>=1&&n.d+v<=DEF.length){n.d+=v;if(v>0)n.dDay=S.day;notes.push(`巢穴戰力：${DEF[n.d-1]}`)}}
  (c.del||[]).forEach(x=>{const t=n.tags.find(y=>y.t===x||y.t.includes(String(x).replace(/[〔〕]/g,"")));if(t){n.tags=n.tags.filter(y=>y!==t);notes.push(`巢穴標籤〔${t.t}〕拿掉了`)}});
  (c.add||[]).forEach(x=>{const t=typeof x==="string"?{t:x,c:""}:x;if(t&&t.t&&!n.tags.some(y=>y.t===t.t)){n.tags.push({t:String(t.t).replace(/[〔〕]/g,"").slice(0,14),c:t.c==="good"||t.c==="bad"?t.c:""});notes.push(`巢穴多了標籤〔${t.t}〕`)}});
  nestSync();
}
function applyCost(c,notes){
  if(c.hp){S.hp+=c.hp; notes.push(`HP ${c.hp}`)}
  if(c.mp){S.mp=Math.max(0,S.mp+c.mp); notes.push(`MP ${c.mp}`)}
  if(c.tag){addTag(c.tag); notes.push(`【${c.tag}】`)}
  if(c.item){const i=S.items.indexOf(c.item); if(i>=0){delete S.mat[c.item];S.items.splice(i,1);notes.push(`失去 ${c.item}`)}}
  if(c.ally)woundAlly(c.ally,notes);
  if(c.time)advanceTime(c.time,notes);
  checkDeath(notes);
}
const allyLv=()=>GRADES[Math.max(0,gIdx(S.lv)-1)];
/* 角色死了、被趕走、離開：從名單拿掉，記在「不在的人」，敘事者就不會再寫他出場 */
function facHit(d,notes){
  if(S.party.some(p=>p.n===d.name))return;
  for(const [k,f] of Object.entries(S.factions||{})){
    if(f.n>0&&facRe(k).test(d.name+(d.kind||""))){f.n--;
      if(f.n<=0){notes.push(`〈系統〉《大賢者》：「告。${k}已經被你打散了。」`);if(f.tag)S.nest.tags=S.nest.tags.filter(t=>t.t!==f.tag)}
      else if(f.n<=Math.ceil(f.max/3))notes.push(`${k}只剩不多了（約 ${f.n}）。`);
      break}}
}
/* 改名：同伴、巢穴的人、所有記錄一起換，舊名留作別名 */
function renameChar(from,to,notes){
  from=String(from||"").trim(); to=String(to||"").trim().slice(0,10);
  if(!from||!to||from===to||from===S.name)return false;
  const hit=[...S.npcs,...S.party].filter(x=>x.n===from||(x.alias||[]).includes(from));
  if(!hit.length)return false;
  hit.forEach(x=>{const old=x.n;x.alias=[...new Set([...(x.alias||[]),old])].filter(a=>a!==to);x.n=to});
  if(S.fightDelay===from)S.fightDelay=to;
  notes&&notes.push(`〈系統〉《世界之聲》：「${from} 從此叫做 ${to}。」`);
  return true;
}
function npcGone(name,why,notes,force){
  const n=String(name||"").trim(); if(!n||n===S.name)return;
  const had=S.npcs.some(x=>x.n===n)||S.party.some(x=>x.n===n);
  if(!had&&!force)return;
  S.npcs=S.npcs.filter(x=>x.n!==n); S.party=S.party.filter(x=>x.n!==n);
  const g=S.gone.find(x=>x.n===n);
  if(!g)S.gone.push({n,why:String(why||"不在了").slice(0,20),day:S.day});
  else if(force&&why)g.why=String(why).slice(0,20);        // 玩家或敘事者更正原因
  if(had&&notes)notes.push(`${n}${why?`（${why}）`:""}從此不在這裡了。`);
}
/* 聚落／勢力對主角：-2 敵對、-1 警戒、0 中立、1 交易、2 友好、3 同盟 */
const SREL=["敵對","警戒","中立","交易","友好","同盟"];
const SETTLE_KIND=/聚落|營地|城鎮|巢穴|村|商隊/;
const isSettle=n=>{const x=S.world[n];return !!x&&n!==NEST()&&SETTLE_KIND.test(x.kind||"")};
const stOf=n=>{const x=S.world[n];return !x||x.st==null?-1:x.st};
const findSettle=name=>{name=String(name||"");return Object.keys(S.world).find(n=>isSettle(n)&&(n===name||name.includes(n)||n.includes(name)))||null};
function stChange(n,d,why,notes){
  const x=S.world[n]; if(!x)return; d=Math.max(-1,Math.min(1,d|0)); if(!d)return;
  const was=stOf(n), now=Math.max(-2,Math.min(3,was+d)); if(now===was)return;
  x.st=now; notes&&notes.push(`${n}對你：${SREL[was+2]} → ${SREL[now+2]}${why?`（${why}）`:""}`);
}
function addDeal(d,notes){
  const n=findSettle(d.place)||(S.npcs.find(x=>x.n===d.place)||{}).where; const x=n&&S.world[n]; if(!x)return;
  x.deals=x.deals||[];
  if(d.end){const i=x.deals.findIndex(t=>t.includes(d.what)||d.what.includes(t));if(i>=0){notes.push(`和${n}的約定結束了：${x.deals[i]}`);x.deals.splice(i,1)}return}
  if(x.deals.some(t=>t===d.what))return;
  x.deals.push(d.what); if(x.deals.length>5)x.deals.shift(); notes.push(`和${n}約定：${d.what}`);
}
/* 俘虜與約定。俘虜每天吃巢穴一份；餓著或還在戒備的，沒人看守可能逃走。關係到「服從」就達成約定，留下來幫忙。 */
const TECH={"鐵匠":{tag:"工坊",d:1,txt:"可以修補、打造武器和工具"},"機關師":{tag:"陷阱",d:1,txt:"洞口裝了陷阱"},"祭司":{tag:"治療所",txt:"受傷的同伴每天好一級"},"薩滿":{tag:"治療所",txt:"受傷的同伴每天好一級"},
  "盜賊":{tag:"獵手",txt:"每天多 1 份存糧"},"遊俠":{tag:"獵手",txt:"每天多 1 份存糧"},"獵人":{tag:"獵手",txt:"每天多 1 份存糧"},"法師":{tag:"知識",txt:"能教大家認字、幫忙鑑定魔法物品"},
  "商人":{tag:"商路",txt:"交易時對方多給一點"},"戰士":{d:1,txt:"教大家怎麼打"},"野蠻人":{d:1,txt:"教大家怎麼打"}};
const kept=()=>S.npcs.filter(x=>x.where===NEST()&&(x.captive||x.contract)&&!S.party.some(p=>p.n===x.n));
function capture(c,notes){
  if(!c||!c.name||c.name===S.name||S.party.some(p=>p.n===c.name))return;
  let x=S.npcs.find(y=>y.n===c.name);
  if(!x){x={n:c.name,role:c.kind||"人類",lv:c.lv||"F",want:"活下去",knack:c.knack||"",face:c.face||"",secret:"",inst:"",rel:"警戒",r:-1};S.npcs.push(x)}
  x.where=NEST(); x.captive=true; x.contract=false; x.foe=false; if(relOf(x)>0){x.r=0;x.rel="無視"}
  x.cls=c.cls||classOf(c.name)||classOf(x.role)||null; x.since=S.day;
  S.gone=S.gone.filter(g=>g.n!==x.n);
  if(CIVIL_RACE.test(x.role+x.n))heatAdd(1,`有${raceOf(x.role)||"人"}失蹤了`,notes);
  notes.push(`你把${x.n}帶回${NEST()}看管起來（俘虜・每天吃巢穴 1 份存糧）。對你：${REL[relOf(x)+2]}。`);
}
function contract(x,notes){
  if(!x.captive)return; x.captive=false; x.contract=true;
  const t=TECH[x.cls||classOf(x.role)||""];
  notes.push(`${x.n}答應留下來幫忙，換吃住和安全。`);
  if(t){if(t.tag&&!S.nest.tags.some(y=>y.t===t.tag))S.nest.tags.push({t:t.tag,c:"good"});
    if(t.d&&S.nest.d<DEF.length)S.nest.d++;
    notes.push(`${NEST()}${t.tag?`多了〔${t.tag}〕`:""}${t.d?`${t.tag?"，":""}戰力：${DEF[S.nest.d-1]}`:""}（${t.txt}）。`)}
}
/* 注目度：巢穴越大、越常殺人類或當眾吃人，越會被盯上。風聲 → 偵察 → 討伐（討伐隊，倒數）→ 討伐軍。 */
const HEAT=[{n:"沒人注意",at:0},{n:"風聲",at:6},{n:"偵察",at:14},{n:"討伐",at:24},{n:"討伐軍",at:38}];
const HUMAN_TXT=/人類|冒險者|獵人|商隊|商人|騎士|衛兵|村|鎮|公會|旅人|樵夫|礦工|精靈|矮人|半身人/;
const heatLv=()=>{let k=0;HEAT.forEach((h,i)=>{if((S.heat||0)>=h.at)k=i});return k};
const CIVIL_RACE=/人類|冒險者|精靈|矮人|半身人|騎士|衛兵|商人/;
const patrol=()=>S.party.some(p=>!p.with&&p.job==="巡邏"&&!p.tags.includes("重傷"));
function heatAdd(d,why,notes){
  if(!d||S.dead)return; const was=heatLv();
  let cap=60; if(S.raidCool&&S.day<S.raidCool)cap=HEAT[3].at-1;          // 剛打退討伐：一陣子不會再來
  S.heat=Math.max(0,Math.min(cap,(S.heat||0)+d)); if(d>0)S.heatDay=S.day;
  const now=heatLv(); if(notes&&d>0&&why)notes.push(`注目度 +${d}（${why}）`);
  if(now>was){
    const t={1:"山外開始流傳：山裡有一窩不太一樣的哥布林。",2:"〈系統〉《大賢者》：「告。有人在打聽巢穴的位置。之後可能會遇到偵察的冒險者。」",
      3:"〈系統〉《大賢者》：「警告。人類組了討伐隊，正朝巢穴過來。」",4:"〈系統〉《大賢者》：「警告。來的不是討伐隊，是討伐軍。」"}[now];
    notes&&notes.push(t);
    if(now>=3)raidSet(now>=4);
  }
}
function raidSet(army){
  const lv=GRADES[Math.min(GRADES.length-1,gIdx(S.lv)+(army?1:0))];
  const early=patrol()?0:48;
  if(S.raid&&S.raid.army)return;
  if(S.raid&&army){S.raid.army=true;S.raid.lv=lv;S.raid.name="人類的討伐軍";S.raid.size="上百人";S.raid.due=Math.max(S.raid.due,nowH()+7*24-early);return}
  S.raid={name:army?"人類的討伐軍":"冒險者討伐隊",army,lv,size:army?"上百人":"六、七個冒險者",due:nowH()+(army?7:5)*24-early,seen:patrol()};
}
function restoreWith(r){const keep=r&&r.withBefore||[];S.party.forEach(p=>p.with=keep.includes(p.n));}
function raidAdv(){
  const a=[], n=S.nest;
  if(n.d>=4)a.push(`巢穴戰力：${DEF[n.d-1]}`);
  ["陷阱","天然屏障","工坊"].forEach(t=>{if(n.tags.some(x=>x.t===t))a.push(t==="工坊"?"〔工坊〕打的武器":`〔${t}〕`)});
  Object.keys(S.world).filter(k=>isSettle(k)&&stOf(k)>=3).forEach(k=>a.push(`${k}的盟友來幫忙`));
  if(S.party.filter(p=>!p.tags.includes("重傷")).length>=2)a.push("同伴們一起守");
  if(S.raid&&S.raid.seen)a.push("巡邏的提早發現，準備好了");
  return a;
}
function raidDay(notes){
  if(patrol()&&S.raid&&!S.raid.seen){S.raid.seen=true;S.raid.due+=24;notes.push(`巡邏的同伴發現了${S.raid.name}的行蹤：大約 ${Math.ceil((S.raid.due-nowH())/24)} 天後到。`)}
  const n=S.nest; if(n.pop>=4)heatAdd(n.pop>=5?2:1,null,notes);
  if(!S.raid&&heatLv()<3&&S.day-(S.heatDay||0)>=2&&S.heat>0){S.heat=Math.max(0,S.heat-2);S.heatDay=S.day-1}
}
/* 搬家：整窩搬到一個已知的地點。討伐隊會撲空。 */
function moveNest(dest,flee){
  if(busy||!S.world[dest]||dest===NEST())return;
  const pre=snap(), old=NEST(), notes=[], n=S.nest, h=flee?0:(pathHours(S.at,old)||0)+(pathHours(old,dest)||2);
  S.log.push({who:"you",text:flee?`放棄${old}，帶著大家往${dest}逃`:`把巢穴從${old}搬到${dest}`,pre});
  if(h)advanceTime(h,notes);
  const ow=S.world[old], nw=S.world[dest];
  ow.kind="廢棄的巢穴"; ow.note=`以前的巢穴，${flee?"被討伐隊踏平了":"已經搬空了"}。`;
  nw.note=`你們的新巢穴。${nw.kind&&nw.kind!=="巢穴"?`（原本是${nw.kind}：${nw.note||""}）`:""}`.slice(0,60); nw.kind="巢穴"; nw.known=true;
  S.nestAt=dest; n.name=dest; S.at=dest; S.loc=dest;
  n.tags=n.tags.filter(t=>!/天然屏障|禍患|陷阱/.test(t.t));
  if(flee){n.food=0;n.pop=1;n.d=Math.max(1,n.d-2);
    S.npcs.filter(x=>x.where===old&&x.captive).forEach(x=>npcGone(x.n,"在混亂中走散了",notes));
    notes.push(`你們丟下了幾乎所有東西逃出來。存糧沒了，人口：${POP[0]}，戰力：${DEF[n.d-1]}。`)}
  else{const lost=Math.floor((n.food||0)/2);n.food-=lost;if(n.pop>2){n.pop--;notes.push("有幾隻不肯走，留在了老地方。")}
    notes.push(`搬家花了 ${h} 小時。路上帶不動的存糧丟了 ${lost} 份。`)}
  S.npcs.forEach(x=>{if(x.where===old)x.where=dest});
  nestSync();
  if(S.raid){notes.push(`${S.raid.name}撲了個空。他們暫時找不到你們了。`);S.raid=null;S.heat=Math.min(S.heat||0,HEAT[1].at);}
  if((S.chap||1)<4){S.chap=4;notes.push(`〈系統〉《世界之聲》：「第4章・${chapOf().name}」`)}
  S.opts=["看看新巢穴","安頓大家","出去找吃的"]; MV="";
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
let MV="";
/* 討伐戰：在巢穴迎戰，討伐隊 3 階段、討伐軍 5 階段。輸掉過半＝巢穴全滅（遊戲結束，可以撤回）。 */
function startRaid(){
  if(busy||!S.raid)return; const pre=snap(), r=S.raid;
  S.log.push({who:"you",text:`迎戰${r.name}`,pre});
  const notes=[]; if(!inNest()){notes.push(`你聽到消息，拚命趕回${NEST()}。`);S.at=NEST();S.loc=NEST()}
  r.on=true; r.stage=1; r.of=r.army?5:3; r.wins=0; r.fails=0; r.mom=0;
  r.withBefore=S.party.filter(p=>p.with).map(p=>p.n);
  S.party.forEach(p=>{if(!p.tags.includes("重傷"))p.with=true});
  if(notes.length)S.log.push(sysEntry(notes.join("\n")));
  S.opts=[]; save(); doJob({kind:"raid",ctx:{stage:1}},snap(),S.log.length);
}
const RAID_STEPS={3:["前哨和陷阱","洞口攻防","對上帶頭的強者"],5:["遠處的火把和偵察","陷阱與伏擊","洞口攻防","洞裡的混戰","對上統帥"]};
/* 派工：留在巢穴的同伴每天做一件事 */
const JOBS={"":"（沒事）","狩獵":"每天帶回存糧","採集":"有時帶回草藥、燧石之類","看守":"俘虜不會逃走","照顧":"俘虜兩天好一級（最多到服從）","巡邏":"討伐的動向會先知道"};
const GATHER=["草藥","燧石","乾柴","野果","樹脂","獸骨"];
function dayJobs(notes){
  const out=[], n=S.nest, home=S.party.filter(p=>!p.with);
  home.forEach(p=>{if(p.with||!p.job)return; const hurt=p.tags.includes("重傷");
    if(p.job==="狩獵"){if(hurt)return;const g=1+gIdx(p.lv)+(p.tags.includes("負傷")?-1:0);if(g>0){n.food=(n.food||0)+g;out.push(`${p.n}打獵帶回 ${g} 份`)}}
    if(p.job==="採集"&&!hurt&&Math.random()<0.5){const it=rnd(GATHER);receive(it,null);out.push(`${p.n}採回了${it}`)}
  });
  const hunters=kept().filter(x=>x.contract&&TECH[x.cls||""]&&TECH[x.cls||""].tag==="獵手").length;
  if(hunters){n.food=(n.food||0)+hunters;out.push(`〔獵手〕多 ${hunters} 份`)}
  if(n.tags.some(t=>t.t==="治療所"))S.party.forEach(p=>{if(p.tags.includes("負傷")){p.tags=p.tags.filter(t=>t!=="負傷");out.push(`${p.n}的傷在〔治療所〕好了`)}
    else if(p.tags.includes("重傷")){p.tags=p.tags.filter(t=>t!=="重傷");p.tags.push("負傷")}});
  if(out.length)notes.push("巢穴："+out.join("；"));
}
function dayCaptives(notes,hungry){
  const guard=S.party.some(p=>!p.with&&p.job==="看守"&&!p.tags.includes("重傷"));
  const care=S.party.some(p=>!p.with&&p.job==="照顧"&&!p.tags.includes("重傷"));
  S.npcs.filter(x=>x.captive&&x.where===NEST()).forEach(x=>{
    if(hungry){relChange([{name:x.n,d:-1,why:"餓著肚子"}],notes)}
    else if(care){x.care=(x.care||0)+1;if(x.care>=2&&relOf(x)<1){x.care=0;relChange([{name:x.n,d:1,why:"有人照顧他"}],notes)}}
    if(!x.captive)return;
    const r=relOf(x), p=guard?0:r<=-2?0.5:r<=-1?0.25:0;
    if(p&&Math.random()<p)npcGone(x.n,"趁夜逃走了",notes);
  });
}
/* 以物易物的價值 */
const VALUE={F:1,E:2,D:5,C:15,B:50,A:200,S:800};
const valItem=n=>{const m=matOf(n);return m?VALUE[m.lv]||1:1};
const valCorpse=c=>c.small?0:VALUE[c.lv]||1;
/* 關係：-2 敵意、-1 警戒、0 無視、1 服從、2 信賴、3 追隨（到追隨就成為同伴） */
const REL=["敵意","警戒","無視","服從","信賴","追隨"];
const relOf=x=>x.r==null?(x.rel==="追隨"?3:x.rel==="信賴"?2:/服從/.test(x.rel)?1:/警戒/.test(x.rel)?-1:/敵意|輕蔑|記恨/.test(x.rel)?-2:0):x.r;
function relChange(list,notes,force){               // force：OOC 更正，不受一天一級限制
  const seen=new Set();
  (list||[]).filter(c=>c&&c.name&&!seen.has(c.name)&&seen.add(c.name)).forEach(c=>{
    const x=S.npcs.find(y=>y.n===c.name||(y.alias||[]).includes(c.name)); if(!x){const st=findSettle(c.name);if(st)stChange(st,c.d,c.why,notes);return}
    const d=Math.max(-1,Math.min(1,c.d|0)); if(!d)return;
    if(d>0&&x.upDay===S.day&&!c.big&&!force){           // 今天已經好過一級了：慢慢來，但要說出來
      if(relOf(x)<(x.cap==null?3:x.cap))notes.push(`${x.n}今天已經跟你親近過一級了，關係明天才會再變好（現在：${REL[relOf(x)+2]}）。`);return}
    const was=relOf(x), cap=x.cap==null?3:x.cap, now=Math.max(-2,Math.min(cap,was+d));
    if(now===was){if(d>0&&was>=cap)notes.push(`${x.n}對你的態度不會再更好了。`);return}
    x.r=now; x.rel=REL[now+2]; if(d>0)x.upDay=S.day;
    notes.push(`${x.n}對你：${REL[was+2]} → ${x.rel}${c.why?`（${c.why}）`:""}`);
    if(x.captive&&now>=1)contract(x,notes);
    if(now>=3&&!S.party.some(p=>p.n===x.n))recruit({name:x.n,kind:raceOf(x.role)||"哥布林",knack:x.knack,note:x.face},notes);
  });
}
function recruit(r,notes){
  if(!r||!r.name||r.name===S.name||S.party.some(p=>p.n===r.name))return;
  const npc=S.npcs.find(x=>x.n===r.name);
  const p={n:r.name,kind:r.kind||"哥布林",lv:allyLv(),knack:r.knack||(npc&&npc.knack)||"",note:r.note||(npc&&npc.face)||"",skills:[],tags:[],with:S.party.filter(x=>x.with).length<2};
  S.party.push(p); if(npc)npc.rel="追隨";
  notes&&notes.push(`〈系統〉《世界之聲》：「${p.n} 成為你的同伴。」${p.with?"":`（同行已滿兩名，牠先留在${NEST()}）`}`);
}
function woundAlly(n,notes){
  const p=S.party.find(x=>x.n===n); if(!p)return;
  if(p.tags.includes("負傷")||p.tags.includes("重傷")){p.tags=p.tags.filter(t=>t!=="負傷");if(!p.tags.includes("重傷"))p.tags.push("重傷");p.with=false;notes.push(`${n}傷得太重，退出了這次行動（【重傷】，回${NEST()}養傷）`)}
  else{p.tags.push("負傷");notes.push(`${n}【負傷】`)}
}
/* 邀請入隊：玩家點名邀請、對方信賴以上就加入；還不夠就說出來 */
const INVITE=/同伴|夥伴|伙伴|跟我走|跟著我|跟着我|加入|一起走|跟我來|跟我来|追隨|追随|跟隨|跟随/;
function invite(text,notes){
  text=String(text||""); if(!INVITE.test(text))return;
  S.npcs.filter(x=>!S.party.some(p=>p.n===x.n)&&(!x.where||x.where===S.at)&&[x.n,...(x.alias||[])].some(n=>text.includes(n))).slice(0,2).forEach(x=>{
    if(x.foe){notes.push(`${x.n}是你的對手，不會成為同伴。`);return}
    if(x.captive||relOf(x)<2){notes.push(`${x.n}對你還只是「${REL[relOf(x)+2]}」，要到「信賴」才會答應跟你走。`);return}
    {const k=notes.findIndex(t=>t.startsWith(`${x.n}今天已經跟你親近過`));if(k>=0)notes.splice(k,1)}
    x.r=3; x.rel="追隨"; recruit({name:x.n,kind:raceOf(x.role)||"哥布林",knack:x.knack,note:x.face},notes);
  });
}
const FIGHT=/打倒|擊倒|擊殺|殺|攻擊|偷襲|突襲|撲|獵|戰|刺|咬|砍|砸|打|揍|宰|捕|制伏|壓制/;
const sameFoe=(a,b)=>{a=cleanName(a);b=cleanName(b);return !!a&&!!b&&(a===b||a.includes(b)||b.includes(a))};
/* 打倒對手：留屍體（或沒死）、存在值、勢力、注目度 */
function applyDefeat(d,notes,big,won){
  if(d.dead!==false){S.corpses.push({name:d.name,sp:speciesOf(d.name,d.kind),lv:d.lv,t:nowH(),big:!!big,cls:d.cls||classOf(d.name)||null});
    notes.push(`${d.name}倒下了，屍體還是熱的。`); gainExist(d.lv,notes,d.cls?1:0);
    {const k=Math.min(3,won||0), sp=speciesOf(d.name,d.kind);for(let j=0;j<k;j++)S.corpses.push({name:sp,sp,lv:d.lv,t:nowH()});if(k)notes.push(`前面打倒的 ${k} 隻${sp}也在地上。`)}
    npcGone(d.name,"被你殺死",null); facHit(d,notes); if(CIVIL_RACE.test(d.name+(d.kind||"")))heatAdd(2,`殺了${cleanName(d.name)}`,notes)}
  else{notes.push(`你打敗了${d.name}。牠還活著。`); gainExist(d.lv,notes,d.cls?1:0); facHit(d,notes)}
  S.lastFoe=null;
}
function gainExist(lv,notes,bonus,why){
  if(S.exist>=existMax(S.lv)){notes.push(`存在值已滿（${S.exist}/${existMax(S.lv)}），不會再增加——先去打進化戰。`);return}
  const g=existGain(lv)+(bonus||0);
  if(!g){notes.push("對手比你弱，存在值沒有增加。");return}
  S.exist=Math.min(existMax(S.lv),S.exist+g);
  notes.push(`存在值 +${g}${bonus?`（${why||"小頭目"} +${bonus}）`:""}（${S.exist}/${existMax(S.lv)}）`);
  if(S.exist>=existMax(S.lv)&&!S.evo&&!S.war){S.evo=newEvo();evoAnnounce(notes)}
}
const nextLv=()=>GRADES[Math.min(GRADES.length-1,gIdx(S.lv)+1)];
const hStr=h=>`第${Math.floor(h/24)}天 ${pad2(h%24)}:00`;
function newEvo(){
  const tgt=nextLv(), list=(FOES[tgt]||FOES.C).filter(f=>!(S.beaten||[]).includes(f.name)&&!(f.nest&&(S.chief||S.gone.some(g=>g.n===f.name))));
  const nest=list.filter(f=>f.nest), rest=list.filter(f=>!f.nest).sort(()=>Math.random()-0.5);
  return {cands:[...nest.slice(0,1),...rest].slice(0,3).map(f=>({...f,lv:tgt})),due:nowH()+48,forced:null};
}
function evoAnnounce(notes){
  notes.push("〈系統〉《大賢者》：「告。存在值已滿。需進行進化戰。」");
  notes.push(`〈系統〉《大賢者》：「附近的候選對手：${S.evo.cands.map(f=>`${f.name}（${f.kind}・${f.lv}級・${f.where}）`).join("、")}。期限：${hStr(S.evo.due)}。逾期，其中一名會主動找上門。」`);
}
