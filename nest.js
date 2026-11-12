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
  if((S.usedSk||[]).length){S.usedSk=[];notes.push("技能和魔法物品的力量都恢復了。")}
  S.allyUsed=0; S.healDay=null;
  if(S.alone){kingDay(notes);wormDay(notes);return}          // v0.52：小丑王第三項之後沒有巢穴
  const n=S.nest; dayJobs(notes); domDay(notes); facDay(notes); nestHeatDay(notes); raidDay(notes); kingDay(notes); wormDay(notes); const need=needOf(), hungry=(n.food||0)<need;
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
  let got=0; const done=[]; if(S.alone)return 0;
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
  if(busy||S.dead||S.alone)return;
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
  if(S.alone){notes.push(`你沒有巢穴，沒地方關${c.name}。`);return}
  let x=S.npcs.find(y=>y.n===c.name);
  if(!x){x={n:c.name,role:c.kind||"人類",lv:c.lv||"F",want:"活下去",knack:c.knack||"",face:c.face||"",secret:"",inst:"",rel:"警戒",r:-1};S.npcs.push(x)}
  x.where=NEST(); x.captive=true; x.contract=false; x.foe=false; x.r=-2; x.rel="敵意";   // v0.46：俘虜一律從敵意開始
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
  if(S.alone)return;
  const lv=GRADES[Math.min(GRADES.length-1,gIdx(S.lv)+(army?1:0))];
  const early=patrol()?0:48;
  if(S.raid&&(S.raid.army||S.raid.king))return;
  if(S.raid&&army){S.raid.army=true;S.raid.lv=lv;S.raid.name="人類的討伐軍";S.raid.size="上百人";S.raid.due=Math.max(S.raid.due,nowH()+7*24-early);return}
  S.raid={name:army?"人類的討伐軍":"冒險者討伐隊",army,lv,size:army?"上百人":"六、七個冒險者",due:nowH()+(army?7:5)*24-early,seen:patrol(),prep:[]}; raidComp(S.raid);
}
function restoreWith(r){const keep=r&&r.withBefore||[];S.party.forEach(p=>p.with=keep.includes(p.n));}
function raidAdv(){
  const a=[...(S.raid&&S.raid.prep||[]).map(k=>RAID_PREP[k].adv),...raidCounters()], n=S.nest;
  if(n.d>=4)a.push(`巢穴戰力：${DEF[n.d-1]}`);
  if(n.lv&&facOn("陷阱"))a.push("〔陷阱〕設施");
  ["陷阱","天然屏障","工坊"].forEach(t=>{if(n.tags.some(x=>x.t===t))a.push(t==="工坊"?"〔工坊〕打的武器":`〔${t}〕`)});
  Object.keys(S.world).filter(k=>isSettle(k)&&stOf(k)>=3).forEach(k=>a.push(`${k}的盟友來幫忙`));
  if(S.party.filter(p=>!p.tags.includes("重傷")).length>=2)a.push("同伴們一起守");
  if(S.raid&&S.raid.seen)a.push("巡邏的提早發現，準備好了");
  if(S.raid&&S.raid.giant)a.unshift("冰霜巨人的氏族來守");                // v0.52：冰霜巨人王的加護
  return a;
}
function raidDay(notes){
  if(patrol()&&S.raid&&!S.raid.seen){S.raid.seen=true;S.raid.due+=24;notes.push(`巡邏的同伴發現了${S.raid.name}的行蹤：大約 ${Math.ceil((S.raid.due-nowH())/24)} 天後到。`)}
  const n=S.nest; if(n.pop>=4)heatAdd(n.pop>=5?2:1,null,notes);
  if(n.lv&&S.day%30===25&&!S.raid){raidSet(true);S.raid.big=true;S.raid.name=`第 ${S.day+5} 天的大討伐軍`;S.raid.due=nowH()+5*24;S.raid.seen=true;notes.push(`〈系統〉《大賢者》：「警告。人類每隔一陣子就會清剿一次魔物的巢穴：${S.raid.name}約 5 天後到（第 ${S.day+5} 天）。」`)}
  if(!S.raid&&heatLv()<3&&S.day-(S.heatDay||0)>=2&&S.heat>0){S.heat=Math.max(0,S.heat-2);S.heatDay=S.day-1}
}
/* 搬家：整窩搬到一個已知的地點。討伐隊會撲空。 */
function moveNest(dest,flee){
  if(busy||dest===NEST()||S.alone)return;
  if(!S.world[dest]&&/的新營地$/.test(dest)){                // 在某個地區裡自己找塊地方：搬過去時才建立
    const r=dest.replace(/的新營地$/,""), rw=S.world[r];
    if(rw&&rw.known&&rw.kind==="地區"){S.world[dest]={kind:"營地",region:r,note:`你們在${r}裡自己找的落腳處。`,links:{[r]:1},known:true,custom:true};rw.links=rw.links||{};rw.links[dest]=1}}
  if(!S.world[dest]&&/外圍營地$/.test(dest)){               // 中立以上聚落旁邊的外圍營地：搬過去時才建立
    const b=dest.replace(/外圍營地$/,""), bw=S.world[b];
    if(bw&&bw.known&&(bw.st||0)>=0){S.world[dest]={kind:"營地",region:bw.region,note:`${b}外圍的空地，聚落的人准你們在這裡落腳。`,links:{[b]:1},known:true,custom:true,st:bw.st};
      bw.links=bw.links||{};bw.links[dest]=1}}
  if(!S.world[dest])return;
  const pre=snap(), old=NEST(), notes=[], n=S.nest, h=flee?0:(pathHours(S.at,old)||0)+(pathHours(old,dest)||2);
  S.log.push({who:"you",text:flee?`放棄${old}，帶著大家往${dest}逃`:`把巢穴從${old}搬到${dest}`,pre});
  if(h)advanceTime(h,notes);
  const ow=S.world[old], nw=S.world[dest];
  ow.kind=(ow.region===old||ow.was==="地區")?"地區":"廢棄的巢穴"; ow.note=`以前的巢穴，${flee?"被討伐隊踏平了":"已經搬空了"}。`;
  nw.note=`你們的新巢穴。${nw.kind&&nw.kind!=="巢穴"?`（原本是${nw.kind}：${nw.note||""}）`:""}`.slice(0,60); if(nw.kind==="地區")nw.was="地區"; nw.kind="巢穴"; nw.known=true;
  S.nestAt=dest; n.name=dest; S.at=dest; S.loc=dest;
  n.tags=n.tags.filter(t=>!/天然屏障|禍患|陷阱/.test(t.t));
  if(flee){n.food=0;n.pop=1;n.d=Math.max(1,n.d-2);
    S.npcs.filter(x=>x.where===old&&x.captive).forEach(x=>npcGone(x.n,"在混亂中走散了",notes));
    notes.push(`你們丟下了幾乎所有東西逃出來。存糧沒了，人口：${POP[0]}，戰力：${DEF[n.d-1]}。`)}
  else{const lost=Math.floor((n.food||0)/2);n.food-=lost;if(n.pop>2){n.pop--;notes.push("有幾隻不肯走，留在了老地方。")}
    notes.push(`搬家花了 ${h} 小時。路上帶不動的存糧丟了 ${lost} 份。`)}
  S.npcs.forEach(x=>{if(x.where===old)x.where=dest});
  if(n.lv){n.lv="F";n.pts=0;n.fac=[];n.facT={};n.pick=null;S.party.forEach(p=>{p.fac=null});notes.push("新巢穴從 F 級重新開始：物資點數和設施都要重來。")}
  nestSync();
  if(S.raid){notes.push(`${S.raid.name}撲了個空。他們暫時找不到你們了。`);S.raid=null;S.heat=Math.min(S.heat||0,HEAT[1].at);}
  if((S.chap||1)<4){S.chap=4;notes.push(`〈系統〉《世界之聲》：「第4章・${chapOf().name}」`)}
  S.opts=["看看新巢穴","安頓大家","出去找吃的"]; MV="";
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
let MV="";
/* 討伐戰：在巢穴迎戰，討伐隊 3 階段、討伐軍 5 階段。輸掉過半＝巢穴全滅（遊戲結束，可以撤回）。 */
function startRaid(help){
  if(busy||!S.raid)return; const pre=snap(), r=S.raid;
  S.log.push({who:"you",text:`迎戰${r.name}${r.king&&help&&helpers(r.king).includes(help)?`（請${kingOf(help).t}來幫忙）`:""}`,pre});
  if(r.king)helpSet(r,help); else if(S.bless&&S.bless.giant){r.giant=true;S.bless.giant=0}
  const notes=[]; if(!inNest()){notes.push(`你聽到消息，拚命趕回${NEST()}。`);S.at=NEST();S.loc=NEST()}
  r.on=true; r.stage=1; r.of=r.ofK||Math.max(1,(r.army?5:3)-((r.prep||[]).length>=3?2:0)); r.wins=0; r.fails=0; r.mom=0;
  r.withBefore=S.party.filter(p=>p.with).map(p=>p.n);
  S.party.forEach(p=>{if(!p.tags.includes("重傷"))p.with=true});
  if(notes.length)S.log.push(sysEntry(notes.join("\n")));
  S.opts=[]; save(); doJob({kind:"raid",ctx:{stage:1}},snap(),S.log.length);
}
const RAID_STEPS={1:["埋伏好的一擊"],3:["前哨和陷阱","洞口攻防","對上帶頭的強者"],5:["遠處的火把和偵察","陷阱與伏擊","洞口攻防","洞裡的混戰","對上統帥"]};
/* 派工：留在巢穴的同伴每天做一件事 */
const JOBS={"":"（沒事）","狩獵":"每天帶回存糧","採集":"有時帶回草藥、燧石之類","看守":"俘虜不會逃走","照顧":"俘虜兩天好一級（最多到服從）","巡邏":"討伐的動向會先知道"};
const GATHER=["草藥","燧石","乾柴","野果","樹脂","獸骨"];
function dayJobs(notes){
  const out=[], n=S.nest, home=S.party.filter(p=>!p.with);
  home.forEach(p=>{if(p.with||!p.job)return; const hurt=p.tags.includes("重傷");
    if(p.job==="狩獵"){if(hurt)return;const g=1+gIdx(p.lv)+(p.tags.includes("負傷")?-1:0);if(g>0){n.food=(n.food||0)+g;out.push(`${p.n}打獵帶回 ${g} 份`)} allyXp(p,1,out)}
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
  if(S.alone){notes&&notes.push(`${r.name}想跟著你，但你答應過小丑王：不再有同伴。`);return}
  const npc=S.npcs.find(x=>x.n===r.name);
  const p={n:r.name,kind:r.kind||"哥布林",lv:(npc&&gIdx(npc.lv||"F")<gIdx(allyLv())?npc.lv:allyLv()),xp:0,knack:r.knack||(npc&&npc.knack)||"",note:r.note||(npc&&npc.face)||"",skills:[],tags:[],with:S.party.filter(x=>x.with).length<2};
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
    {const k=Math.min(3,(won||0)+(big&&/群|隊|團|們/.test(d.name+(d.kind||""))?2:0)), sp=speciesOf(d.name,d.kind);for(let j=0;j<k;j++)S.corpses.push({name:sp,sp,lv:d.lv,t:nowH()});if(k)notes.push(`前面打倒的 ${k} 隻${sp}也在地上。`)}
    npcGone(d.name,"被你殺死",null); facHit(d,notes); if(CIVIL_RACE.test(d.name+(d.kind||"")))heatAdd(2,`殺了${cleanName(d.name)}`,notes)}
  else{notes.push(`你打敗了${d.name}。牠還活著。`); gainExist(d.lv,notes,d.cls?1:0); facHit(d,notes)}
  S.lastFoe=null;
}
function gainExist(lv,notes,bonus,why){
  if(S.exist>=existMax(S.lv)){notes.push(`存在值已滿（${S.exist}/${existMax(S.lv)}），不會再增加——先去打進化戰。`);return}
  const g=existGain(lv)+(bonus||0);
  if(!g){notes.push("對手比你弱，存在值沒有增加。");return}
  S.exist=Math.min(existMax(S.lv),S.exist+g);
  S.party.filter(p=>p.mate&&p.with).forEach(p=>{allyXp(p,g,notes);notes.push(`伴侶${p.n}存在值 +${g}（${p.xp||0}/${EVO_PTS}）`)});   // v0.47：伴侶同行拿一樣多
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

/* ═════════ 巢穴等級與設施（v0.33）═════════
   當上巢穴之主＝E 級；搬家＝F 級重來。物資點數：捐物品（會消失）；升級花點數（E 20、D 30、C 60、B 120、A 240），
   升級必引來一次討伐；每升到 E/D/C/B/A 從沒出現過的設施裡隨機抽 3 個選 1（最多 5 個）。設施效果跟巢穴等級走，
   要有人手（對口同伴 1＋族人最多 2）才運作，被排進設施的命名同伴不能同行。 */
const NEST_UP={E:20,D:30,C:60,B:120,A:240};
const nLv=()=>S.nest&&S.nest.lv||null;
const nStr=()=>Math.max(0,gIdx(nLv()||"F"));            // F0 E1 D2 C3 B4 A5
const FAC={
  "農田":{cls:null,txt:"每天自己長出存糧"},
  "獵場":{cls:"斥候",txt:"每天帶回獵物（有斥候同伴看著更多）"},
  "鍛冶台":{cls:"工匠",txt:"每隔幾天打出一件白字武器防具；有人看著，鍛造也比較快"},
  "宿舍":{cls:null,txt:"每隔幾天有同類聚過來（人口 +1，要有存糧）"},
  "陷阱":{cls:"斥候",txt:"討伐戰多一層優勢"},
  "治療所":{cls:"祭司",txt:"同伴每天好一級傷"}};
const FOOD_B=[0,3,4,6,8,10], WPN=["骨矛","粗石斧","木盾","皮甲","鐵匕首","粗鐵短刀"];
function rollFac(n){const left=Object.keys(FAC).filter(f=>!(n.fac||[]).includes(f)); if((n.fac||[]).length>=5||!left.length)return null;
  return left.sort(()=>Math.random()-0.5).slice(0,3)}
function nestFix(o){
  if(!o||!o.nest||!o.chief||o.alone)return;          // v0.52：小丑王第三項之後沒有巢穴，不補等級
  const n=o.nest; if(n.lv)return;
  n.lv="E"; n.pts=0; n.fac=[]; n.facT={}; n.pick=rollFac(n);
}
const facWorkers=f=>{
  const n=S.nest, c=FAC[f].cls, pop=Math.max(0,n.pop-1);
  const ally=c?S.party.find(p=>p.fac===f):null;
  return c?(ally?1:0)+Math.min(2,pop):Math.min(3,n.pop);
};
function facAssign(){
  const n=S.nest, fs=n.fac||[];
  S.party.forEach(p=>{if(p.fac&&(!fs.includes(p.fac)||p.with||p.tags.includes("重傷")))p.fac=null});
  fs.forEach(f=>{const c=FAC[f].cls; if(!c||S.party.some(p=>p.fac===f))return;
    const a=S.party.find(p=>!p.with&&!p.fac&&p.dir===c&&!p.noFac&&!p.tags.includes("重傷")); if(a)a.fac=f});
}
const facOn=f=>(S.nest.fac||[]).includes(f)&&facWorkers(f)>0;
function facDay(notes){
  const n=S.nest; if(!n.lv||!(n.fac||[]).length)return;
  n.facT=n.facT||{}; facAssign(); const out=[], s=nStr();
  (n.fac||[]).forEach(f=>{
    const w=facWorkers(f); if(w<=0)return; const m=w/3;
    if(f==="農田"){const g=Math.max(1,Math.round(FOOD_B[s]*m));n.food=(n.food||0)+g;out.push(`〔農田〕+${g} 份存糧`)}
    if(f==="獵場"){const g=Math.max(1,Math.round((FOOD_B[s]-1)*m));n.food=(n.food||0)+g;out.push(`〔獵場〕帶回 ${g} 份獵物`)}
    if(f==="鍛冶台"){n.facT[f]=(n.facT[f]||0)+1;if(n.facT[f]>=7-w){n.facT[f]=0;const it=rnd(WPN);receive(it,null);out.push(`〔鍛冶台〕打出了「${it}」（白字）`)}}
    if(f==="宿舍"){n.facT[f]=(n.facT[f]||0)+1;if(n.facT[f]>=6-w&&(n.food||0)>=needOf()){n.facT[f]=0;if(n.pop<POP.length){n.pop++;out.push(`〔宿舍〕又有同類聚過來。人口：${POP[n.pop-1]}`)}}}
    if(f==="治療所")S.party.forEach(p=>{if(p.tags.includes("負傷")){p.tags=p.tags.filter(t=>t!=="負傷");out.push(`${p.n}的傷在〔治療所〕好了`)}
      else if(p.tags.includes("重傷")){p.tags=p.tags.filter(t=>t!=="重傷");p.tags.push("負傷")}});
  });
  if(out.length)notes.push("設施："+out.join("；"));
}
/* 注目度的被動累積：從 D 級起很慢，而且只到「風聲／偵察」為止，光靠巢穴大不會直接引來討伐 */
function nestHeatDay(notes){
  const iv={D:4,C:3,B:2,A:2}[nLv()]; if(!iv||S.raid)return;
  const cap={D:HEAT[1].at-1,C:HEAT[2].at-1,B:HEAT[2].at-1,A:HEAT[2].at-1}[nLv()];
  if(S.day%iv===0&&(S.heat||0)<cap)heatAdd(1,"巢穴越來越大",notes);
}
const ptsOfItem=n=>{const m=matOf(n);if(!m)return 1;const i=gIdx(m.lv);return i>=5?10:i>=3?5:2};
const donatable=()=>S.items.map((n,i)=>({n,i,v:ptsOfItem(n)})).filter(x=>!shareOfItem(x.n));
function donateItem(i){
  const n=S.nest, it=S.items[i]; if(busy||S.dead||it==null||!n.lv)return;
  const v=ptsOfItem(it), pre=snap();
  S.log.push({who:"you",text:`把${it}捐給巢穴`,pre});
  delete S.mat[it]; S.items.splice(i,1); n.pts=(n.pts||0)+v;
  S.log.push(sysEntry(`捐給巢穴：${it}，物資點數 +${v}（現在 ${n.pts} 點）`)); save(); render();
}
const nextNLv=()=>GRADES[gIdx(nLv())+1];
function upgradeNest(){
  const n=S.nest, to=nextNLv(), cost=NEST_UP[to];
  if(busy||S.dead||S.alone||!n.lv||!to||!cost||n.pick||S.raid||(n.pts||0)<cost||to==="S")return;
  const pre=snap(); S.log.push({who:"you",text:`把巢穴升到 ${to} 級`,pre});
  n.pts-=cost; n.lv=to; n.pick=rollFac(n);
  const notes=[`〈系統〉《世界之聲》：「${NEST()}升到 ${to} 級。」`];
  if(n.pick)notes.push("巢穴多一個設施的位置，從三個裡選一個。");
  raidSet(false); S.raid.up=true; S.raid.name="聞風而來的冒險者討伐隊";
  notes.push(`〈系統〉《大賢者》：「警告。巢穴變大的消息傳出去了，討伐隊大約 ${Math.ceil((S.raid.due-nowH())/24)} 天後到。」`);
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
function pickFac(j){
  const n=S.nest; if(busy||!n.pick||!n.pick[j])return; const f=n.pick[j], pre=snap();
  S.log.push({who:"you",text:`選了設施：${f}`,pre});
  n.fac.push(f); n.pick=null; facAssign();
  S.log.push(sysEntry(`〈系統〉《世界之聲》：「〔${f}〕蓋好了。${FAC[f].txt}。」${FAC[f].cls?`\n（排一個${FAC[f].cls}同伴留在巢穴，他會自動去顧；被排進去的同伴不能同行。）`:""}`)); save(); render();
}
function nestLvHTML(){
  const n=S.nest; if(!n.lv)return `<div class="note" style="margin-top:8px">成為巢穴之主後，巢穴才有等級。</div>`;
  const to=nextNLv(), cost=to&&NEST_UP[to], can=cost&&!n.pick&&!S.raid&&(n.pts||0)>=cost&&to!=="S";
  const fac=(n.fac||[]).map(f=>{const w=facWorkers(f), a=S.party.find(p=>p.fac===f);
    return `<div class="row"><span class="k">〔${esc(f)}〕</span><span>人手 ${w}／3${FAC[f].cls?`・${a?esc(a.n)+"在顧":"缺"+FAC[f].cls}`:""}<br><span class="note">${esc(FAC[f].txt)}</span></span></div>`}).join("");
  const dn=donatable();
  return `<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><div class="row"><span class="k">巢穴等級</span><span><b>${n.lv}</b> 級・物資點數 <b>${n.pts||0}</b>${to&&cost&&to!=="S"?`（升 ${to} 要 ${cost}）`:""}</span></div>
    ${to&&cost&&to!=="S"?`<button class="paybtn" id="nup" style="margin:6px 0"${can?"":" disabled"}>升到 ${to} 級${can?"（會引來一次討伐）":n.pick?"（先選設施）":S.raid?"（先處理討伐）":"（點數不夠）"}</button>`:`<div class="note">已經是一般升級的最高級。</div>`}
    ${n.pick?`<div class="note" style="margin:6px 0"><b>選一個設施：</b></div><div class="tags">${n.pick.map((f,j)=>`<button class="tag ut" data-nf="${j}">${esc(f)}：${esc(FAC[f].txt)}</button>`).join("")}</div>`:""}
    ${fac||`<div class="note">還沒有設施（最多 5 個，每升一級多一個）。</div>`}
    <div class="note" style="margin-top:6px">捐物品換點數（物品會消失）：普通 1、魔法物品 2、C～B 級 5、A 級以上 10。${dn.length?"":"（沒有可以捐的）"}</div>
    ${dn.map(x=>`<div class="crow">${esc(x.n)}（+${x.v}）<button class="tl" data-nd="${x.i}">捐給巢穴</button></div>`).join("")}</div>`;
}

/* v0.38 掠奪戰利品：突襲營地／據點成功時，魔法物品由程序抽（不再靠模型自己填）。
   成功 1 件、大成功 2 件；同一天打同一個對手第二次只有 30% 機率；另外 40% 多一瓶藥水。 */
let RAIDNOW=false;
const RAID_RE=/突襲|襲擊|掠奪|掠夺|洗劫|劫掠|搶|抢|劫營|劫营|奪取|夺取|端掉/;
const RAID_FOE=/哥布林|獸人|野豬人|狗頭人|諾姆|地精|食人魔|人類|冒險者|士兵|商隊|盜|戰團|部落|營地|巢穴|據點/;
const LOOT_GEAR=["長矛","短刀","戰斧","皮甲","小圓盾","骨飾","護腕","彎刀","頭盔"];
const LOOT_POOL=[{n:"蠻力",sys:"天生"},{n:"堅守",sys:"意圖"},{n:"劍術",sys:"武技"},{n:"耐痛",sys:"天生"},{n:"警戒",sys:"意圖"},{n:"撕裂",sys:"天生"}];
function raidLoot(c,notes){
  if(!c||c.tier==="失敗"||!c.foeLv||!RAID_RE.test(c.what||"")||!(RAID_FOE.test((c.foe||"")+(c.what||""))||isSettle(S.at)))return [];   // v0.55：人在聚落突襲也算（以前精靈村、矮人聚落這些對不上字）
  facHit({name:c.foe||"",kind:c.what||""},notes); if(c.tier==="大成功")facHit({name:c.foe||"",kind:c.what||""},notes);
  domHit(S.at,c.tier,notes);   // v0.47：突襲聚落成功 → 威懾／壓制
  if(RW[S.at])rwGive(S.at,`你掠奪了${S.at}，搶走了他們的神兵`,notes);   // v0.55：掠奪就拿得到
  S.lootDay=S.lootDay||{}; const key=cleanName(c.foe||"營地"), again=S.lootDay[key]===S.day; S.lootDay[key]=S.day;
  const n=again?(Math.random()<0.3?1:0):(c.tier==="大成功"?2:1), got=[];
  const sp=cleanName(c.foe||"戰團").replace(/戰團|部落|巡邏隊|營地|巢穴|戰士/g,"")||"戰團";
  for(let i=0;i<n;i++){
    const lv=capItemLv(c.foeLv), gear=LOOT_GEAR[rint(0,LOOT_GEAR.length-1)];
    const pool=(poolKey(sp)&&POOLS[poolKey(sp)])||LOOT_POOL, sk=pool[rint(0,pool.length-1)];
    let nm=`${sp}的${gear}`; while(S.items.includes(nm))nm+="・改";
    S.items.push(nm); S.mat[nm]={lv,sp,skill:{n:sk.n,sys:sk.sys}}; got.push(nm);
    notes.push(`戰利品：✦${nm}（魔法物品，附帶「${sk.n}」・${lv}級）`)}
  if(!again&&Math.random()<0.4){const p=["紅色藥水","藍色藥水"][rint(0,1)];S.items.push(p);got.push(p);notes.push(`戰利品：${p}`)}
  if(!got.length)notes.push("這次沒搶到值錢的東西（同一個對手今天已經被你搜刮過了）。");
  return got}

/* ═════════ v0.38 討伐戰補完 ═════════
   組成與兵種相剋、戰前備戰、第一次只逼退、整批俘虜、處置俘虜、固定日子大討伐、全滅轉生 */
const RAID_CLS=["戰士","斥候","法師","祭司","工匠"];
const COUNTER={戰士:"斥候",斥候:"法師",法師:"戰士",祭司:"工匠",工匠:"祭司"};   // 戰士壓制斥候、斥候繞後打法師、法師火力壓戰士、祭司和工匠互相剋
const raidComp=r=>{if(!r.comp)r.comp=[...RAID_CLS].sort(()=>Math.random()-0.5).slice(0,r.army?4:3);return r.comp};
const RAID_PREP={陷阱:{h:4,adv:"事先在洞口設好的陷阱",txt:"花 4 小時"},埋伏:{h:2,adv:"埋伏在洞口兩側",txt:"花 2 小時"},備戰:{food:3,adv:"族人削尖木矛、備好石塊",txt:"用 3 份存糧"}};
function raidCounters(){
  const r=S.raid; if(!r)return [];
  const comp=raidComp(r), out=[];
  S.party.filter(p=>p.named&&COUNTER[p.dir]&&!p.tags.includes("重傷")&&comp.includes(COUNTER[p.dir])).forEach(p=>{if(out.length<2)out.push(`${p.dir}的專長克制對方的${COUNTER[p.dir]}`)});
  return out;
}
function raidPrep(k){
  const r=S.raid, P=RAID_PREP[k]; if(busy||S.dead||!r||r.on||!P||(r.prep||[]).includes(k))return;
  if(!inNest()){S.log.push(sysEntry("要先回到巢穴才能備戰。"));save();render();return}
  if(P.food&&(S.nest.food||0)<P.food){S.log.push(sysEntry(`存糧不夠（要 ${P.food} 份）。`));save();render();return}
  const pre=snap(), notes=[]; S.log.push({who:"you",text:`備戰：${k}`,pre});
  if(P.food)S.nest.food-=P.food; if(P.h)advanceTime(P.h,notes);
  if(!S.raid){S.log.push(sysEntry(notes.join("\n")));save();render();return}
  (S.raid.prep=S.raid.prep||[]).push(k);
  notes.push(`${k}做好了：討伐戰多一層優勢（${P.adv}）。${S.raid.prep.length>=3?"三樣都備齊了：這場只要打一個階段。":""}`);
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
/* 打贏討伐：第一次（或準備不足、贏得不漂亮）只是逼退，過幾天帶更多人再來；漂亮贏了才有俘虜和稱號 */
function raidWin(r,notes){
  const decisive=!!S.pushed||(r.wins-r.fails>=2)||(r.prep||[]).length>=2||r.big;
  S.pushed=true;
  const cs=`${r.army?"討伐軍":"討伐隊"}的冒險者`;
  if(!decisive){
    notes.push(`${r.name}撤退了。但這只是撤退，不是打垮：他們會帶更多人回來。`); gainExist(r.lv,notes,1,"逼退");
    toCorpses(cs,"人類",r.lv).forEach(c=>{c.small=false;S.corpses.push(c)});
    S.raid=null; restoreWith(r); S.heat=Math.max(S.heat||0,HEAT[2].at);
    raidSet(true); S.raid.due=nowH()+6*24; S.raid.name="捲土重來的討伐軍"; S.raid.seen=true;
    notes.push(`〈系統〉《大賢者》：「警告。大約 6 天後，更大的討伐軍會到。這幾天可以備戰（巢穴頁）。」`);
    return false;
  }
  notes.push(`${r.name}被擊退了。`); gainExist(r.lv,notes,r.army?3:2,"守住巢穴");
  toCorpses(cs,"人類",r.lv).concat(toCorpses(cs,"人類",r.lv)).forEach(c=>{c.small=false;S.corpses.push(c)});
  const ti=r.army?"擊退討伐軍":"擊退討伐隊"; if(!S.titles.includes(ti)){S.titles.push(ti);notes.push(`〈系統〉《世界之聲》：「獲得稱號『${ti}』。」`)}
  Object.keys(S.world).filter(k=>isSettle(k)&&/人類|城鎮/.test(k+S.world[k].kind)).forEach(k=>stChange(k,-1,"打退了他們派來的人",notes));
  const comp=raidComp(r), k=r.army?5:3;
  for(let i=0;i<k;i++){const c=comp[i%comp.length];capture({name:`討伐隊的${c}${S.day}-${i+1}`,kind:"人類",lv:r.lv,cls:c},[])}
  notes.push(`${k} 個討伐隊員被活捉，關在${NEST()}（俘虜，每天吃 1 份存糧）。吃掉、讓同伴單挑練手、或收為己用，到巢穴頁決定。`);
  S.raid=null; S.heat=HEAT[1].at; S.raidCool=S.day+10; restoreWith(r);
  notes.push("注目度降到「風聲」。他們吃了大虧，十天內不會再派人來討伐。");
  return true;
}
/* 處置俘虜 */
function eatCaptive(n){
  const x=S.npcs.find(y=>y.n===n&&y.captive); if(!x||busy||S.dead)return;
  const pre=snap(); S.log.push({who:"you",text:`處置俘虜：把${n}交給大家吃掉`,pre});
  S.corpses.push({name:n,sp:"人類",lv:x.lv||"F",t:nowH(),cls:x.cls||null});
  npcGone(n,"被你吃掉",null);
  S.log.push(sysEntry(`${n}成了屍體，放在身邊（要吃的話，到屍體清單去吃，才學得到技能）。`)); save(); render();
}
function duelCaptive(n){
  const x=S.npcs.find(y=>y.n===n&&y.captive); if(!x||busy||S.dead)return;
  const p=S.party.filter(q=>!q.tags.includes("重傷")).sort((a,b)=>gIdx(b.lv||"F")-gIdx(a.lv||"F"))[0];
  if(!p){S.log.push(sysEntry("沒有能打的同伴。"));save();render();return}
  const pre=snap(); S.log.push({who:"you",text:`處置俘虜：讓${p.n}和${n}單挑`,pre});
  const diff=gIdx(p.lv||"F")-gIdx(x.lv||"F"), win=Math.random()<Math.min(0.95,Math.max(0.1,0.5+0.25*diff)), notes=[];
  if(win){allyXp(p,3,notes);S.corpses.push({name:n,sp:"人類",lv:x.lv||"F",t:nowH(),cls:x.cls||null});npcGone(n,"死於單挑",null);
    notes.push(`${p.n}贏了。${n}倒下了，屍體還是熱的。`)}
  else{woundAlly(p.n,notes);notes.push(`${p.n}輸了這一場，${n}還活著。`)}
  S.log.push(sysEntry(notes.join("　"))); save(); render();
}
function useContract(n){
  const x=S.npcs.find(y=>y.n===n&&y.captive); if(!x||busy||S.dead)return;
  const pre=snap(), notes=[]; S.log.push({who:"you",text:`處置俘虜：讓${n}留下來幫忙`,pre});
  if(relOf(x)<1){notes.push(`${n}還不肯：關係至少要到「友善」（照顧幾天、給藥水或食物）。`)}else contract(x,notes);
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
/* 全滅轉生：帶 1 個技能（維持等級）從頭開始 */
function reborn(sn){
  const old=S, sk=old.skills.find(s=>s.n===sn&&s.sys!=="Unique"); const ng=newGame(old.name);
  if(sk)ng.skills.push({n:sk.n,sys:sk.sys,g:sk.g||"F",box:"act"});
  ng.rebirths=(old.rebirths||0)+1; ng.langs=["哥布林語"];
  S=ng; heal(); S.log.push({who:"gm",kind:"sys",alts:[{text:`${OPENING}${sk?`\n\n〈系統〉《大賢者》：「告。前世的記憶殘留了一項本領：${sk.n}（${sk.g||"F"}級）。」`:""}`,opts:OPEN_OPTS.slice()}],i:0}); S.opts=OPEN_OPTS.slice(); TAB="story"; save(); render();
}

/* ═════════ 結局簿與二周目（v0.46）═════════
   結局簿跨局保存在 localStorage「mowu_meta」（不在存檔 S 裡），轉生、重玩都不清掉。
   S.ends：這一局解鎖過的結局 {key: 第幾天}；S.sacN：捨身累計次數；S.ended：選擇退休的結局。
   還沒做的系統（伴侶、統治軌道、八王、管理員、神器）的結局先列出來、標「之後的版本」。 */
const META_KEY="mowu_meta";
let META=null, RBP=[], RT="";
function metaGet(){if(META)return META;let m=null;try{m=JSON.parse(ls.g(META_KEY)||"null")}catch(e){}
  META=(m&&typeof m==="object")?m:{}; if(!META.ends||typeof META.ends!=="object")META.ends={}; return META}
function metaSave(){ls.s(META_KEY,JSON.stringify(metaGet()))}
/* 結局用的「聚落」：各族聚落＋固定的敵對據點，知道的、還在的、不是自己的巢穴 */
const allSettles=()=>[...DEMI.map(x=>x.n),...SITE_FIXED].filter(n=>{const x=S.world[n];return x&&n!==NEST()&&x.kind!=="廢棄的巢穴"&&!x.razed});   // 這個世界裡所有的聚落（含還沒找到的）
const endSettles=()=>allSettles().filter(n=>S.world[n].known);
function nearSettles(){                        // 巢穴附近：同一個地區、或跟巢穴直接相連的地方所在的地區；v0.62：那裡一個聚落都沒有，就往外一圈一圈找，到找得到為止
  const nd=S.world[NEST()]||{}, all=allSettles();   /* 用全部聚落（含還沒找到的）決定是哪一圈，回傳那一圈裡已經找到的 */
  let R=new Set([nd.region||NEST()]); Object.keys(nd.links||{}).forEach(k=>{const y=S.world[k];if(y)R.add(y.region||k)});
  for(let ring=0;ring<6;ring++){
    const out=all.filter(n=>R.has(S.world[n].region)||(nd.links||{})[n]); if(out.length)return out.filter(n=>S.world[n].known);
    const R2=new Set(R); R.forEach(r=>{const rn=S.world[r];Object.keys((rn&&rn.links)||{}).forEach(k=>{const y=S.world[k];if(y)R2.add(y.region||k)})});
    if(R2.size===R.size)break; R=R2;
  }
  return [];
}
const ENDINGS=[
 {k:"family",line:"退休",n:"哥布林家族",need:"伴侶 7 位以上，而且巢穴人口到「興盛」（後代很多）",retire:true,
  chk:()=>mates().length>=7&&S.nest.pop>=5},
 {k:"chief",line:"退休",n:"哥布林部落酋長",need:"當上巢穴之主，而且巢穴附近（同一個地區、或直接相連的地方；那裡沒有聚落的話，算最近的一圈）的聚落全部中立以上（至少 1 個）",retire:true,
  chk:()=>{const a=nearSettles();return !!S.chief&&!S.abdicated&&a.length>0&&a.every(n=>stOf(n)>=0||domOf(n)===3)}},
 {k:"overlord",line:"退休",n:"部族共主",need:"這一局當上酋長，再找到這個世界的所有聚落，每一個都是中立以上、或被你威懾／壓制／統治",retire:true,
  chk:()=>{const a=allSettles();return !!S.ends.chief&&!S.abdicated&&a.length>0&&a.every(n=>S.world[n].known&&(stOf(n)>=0||domOf(n)>=1))}},
 {k:"conqueror",line:"退休",n:"哥布林征服者",need:"這個世界的每一個聚落，不是被你消滅、就是向你稱臣",retire:true,
  chk:()=>{const a=allSettles();return a.length+(S.razed||[]).length>0&&a.every(n=>S.world[n].known&&domOf(n)===3)}},
 {k:"emperor",line:"退休",n:"哥布林皇帝",need:"殺死並吞噬八王之一，加上家族、酋長、共主、征服者全部",retire:true,
  chk:()=>!!S.kings&&!S.abdicated&&Object.values(S.kings).some(x=>x.ate)&&["family","chief","overlord","conqueror"].every(k=>S.ends[k])},
 {k:"k_dead",line:"八王",n:"敗給八王",need:"八王戰戰敗死亡（按轉生或重新開始時記進來）"},
 {k:"k_mixed",line:"八王",n:"八王之間",need:"打倒至少一位王，也和至少一位王結盟或約好中立",chk:()=>!!S.kings&&Object.values(S.kings).some(x=>x.beaten)&&Object.values(S.kings).some(x=>x.stance==="ally"||x.stance==="neutral")},
 {k:"k_one",line:"八王",n:"吞噬一王",need:"打贏八王其一並吞噬",chk:()=>!!S.kings&&Object.values(S.kings).some(x=>x.ate)},
 {k:"k_all",line:"八王",n:"吞噬八王",need:"打贏八王全部並吞噬（精靈王下落不明，找到他之前達不成）",chk:()=>!!S.kings&&Object.values(S.kings).every(x=>x.ate)},
 {k:"k_vassal",line:"八王",n:"八王的眷屬",need:"替一位王做事、成為他的部下",soon:"八王的任務"},
 {k:"k_nine",line:"八王",n:"九王並立",need:"到 S 級，八位王都認可你（各付一種代價；小丑王要看穿他的謊言），一位都沒殺、沒攻擊過，然後選「成為第九王」"},
 {k:"collected",line:"管理員",n:"收藏品",need:"捨身累計 3 次以上，然後死亡"},
 {k:"servant",line:"管理員",n:"管理員的部下",need:"管理員的手機 8/8 去找管理員，吞噬過八王之一，選「替他做事」"},
 {k:"admin",line:"管理員",n:"成為管理員",need:"管理員的手機 8/8 去找管理員，選「接受」"},
 {k:"reckless",line:"管理員",n:"有勇無謀",need:"不知道管理員的真名，就對他動手"},
 {k:"a_rule",line:"管理員",n:"殺死管理員：成為管理員",need:"知道管理員的真名，一個人打贏七連戰，選「成為管理員」"},
 {k:"a_none",line:"管理員",n:"殺死管理員：沒有管理員",need:"知道管理員的真名，一個人打贏七連戰，選「沒有管理員」"},
 {k:"home",line:"回到原本的世界",n:"一個人回家",need:"神器 8 件、S 級核心、精靈王的儀式，一個人穿過傳送門"},
 {k:"home2",line:"回到原本的世界",n:"和伴侶們回家",need:"神器 8 件、S 級核心、精靈王的儀式，帶著伴侶穿過傳送門"},
 {k:"stay",line:"退休",n:"留在這個世界",need:"回家的儀式都準備好了，在「你真的要離開了嗎」選「留下」"}
];
function endCheck(notes){
  if(!S||S.dead||!S.world)return; if(!S.ends)S.ends={}; const M=metaGet(); let ch=false;
  ENDINGS.forEach(e=>{if(e.soon||!e.chk||S.ends[e.k])return; let ok=false; try{ok=e.chk()}catch(x){console.warn(x)} if(!ok)return;
    const first=!Object.keys(M.ends).length;
    S.ends[e.k]=S.day; if(!M.ends[e.k])M.ends[e.k]={day:S.day,run:(S.rebirths||0)+1}; ch=true;
    if(first)notes&&notes.push("〈系統〉第一次解鎖結局：記得到 ⚙ 按「匯出存檔」備份。遊戲沒有網路存檔，換手機、清瀏覽器資料就沒了。");
    notes&&notes.push(`〈系統〉結局解鎖：${e.n}。${e.retire?"（隨時可以到「履歷」頁選擇在這裡退休，也可以繼續玩）":""}`)});
  if(ch)metaSave();
}
/* 死了：見到管理員；捨身 3 次以上＝收藏品。按轉生或重新開始時才記進結局簿（撤回的話不算） */
function deathRecord(){
  if(!S||!S.dead||S._dr)return; S._dr=1; if(S.ended)return;
  const M=metaGet(); M.metAdmin=true;
  if(S.deathKing&&!M.ends.k_dead)M.ends.k_dead={day:S.day,run:(S.rebirths||0)+1};
  if((S.sacN||0)>=3&&!M.ends.collected)M.ends.collected={day:S.day,run:(S.rebirths||0)+1};
  metaSave();
}
function retireAt(k){
  const e=ENDINGS.find(x=>x.k===k); if(!e||!e.retire||!S.ends||!S.ends[k]||S.dead||busy)return;
  S.ended={k,day:S.day}; S.dead=true;           // 用「結束」擋住之後的行動；deathRecord 看到 ended 就不算死亡
  S.log.push(sysEntry(`〈系統〉結局：${e.n}。你在第 ${S.day} 天選擇在這裡退休。`)); save(); TAB="story"; render();
}
function endBookHTML(){
  const M=metaGet(), lines=[...new Set(ENDINGS.map(e=>e.line))];
  return `<div class="card"><h3>結局簿</h3><div class="note" style="margin-bottom:6px">好幾個結局可以同時解鎖。結局簿跨局保存，轉生不會清掉。${M.metAdmin?"你見過管理員了。":""}捨身累計：${S.sacN||0} 次。</div>
    ${lines.map(l=>`<div class="note" style="margin:8px 0 2px"><b>${esc(l)}</b></div>${ENDINGS.filter(e=>e.line===l).map(e=>{
      const got=M.ends[e.k], now=S.ends&&S.ends[e.k];
      return `<div class="row"><span class="k">${got?"✓":e.soon?"…":"○"} ${esc(e.n)}</span><span>${got?`第 ${got.run} 局第 ${got.day} 天解鎖`:esc(e.need)}${e.soon&&!got?`<br><span class="note">要等之後的版本（還沒做：${esc(e.soon)}）</span>`:""}
        ${now&&e.retire&&!S.dead?`<br><button class="tl" data-rt="${e.k}">${RT===e.k?"確定在這裡退休？（這一局結束）":"在這裡退休"}</button>`:""}</span></div>`}).join("")}`).join("")}</div>`;
}
function endHTML(){
  const ended=S.ended&&ENDINGS.find(e=>e.k===S.ended.k), col=!ended&&(S.sacN||0)>=3;
  const sk=S.skills.filter(s=>!isUq(s)&&s.g).sort((a,b)=>gIdx(b.g)-gIdx(a.g));
  return `<div class="dead"><b>${ended?`結局：${esc(ended.n)}`:"你死了。"}</b><br>${ended?"":`你見到了管理員。${col?`<br>你身上有 ${S.sacN} 處捨身的傷。結局：收藏品。`:""}<br>`}按上面的「撤回」回到上一步，或在齒輪裡重新開始。
    ${allOpenHTML()}<div class="note" style="margin-top:8px;padding:8px;border:1px solid currentColor;border-radius:6px"><b>先備份存檔！</b>遊戲沒有網路存檔，換手機、清瀏覽器資料就沒了。按下面的按鈕把存檔下載下來（結局簿也在裡面），之後可以在 ⚙「匯入存檔」讀回來。<br><button class="tl" id="endexp" style="margin-top:6px">匯出存檔（下載）</button></div>
    <div class="note" style="margin-top:8px">轉生（二周目）：從成體開始、所有地區一開始就知道。最多選 3 個技能帶過去（標成〔前世〕，不能整合、不會消失）；等級不帶。</div>
    <div class="tags">${sk.map(s=>`<button class="tag ut" data-rb="${esc(s.n)}" style="${RBP.includes(s.n)?"outline:2px solid currentColor":""}">${esc(s.n)}（${s.g}）</button>`).join("")}</div>
    <div class="note">已選 ${RBP.length}／3</div>
    ${S.divine?`<div class="note" style="margin-top:8px">神兵「${esc(S.divine.name)}」會跟著你（能力：${S.divine.abs.map(a=>esc(a.n)).join("、")}）。</div>`:`<div class="note" style="margin-top:8px"><b>鑄一把神兵帶過去</b>：自己取名、描述，再選 3 個技能當它的魔法能力（每項一天 3 次、永遠不會壞）。不選滿 3 個就不鑄。</div>
    <input id="dvn" maxlength="12" placeholder="神兵的名字" value="${esc(DVN)}" style="font:inherit;padding:6px;border:1px solid var(--line);border-radius:5px;width:100%;margin:4px 0">
    <input id="dvd" maxlength="40" placeholder="長什麼樣子（一句話）" value="${esc(DVD)}" style="font:inherit;padding:6px;border:1px solid var(--line);border-radius:5px;width:100%;margin:4px 0">
    <div class="tags">${sk.map(s=>`<button class="tag ut" data-rbd="${esc(s.n)}" style="${DVP.includes(s.n)?"outline:2px solid currentColor":""}">${esc(s.n)}</button>`).join("")}</div><div class="note">神兵能力已選 ${DVP.length}／3</div>`}
    <button class="tl" id="rbgo">轉生（帶 ${RBP.length} 個技能${S.divine||DVP.length===3?"＋神兵":""}）</button></div>`;
}
function rebornWith(names,div){
  if(!S||!S.dead)return; deathRecord();
  const old=S, ng=newGame(old.name);
  if(old.divine)ng.divine=old.divine;
  else if(div&&div.abs&&div.abs.length===3){const abs=div.abs.map(n=>old.skills.find(s=>s.n===n&&!isUq(s))).filter(Boolean).map(s=>({n:s.n,sys:s.sys,g:s.g||"F"}));
    if(abs.length===3)ng.divine={name:String(div.name||"").trim().slice(0,12)||"無名的神兵",desc:String(div.desc||"").trim().slice(0,40),abs}}
  (names||[]).slice(0,3).map(n=>old.skills.find(s=>s.n===n&&!isUq(s))).filter(Boolean)
    .forEach(s=>ng.skills.push({n:s.n,sys:s.sys,g:s.g||"F",box:"act",past:true,note:s.note||""}));
  ng.rebirths=(old.rebirths||0)+1; ng.langs=["哥布林語"];
  ng.stage="成體"; ng.hpMax=20; ng.hp=20; ng.tags=ng.tags.filter(t=>t!=="幼體"); ng.growth=3;
  Object.values(ng.world).forEach(x=>{if(x.kind==="地區")x.known=true});
  S=ng; RBP=[]; DVP=[]; DVN=""; DVD=""; heal();
  const keep=S.skills.filter(s=>s.past).map(s=>`${s.n}（${s.g}級）`);
  S.log.push({who:"gm",kind:"sys",alts:[{text:`〈系統〉第 ${S.rebirths+1} 局。\n你吃了很多、長得很快。睜開眼的時候，你已經是成體了。${keep.length?`\n〈系統〉《大賢者》：「告。前世的記憶殘留了 ${keep.length} 項本領：${keep.join("、")}。」`:""}${S.divine?`\n〈系統〉神兵「${S.divine.name}」在你手邊。`:""}\n〈系統〉這一帶的地區你都記得。`,opts:REBORN_OPTS.slice()}],i:0});
  S.opts=REBORN_OPTS.slice(); TAB="story"; save(); render();
}
const REBORN_OPTS=["看看這個窩現在的樣子","出去找吃的","看看自己帶回來的本領"];


/* ═════════ v0.47：神兵、伴侶、契約（短期）、統治軌道 ═════════ */
let DVP=[], DVN="", DVD="", DOMC="";
/* 神兵：S.divine={name,desc,abs:[{n,sys,g}]}。每項能力一天 3 次（skUsed 認「（神兵）」結尾），永遠不會壞，轉生時跟著走 */
const divKey=n=>`${n}（神兵）`;
const divLeft=n=>Math.max(0,3-(S.usedSk||[]).filter(x=>x===divKey(n)).length);
function divineHTML(){
  if(!S.divine)return "";
  const d=S.divine;
  return `<div class="card"><h3>神兵：${esc(d.name)}</h3>${d.desc?`<div class="note">${esc(d.desc)}</div>`:""}
    ${d.abs.map(a=>`<div class="sk"><span class="n">${esc(a.n)}</span><span class="s">${esc(a.sys)}</span><span class="lv">${esc(a.g)}</span><span class="s">今天還能用 ${divLeft(a.n)}／3</span></div>`).join("")}
    <div class="note" style="margin-top:6px">永遠不會壞，對手等級再高也照樣有效。判定卡「用哪個技能」選得到，不花 MP。</div></div>`;
}
/* 伴侶：類人＋追隨（同伴入隊時就是追隨）＋故事裡解開心結（模型填 heart）。心結技、種族技各一格，另外 5 格照同伴 */
const capLv=p=>p&&p.mate?S.lv:allyLv();
const mates=()=>S.party.filter(p=>p.mate);
function makeMate(h,notes){
  const p=S.party.find(x=>x.n===h.name||(x.alias||[]).includes(h.name));
  if(!p){notes.push(`${h.name}還不是你的同伴，不能成為伴侶。`);return}
  if(p.mate)return;
  if(p.temp){notes.push(`${p.n}只是契約同伴，不會成為伴侶。`);return}
  if(!isHumanoid({sp:p.kind,name:p.n})){notes.push(`${p.n}不是類人，不能成為伴侶。`);return}
  if(/幼體|幼崽|小孩|孩子/.test(`${p.kind}${p.note||""}${(p.tags||[]).join("")}`)){notes.push(`${p.n}還沒成年，不能成為伴侶。`);return}
  p.mate=true; p.knot=h.knot||"";
  p.heartSk={n:h.skill||`${p.n}的心願`,sys:"心結",g:S.lv,note:h.note||""};
  const pool=(poolKey(p.kind)&&POOLS[poolKey(p.kind)])||LOOT_POOL, cand=pool.filter(s=>!p.skills.some(x=>x.n===s.n)&&s.n!==p.heartSk.n);
  if(cand.length){const rs=cand[rint(0,cand.length-1)];p.raceSk={n:rs.n,sys:rs.sys,g:p.lv}}
  notes.push(`〈系統〉《世界之聲》：「${p.n} 成為你的伴侶。」`,
    `${p.n}的心結解開了${p.knot?`（${p.knot}）`:""}：學會心結技「${p.heartSk.n}」${p.raceSk?`，自己學會了種族技「${p.raceSk.n}」`:""}。伴侶的等級上限和你一樣（${S.lv}），跟你同行時存在值和你拿一樣多。`);
}
function mateHTML(p,k){
  const out=[];
  if(p.mate)out.push(`<div class="d">💍 伴侶${p.knot?`・解開的心結：${esc(p.knot)}`:""}<br>心結技：<b>${esc(p.heartSk.n)}</b>${p.heartSk.note?`（${esc(p.heartSk.note)}）`:""}${p.raceSk?`　種族技：<b>${esc(p.raceSk.n)}</b>`:""}（這兩格不能忘掉）</div>`);
  if(p.temp)out.push(`<div class="d">契約：${esc(p.temp.task)}（完成後回${esc(p.temp.home)}）${p.temp.type==="item"?`<br><button class="tl" data-cg="${k}"${S.items.some(n=>n===p.temp.target||n.includes(p.temp.target))?"":" disabled"}>交出 ${esc(p.temp.target)}</button>`:""}</div>`);
  return out.join("");
}
/* 契約：模型填 contract 提議 → 畫面出卡片 → 玩家同意才暫時同行；條件完成就道謝、回原本的地方。關係從無視開始，最多信賴 */
function offerSet(o,notes){
  if(S.party.some(p=>p.n===o.name)||S.alone)return;
  S.offer={...o,day:S.day,at:S.at};
  notes.push(`〈系統〉${o.name}提出契約：${o.task}。（在下面選「同意」或「拒絕」）`);
}
function offerHTML(){
  const o=S.offer; if(!o)return "";
  return `<div class="check"><h3>契約提議：${esc(o.name)}</h3><div class="note">${esc(o.task)}${o.target?`（${o.type==="item"?"要交出":o.type==="beast"?"一起打倒":"一起去"}：${esc(o.target)}）`:""}<br>同意的話，${esc(o.name)}會暫時跟你同行；條件完成後道謝、回原本的地方。</div>
    <div class="padd" style="margin-top:6px"><button class="tl" id="offok">同意</button><button class="tl" id="offno">拒絕</button></div></div>`;
}
function offerAccept(){
  const o=S.offer; if(!o||busy||S.dead)return;
  const pre=snap(), notes=[]; S.offer=null;
  S.log.push({who:"you",text:`同意和${o.name}的契約`,pre});
  if(S.party.filter(x=>x.with).length>=2)notes.push(`同行已經滿兩名，${o.name}沒辦法跟你走。契約沒有成立。`);
  else{
    let x=S.npcs.find(y=>y.n===o.name||(y.alias||[]).includes(o.name));
    if(!x){x={n:o.name,role:"人類",lv:"F",want:"",knack:"",face:"",secret:"",inst:"",rel:"無視",r:0,where:o.at};S.npcs.push(x)}
    const home=x.where||o.at||S.at; x.r=0; x.rel="無視"; x.cap=2;
    S.party.push({n:x.n,kind:raceOf(x.role)||"人類",lv:gIdx(x.lv||"F")<gIdx(allyLv())?(x.lv||"F"):allyLv(),xp:0,knack:x.knack||"",note:x.face||"",skills:[],tags:[],with:true,
      temp:{home,task:o.task,type:o.type,target:o.target}});
    notes.push(`契約成立：${x.n}暫時跟你同行，直到「${o.task}」完成。`);
  }
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
function offerReject(){
  const o=S.offer; if(!o||busy)return; S.offer=null;
  S.log.push(sysEntry(`你拒絕了${o.name}的契約。`)); save(); render();
}
function contractDone(p,notes){
  notes.push(`${p.n}：「感謝合作。」`,`${p.n}離隊，回到${p.temp.home}。`);
  const x=S.npcs.find(y=>y.n===p.n); if(x){x.where=p.temp.home}
  S.party=S.party.filter(q=>q!==p);
}
function contractCheck(a,notes){
  S.party.filter(p=>p.temp).slice().forEach(p=>{
    const t=p.temp, tg=cleanName(t.target||""); if(!tg)return;
    const d=a&&a.defeated, dn=d?cleanName(d.name):"";
    if(t.type==="beast"&&d&&(dn.includes(tg)||tg.includes(dn)||String(d.kind||"").includes(tg)))contractDone(p,notes);
    else if(t.type==="place"&&(S.at===t.target||S.at.includes(tg)||tg.includes(S.at)))contractDone(p,notes);
  });
}
function contractGive(k){
  const p=S.party[k]; if(!p||!p.temp||p.temp.type!=="item"||busy||S.dead)return;
  const it=S.items.find(n=>n===p.temp.target||n.includes(p.temp.target)); if(!it)return;
  const pre=snap(), notes=[`你把 ${it} 交給 ${p.n}。`];
  S.log.push({who:"you",text:`把 ${it} 交給 ${p.n}`,pre});
  S.items.splice(S.items.indexOf(it),1); delete S.mat[it]; contractDone(p,notes);
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
/* 統治軌道：聚落多一個 dom（0 無、1 威懾、2 壓制、3 統治＝稱臣），另外 razed＝被消滅。
   突襲成功 +1（大成功 +2），最多到壓制；壓制後在那裡選「稱臣」或「消滅」。統治的聚落每天上貢 2 份存糧。和友好那條（st）分開算 */
const DOM=["","威懾","壓制","統治"];
const domOf=n=>(S.world[n]&&S.world[n].dom)||0;
function domHit(n,tier,notes){
  const x=S.world[n]; if(!x||x.razed||![...DEMI.map(y=>y.n),...SITE_FIXED].includes(n))return;
  const was=x.dom||0; if(was>=2)return;
  x.dom=Math.min(2,was+(tier==="大成功"?2:1));
  notes.push(`${n}：${DOM[was]||"沒被壓著"} → ${DOM[x.dom]}${x.dom===2?"（可以到「地點」頁逼他們稱臣，或消滅他們）":""}`);
}
function domAct(kind,n){
  const x=S.world[n]; if(!x||(x.dom||0)!==2||busy||S.dead||S.at!==n||(kind!=="sub"&&S.law))return;
  const pre=snap(), notes=[];
  S.log.push({who:"you",text:kind==="sub"?`逼${n}稱臣`:`消滅${n}`,pre});
  advanceTime(4,notes);
  if(kind==="sub"){x.dom=3;notes.push(`〈系統〉${n}向你稱臣了。之後每天上貢 2 份存糧。`);heatAdd(1,`${n}向哥布林稱臣`,notes);if(RW[n])rwGive(n,`${n}向你稱臣，獻上了他們的神兵`,notes)}
  else{x.razed=true;x.dom=0;x.kind="廢墟";x.note=`被你消滅的${n}，只剩廢墟。`;S.razed=[...(S.razed||[]),n];
    S.npcs.filter(y=>y.where===n&&!S.party.some(p=>p.n===y.n)).forEach(y=>npcGone(y.n,"聚落被消滅",notes));
    heatAdd(3,`${n}被哥布林消滅了`,notes);notes.push(`〈系統〉${n}被你消滅了。`);if(RW[n])rwGive(n,`你從${n}的廢墟裡搶走了他們的神兵`,notes)}
  endCheck(notes);
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
function domDay(notes){
  const ruled=Object.keys(S.world||{}).filter(n=>domOf(n)===3&&!S.world[n].razed); if(!ruled.length||!S.nest)return;
  S.nest.food=(S.nest.food||0)+2*ruled.length; notes.push(`〔稱臣〕${ruled.join("、")}上貢了 ${2*ruled.length} 份存糧`);
}


/* ═════════ v0.48：合體技、結局簿跟著存檔 ═════════ */
/* 合體技：同行的伴侶，每位一天一次；多兩層優勢；進化戰（單挑）不能用。名字第一次用時固定 */
const comboName=p=>{if(!p.combo)p.combo=`合・${(p.heartSk&&p.heartSk.n)||p.n}`;return p.combo};
const comboReady=p=>p&&p.mate&&p.with&&!p.tags.includes("重傷")&&!((S.comboDay||{})[p.n]===S.day);
function comboOn(ch){
  if(!ch||!ch.combo||ch.war)return null;
  const p=S.party.find(x=>x.n===ch.combo); return comboReady(p)?p:null;
}
function comboBox(ch){
  if(!ch||ch.war)return "";
  const ps=S.party.filter(p=>p.mate&&p.with); if(!ps.length)return "";
  return `<div class="sacbox"><label>合體技（和同行的伴侶一起出手：多兩層優勢，每位伴侶一天一次）</label><select id="combosel"><option value="">不用</option>${ps.map(p=>`<option value="${esc(p.n)}"${ch.combo===p.n?" selected":""}${comboReady(p)?"":" disabled"}>${esc(p.n)}：${esc(comboName(p))}${comboReady(p)?"":"（今天用過了）"}</option>`).join("")}</select></div>`;
}
/* 存檔裡的結局簿抄本（S.metaCopy）讀進來時併進這台裝置的結局簿 */
function metaMerge(m){
  if(!m||typeof m!=="object")return; const M=metaGet(); let ch=false;
  Object.entries(m.ends||{}).forEach(([k,v])=>{if(!M.ends[k]&&v){M.ends[k]=v;ch=true}});
  if(m.metAdmin&&!M.metAdmin){M.metAdmin=true;ch=true}
  if(ch)metaSave();
}

/* ═════════ v0.50：八王（設計見專案《魔物篇_八王草案_1111》） ═════════
   S.kings[k]={know:{欄位:true},hide,want,stance("ally"|"neutral"|"war"),beaten,ate,frag}；S.kq＝獸王流程 {phase,due}。
   八王戰沿用討伐戰引擎（S.raid 加 king、kind：scout 五連戰／half 半成品上門／full 完全體，at＝在哪打）。 */
const KINGS={
 gold:{t:"金龍王",al:"守序善良",attr:"火",ins:"養肥再吃",lair:"金龍王的山",link:"東側山谷",desc:"古老的金龍，老迂腐，以為自己在管理整個世界",weak:"被證明他錯了（拿出他判錯的證據）"},
 elf:{t:"精靈王",al:"中立善良",attr:"木",ins:"不在乎",lair:"精靈王的隱居地",link:"黑松林",desc:"活了數千年的精靈，早就把精靈村交給下一代，下落不明",weak:"沒人知道"},
 uni:{t:"獨角獸王",al:"混亂善良",attr:"光",ins:"不在乎",lair:"獨角獸王的草原",link:"東側山谷",desc:"天使血統、比城堡還高的獨角獸",weak:"被束縛（鎖、契約、圍欄）"},
 beast:{t:"獸王",al:"守序中立",attr:"風",ins:"立刻吃",lair:"獸王的森林",link:"狼群的舊獵場",desc:"德魯伊獸王，能變成狼、熊、鹿、鳥、鷹，以為自己是正義的代行者",weak:"身邊的頭狼、頭熊被殺或收服，他就變弱",weakest:true},
 clown:{t:"小丑王",al:"混亂中立",attr:null,ins:null,lair:null,desc:"",weak:""},
 worm:{t:"紫蟲王",al:"守序邪惡",attr:"土",ins:"立刻吃",lair:"紫蟲王的深淵",link:"地底暗河",desc:"地獄血統的紫色巨蟲，守約、記帳，能吞下整座村子",weak:"抓到他違約的把柄"},
 lich:{t:"巫妖王",al:"中立邪惡",attr:"暗",ins:"養肥再吃",lair:"巫妖王的墓城",link:"黑水溝",desc:"學識淵博的不死巫妖，知道很多事，但要的代價難以想像",weak:"命匣被找到"},
 giant:{t:"冰霜巨人王",al:"混亂邪惡",attr:"水",ins:"立刻吃",lair:"冰霜巨人王的冰峰",link:"雪線以上",desc:"龍血的傳奇冰霜巨人，帶著巨人氏族和冰狼",weak:"怕火、怕被困在溫暖的地方太久"}
};
const CLOWN_T=[{n:"妖精",atk:"幻術",attr:"風"},{n:"惡魔",atk:"交易與詛咒",attr:"暗"},{n:"幽影",atk:"附身、躲進影子",attr:"暗"},{n:"元素",atk:"元素爆發",attr:null},{n:"擬態",atk:"變成別人，甚至變成別的王",attr:"光"},{n:"時空",atk:"偷走一段時間",attr:"風"}];
const CLOWN_C=[{n:"史萊姆",weak:"怕火、怕被凍住",place:"黏液沼"},{n:"鏡魔",weak:"怕鏡子被打碎",place:"鏡之迷宮"},{n:"狐",weak:"怕被叫出真名",place:"狐之祭典"},{n:"人偶",weak:"怕操線被剪",place:"人偶劇場"},{n:"鴉群",weak:"怕被分開",place:"鴉之塔"},{n:"貓",weak:"怕水",place:"貓之市"}];
const CLOWN_LINE="我記得你，還記得你上一次殺我的技巧。";
const K_ATTRS=["火","水","土","風","木","光","暗"];
const K_INS=["立刻吃","養肥再吃","不在乎"];
const K_HIDE=["他巢穴最深的地方","他手下最強的頭目身上","他的寶物堆裡","他自己身上","他的祭壇底下"];
const K_WANT=[{t:"一件魔法物品",k:"magic"},{t:"20 份存糧",k:"food"},{t:"你的一個技能",k:"skill"},{t:"一位俘虜",k:"captive"}];
const K_FIELDS=[["lair","領域"],["attr","屬性"],["ins","本能"],["weak","弱點"],["hide","通信記錄藏在哪"],["want","他想要什麼"]];
const BEAST_FORMS=["狼","熊","鹿","鳥","鷹"];
const kingOf=k=>{const b=KINGS[k], x=S.kings&&S.kings[k]; if(k!=="clown"||!x)return b; return {...b,attr:x.cattr,ins:x.cins,lair:x.clair,link:x.clink,desc:x.cdesc,weak:x.cweak}};
const kingsOpen=()=>!!(S.kings&&S.chapOpen);
const phoneN=()=>Object.values(S.kings||{}).filter(x=>x.frag).length;
function kingsInit(notes){
  if(S.kings)return; S.kings={};
  const t=CLOWN_T[rint(0,CLOWN_T.length-1)], c=CLOWN_C[rint(0,CLOWN_C.length-1)];
  Object.keys(KINGS).forEach(k=>{S.kings[k]={know:{},hide:K_HIDE[rint(0,K_HIDE.length-1)],want:rint(0,K_WANT.length-1),stance:"",beaten:false,ate:false,frag:false}});
  Object.assign(S.kings.clown,{ctpl:t.n,ccre:c.n,cattr:t.attr||K_ATTRS[rint(0,K_ATTRS.length-1)],cins:K_INS[rint(0,K_INS.length-1)],
    clair:`小丑王的${c.place}`,clink:SITE_REGIONS[rint(0,SITE_REGIONS.length-1)],
    cdesc:`戴著永遠在笑的面具，這一次是${t.n}血統的${c.n}；最危險的一招是${t.atk}`,cweak:c.weak});
  Object.keys(KINGS).forEach(k=>{const K=kingOf(k); if(!K.lair||S.world[K.lair])return;
    S.world[K.lair]={kind:"八王領域",region:K.lair,note:K.desc,links:{[K.link]:3},known:false,king:k};
    if(S.world[K.link]){S.world[K.link].links=S.world[K.link].links||{};S.world[K.link].links[K.lair]=3}});
  S.kq={phase:"scout",due:nowH()+3*24}; dunInit(); notes&&notes.push(DUN_MSG);
  notes&&notes.push("〈系統〉《世界之聲》：「第九名吞噬者的異香，傳遍了八王的領域。」","〈系統〉八王都知道你了，但他們不急著出手。（「履歷」頁多了八王檔案）");
}
function kingReveal(k,f,notes){
  const x=S.kings&&S.kings[k]; if(!x||x.know[f]||(f==="lair"&&lairHid(k)))return false; x.know[f]=true;
  if(f==="lair"){const K=kingOf(k); if(K.lair&&S.world[K.lair]){S.world[K.lair].known=true;if(S.world[K.link])S.world[K.link].known=true}}
  notes&&notes.push(`八王檔案・${kingOf(k).t}：揭開「${K_FIELDS.find(z=>z[0]===f)[1]}」`); return true;
}
const kingField=(k,f)=>{const K=kingOf(k), x=S.kings[k];
  return f==="lair"?(K.lair||"沒人知道"):f==="attr"?K.attr:f==="ins"?K.ins:f==="weak"?K.weak:f==="hide"?x.hide:(k==="lich"?Object.values(LICH_PAY).map(z=>z.t).join("／"):KPAY[k]?KPAY[k].map(z=>z.t.replace(/（永久）$/,"")).join("／"):"沒人知道")};   // v0.52：每位王自己的三種貨幣
/* 每天：獸王的流程（斥候五連戰 → 半成品上門）。只有他會主動上門 */
function kingDay(notes){
  if(!kingsOpen()||!S.kq||S.raid||S.dead)return; const q=S.kq;
  if(S.kings.beast&&["neutral","ally"].includes(S.kings.beast.stance)&&q.phase!=="done"){S.kq={phase:"done"};return}   /* v0.59：跟獸王約好了，他就不會再上門 */
  if(q.phase==="scout"&&nowH()>=q.due){S.raid={name:"無名勢力的斥候",lv:GRADES[Math.min(6,gIdx(S.lv)+1)],size:"一波接一波的野獸斥候",king:"beast",kind:"scout",ofK:5,due:nowH(),seen:true,prep:[],comp:["狼","鷹","狐"]};
    q.phase="scoutOn"; notes.push("〈系統〉巢穴外面出現了一群沒有報名號的斥候。")}
  else if(q.phase==="half"&&nowH()>=q.due){const form=BEAST_FORMS[rint(0,BEAST_FORMS.length-1)];
    S.raid={name:`獸王（${form}的形態）`,lv:"S",size:`一頭巨大的${form}`,king:"beast",kind:"half",form,ofK:7,due:nowH(),seen:true,prep:[],comp:[form]};
    q.phase="halfOn"; notes.push(`〈系統〉《大賢者》：「警告。八王之一，獸王，以${form}的形態來到${NEST()}外面。」`)}
}
/* 在老巢開戰：完全體八王戰 */
function kingFight(k,help){
  const K=kingOf(k), x=S.kings[k]; if(busy||S.raid||!x||x.ate||x.beaten||S.at!==K.lair||lairHid(k))return;
  const pre=snap(); S.log.push({who:"you",text:`向${K.t}開戰${help&&helpers(k).includes(help)?`（請${kingOf(help).t}來幫忙）`:""}`,pre});
  S.raid={name:K.t,lv:"S",size:K.desc,king:k,kind:"full",ofK:7,at:S.at,on:true,stage:1,of:7,wins:0,fails:0,mom:0,prep:[],comp:k==="beast"?BEAST_FORMS.slice():[K.t],seen:true};
  helpSet(S.raid,help);
  x.stance="war"; S.opts=[]; save(); doJob({kind:"raid",ctx:{stage:1}},snap(),S.log.length);
}
const KSTEPS={scout:["遠處的鷹在盯著","狼群繞著洞口試探","狐狸鑽進了外洞","第二波撲上來","最後一批斥候"],
  half:["牠出現在巢穴外","第一次撲擊","巢穴被撕開一角","牠換了打法","硬碰硬","牠受傷發狂","最後一擊"],
  full:["王座前的第一擊","他換了形態","他叫來了手下","他看穿了你的打法","他用出最危險的一招","他拚上全部","最後一擊"]};
const BEAST_STEP=["化成狼群包圍你（範圍攻擊對路）","化成熊硬碰硬（要破甲）","化成鹿四處奔逃（要追得上）","化成鳥群擾亂視線（要靠感知）","化成鷹飛上天（要遠程）","五種形態輪流換","最後一擊"];
function kingAdv(r){
  const a=r.at&&r.at!==NEST()?[]:raidAdv(), x=S.kings&&S.kings[r.king];
  if(x&&x.know.weak&&r.kind!=="scout")a.unshift(`知道他的弱點：${kingOf(r.king).weak}`);
  if(r.help)a.unshift(`結盟的${kingOf(r.help).t}來幫你`);                // v0.52：幫一戰
  return a.slice(0,4);
}
const clownMem=ch=>!!(ch&&ch.raid&&S.raid&&S.raid.king==="clown"&&ch.useSk&&metaGet().clownKill===ch.useSk);
function kingEnd(r,end,a,notes){
  const k=r.king, K=kingOf(k), x=S.kings[k];
  if(end==="win"){
    if(r.kind==="scout"){S.kq={phase:"half",due:nowH()+3*24};kingReveal("beast","weak",notes);notes.push("斥候退走了。你從牠們身上弄清楚了一件事：牠們背後是一位王。")}
    else if(r.kind==="half"){S.kq={phase:"lair"};x.half=true;kingReveal("beast","lair",notes);
      notes.push(`獸王受了傷，逃回了他的老巢（${K.lair}）。你抓不到他，但你知道他在哪了。`);
      Object.keys(S.kings).forEach(z=>{S.kings[z].page=true}); notes.push("〈系統〉其他七位王的檔案頁也打開了。")}
    else{x.beaten=true; K_FIELDS.forEach(f=>kingReveal(k,f[0],null));
      if(!x.frag){x.frag=true;notes.push(`拿到 ${K.t} 的管理員通信記錄。管理員的手機：${phoneN()}/8`)}
      S.corpses.push({name:`${K.t}的屍體`,sp:K.t,lv:"S",t:nowH(),king:k}); notes.push(`${K.t}倒下了。屍體就在你面前（吃下它＝吞噬一位王）。`);
      if(k==="clown"&&r.lastSk){const M=metaGet();M.clownKill=r.lastSk;metaSave();}
      if(k==="beast")S.kq={phase:"done"}
      if(k==="worm"){x.tribute=0;if(x.hostage){const h=x.hostage;x.hostage=null;h.with=false;S.party.push(h);const y=S.npcs.find(z=>z.n===h.n);if(y)y.where=NEST();notes.push(`人質${h.n}從深淵裡走了出來，回到你身邊（先回${NEST()}）。`)}}}
    gains(a,true,notes);
  }else{
    if(r.kind==="scout"){S.kq={phase:"half",due:nowH()+3*24};notes.push("你沒能擋住斥候。牠們看夠了，退回森林裡。")}
    else{S.dead=true;S.deathWhy=`敗給了${K.t}`;S.deathKing=k;notes.push(`你敗給了${K.t}。`,"（可以按「撤回」回到之前。）")}
  }
  S.raid=null; endCheck(notes);
}
/* 吃掉八王的屍體＝吞噬一位王（devour 之後呼叫） */
function kingAte(c,notes){ if(!c||!c.king||!S.kings)return; const x=S.kings[c.king]; if(x&&!x.ate){x.ate=true;notes.push(`〈系統〉《世界之聲》：「第九名吞噬者吞下了${KINGS[c.king].t}。」`);endCheck(notes)} }
/* 問、偷、中立、巫妖情報、打聽 */
function kingAct(kind,k,arg){
  const K=kingOf(k), x=S.kings&&S.kings[k]; if(!x||busy||S.dead)return;
  if(["steal","neutral","ally"].includes(kind)&&lairHid(k))return;           // v0.53：還沒找到的王
  const pre=snap(), notes=[]; let txt="";
  if(kind==="steal"){if(x.frag||!x.know.hide||S.at!==K.lair)return; txt=`潛進去偷${K.t}的通信記錄`;
    advanceTime(4,notes); const d=Math.ceil(S.hp/2); S.hp-=d; checkDeath(notes); x.frag=true; x.stance="war";
    notes.push(`你從${x.hide}摸走了通信記錄（HP -${d}）。${K.t}發現了，從此把你當敵人。管理員的手機：${phoneN()}/8`)}
  else if(kind==="neutral"){if(S.at!==K.lair||x.stance||x.beaten)return; x.stance="neutral";   /* v0.59：八王都能溝通，本能不擋 */ txt=`和${K.t}約好互不侵犯`; notes.push(`${K.t}答應了：互不侵犯。`)}
  else if(kind==="lich"){if(k!=="lich"||S.at!==K.lair||(x.asks||0)>=3)return;
    const tg=arg&&arg.king, pay=arg&&arg.pay, T=S.kings[tg]; if(!T||tg==="lich"||!LICH_PAY[pay]||(x.paid||[]).includes(pay))return;
    if(pay==="life"){const p=S.party.find(z=>z.n===arg.who);if(!p)return;S.party=S.party.filter(z=>z!==p);npcGone(p.n,"被巫妖王收走了性命",notes,true);
      notes.push(`${p.n}的生命，被巫妖王收走了。${p.mate?"（你的伴侶）":""}`)}
    else{const it=arg.item;if(!it||!S.items.includes(it)||!LICH_PAY[pay].ok(it))return;S.items.splice(S.items.indexOf(it),1);delete S.mat[it];S.party.forEach(q=>{if(q.gear===it){q.gear=null;q.gearMat=null}});
      notes.push(`你交出了 ✦${it}。它不會再回來了。`)}
    x.asks=(x.asks||0)+1; x.paid=[...(x.paid||[]),pay]; if(!x.stance){x.stance="neutral";notes.push("巫妖王認可了你：互不侵犯。")} txt=`付出${LICH_PAY[pay].t}，向巫妖王打聽${kingOf(tg).t}`;
    notes.push(`巫妖王說了${kingOf(tg).t}的事。（巫妖王的情報：${x.asks}/3）`);
    let n=0; K_FIELDS.forEach(f=>{if(n<3&&kingReveal(tg,f[0],notes))n++}); if(!n)notes.push("（這位王你都已經知道了）");
    if(x.asks>=3)notes.push("巫妖王：「三次了。再要，就要你的命來支付了。」")}
  else if(kind==="ally"&&k==="elf"){if(S.at!==K.lair||lairHid(k)||ateN()>=3||x.stance==="ally"||x.stance==="war"||x.beaten)return;
    x.stance="ally"; txt="和精靈王結盟"; notes.push("精靈王接受了你：結盟。（打別的八王時，可以請他來幫一戰）")}
  else if(kind==="ally"){const need=ALLY_NEED[k]; if(!need||S.at!==K.lair||!S.kings[need].beaten||x.stance==="ally"||x.stance==="war"||x.beaten)return;
    x.stance="ally"; txt=`和${K.t}結盟`; notes.push(`${kingOf(need).t}死了。${K.t}接受了你：結盟。（打別的八王時，可以請他來幫一戰）`)}
  else if(kind==="study"){const f=K_FIELDS.find(z=>!x.know[z[0]]&&!(z[0]==="lair"&&lairHid(k))); if(!f)return;
    const fast=S.party.some(p=>p.dir==="斥候"&&!p.tags.includes("重傷")); txt=`打聽${K.t}的事`; advanceTime(fast?4:8,notes); kingReveal(k,f[0],notes);
    if(fast)notes.push("（有斥候同伴幫忙，花了 4 小時）")}
  else return;
  S.log.push({who:"you",text:txt,pre}); endCheck(notes); S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
/* 巫妖王的代價（用戶 11-11 23:12）：三次情報，每次一種代價，每種只能付一次；第四次再要＝決戰 */
const LICH_PAY={life:{t:"一條你看重的生命"},
  unique:{t:"一件獨特的聚落魔法物品",ok:n=>{const m=matOf(n);return !!(m&&m.unique)}},
  sgrade:{t:"一件 S 級的魔法物品",ok:n=>{const m=matOf(n);return !!(m&&m.skill&&m.lv==="S")}}};
function lichFinal(){
  const x=S.kings&&S.kings.lich; if(!x||(x.asks||0)<3||busy||S.raid)return;
  S.log.push(sysEntry("巫妖王：「要就要你的命來支付了。」")); kingFight("lich");
}
/* 管理員：手機 8/8 才能去找 */
function adminMeet(choice){
  if(busy||S.dead||phoneN()<8)return; const M=metaGet(), notes=[]; const pre=snap();
  if(!choice){S.metAdminLive=true;M.metAdmin=true;metaSave();S.log.push({who:"you",text:"用管理員的手機，去找管理員",pre});
    S.log.push(sysEntry(`〈系統〉管理員的手機 8/8。你找到了管理員。\n管理員：「我累啦，你想不想接手？你可以召喚卡車君帶人從地球到異世界哦？」`)); save(); render(); return}
  if(choice==="no"){S.log.push({who:"you",text:"拒絕管理員",pre});S.log.push(sysEntry("你拒絕了。管理員聳聳肩。（之後還可以再去找他）"));save();render();return}
  const k=choice==="yes"?"admin":"servant"; if(k==="servant"&&!Object.values(S.kings).some(x=>x.ate))return;
  S.ends[k]=S.day; if(!M.ends[k])M.ends[k]={day:S.day,run:(S.rebirths||0)+1}; metaSave();
  S.log.push({who:"you",text:choice==="yes"?"接受，接手管理員":"替管理員做事",pre});
  S.ended={k,day:S.day}; S.dead=true; S.log.push(sysEntry(`〈系統〉結局：${ENDINGS.find(e=>e.k===k).n}。`)); save(); TAB="story"; render();
}
function adminHTML(){
  if(!kingsOpen()||phoneN()<8||S.dead||(S.raid&&S.raid.admin))return "";
  if(S.adminDown)return `<div class="check"><h3>管理員亞當倒下了</h3><div class="padd" style="margin-top:6px"><button class="tl" id="admrule">成為管理員</button><button class="tl" id="admnone">沒有管理員</button></div><div class="note">選了這一局就結束（結局）。</div></div>`;
  const ate=Object.values(S.kings).some(x=>x.ate), met=S.metAdminLive;
  return `<div class="check"><h3>管理員的手機 8/8</h3>${met?`<div class="note">管理員：「我累啦，你想不想接手？你可以召喚卡車君帶人從地球到異世界哦？」</div>
    <div class="padd" style="margin-top:6px"><button class="tl" id="admyes">接受（接手管理員）</button>${ate?`<button class="tl" id="admsv">替他做事（管理員的部下）</button>`:""}<button class="tl" id="admno">拒絕</button><button class="tl" id="admkill">殺他</button></div>`
    :`<button class="tl" id="admgo">去找管理員</button>`}</div>`;
}
function kingsHTML(){
  if(!kingsOpen())return "";
  const rows=Object.keys(KINGS).map(k=>{const K=kingOf(k), x=S.kings[k], open=x.page||k==="beast";
    const st=(kingOK(k)?"認可・":"")+(x.ate?"已吞噬":x.beaten?"打倒了":x.stance==="ally"?"結盟":x.stance==="neutral"?"中立":x.stance==="war"?"敵對":"");
    return `<div class="npc"><div class="h"><b>${esc(K.t)}</b><span>${esc(K.al)}${st?`・${st}`:""}${x.frag?"・📱已拿到通信記錄":""}</span></div>
      ${open?`<div class="d">${esc(K.desc||"")}</div>${K_FIELDS.map(([f,l])=>`<div class="d">${l}：${x.know[f]?`<b>${esc(kingField(k,f))}</b>`:"？？？"}</div>`).join("")}
      ${clueLine(k)}${K_FIELDS.some(([f])=>!x.know[f]&&!(f==="lair"&&lairHid(k)))&&!S.dead?`<button class="tl" data-kst="${k}">打聽（${S.party.some(p=>p.dir==="斥候")?4:8} 小時，揭開 1 欄）</button>`:""}`:`<div class="d">檔案還沒打開。</div>`}</div>`}).join("");
  return `<div class="card"><h3>八王檔案</h3>${nineLine()}<div class="note">管理員的手機：${phoneN()}/8（每位王身上一片通信記錄：問、偷、或打倒他拿）。${metaGet().clownKill?`小丑王記得你上一次用「${esc(metaGet().clownKill)}」殺了他。`:""}</div>${rows}</div>`;
}
function lairHTML(){
  const n=S.at, nd=S.world[n]; if(!nd||!nd.king||!S.kings||S.dead)return "";
  const k=nd.king, K=kingOf(k), x=S.kings[k], w=K_WANT[x.want], sk=S.skills.filter(z=>!isUq(z)&&!z.past);
  if(lairHid(k))return `<div class="card"><h3>${esc(K.t)}的行蹤</h3><div class="note">${x.lost?`${esc(K.t)}不會出現了。`:`在這裡探索，找${esc(K.t)}留下的線索（${x.clue||0}/3）。第三條線索會帶你找到他。`}</div></div>`;
  const b=[];
  if(!x.ate&&!x.beaten)b.push(`${helpSel(k)}<button class="tl" data-kf="${k}">向他開戰（八王戰）</button>`);
  if(!x.frag&&x.know.hide)b.push(`<button class="tl" data-ka="steal|${k}">潛進去偷通信記錄（4 小時、HP 減半，他會變成敵人）</button>`);
  if(!x.stance)b.push(`<button class="tl" data-ka="neutral|${k}">約好互不侵犯</button>`);
  if(k==="lich")b.push(lichHTML(x));
  b.push(kingPayHTML(k,x),allyHTML(k,x));
  if(k==="clown")b.push(riddleHTML(x));
  return `<div class="card"><h3>${esc(K.t)}的領域</h3><div class="note">${esc(K.desc)}${k==="clown"?`<br>小丑王：「${CLOWN_LINE}」`:""}</div><div class="padd" style="flex-wrap:wrap">${b.join("")}</div></div>`;
}
let KC="";

/* 送給模型的八王資料：只有主角知道的欄位；小丑王只在他出場時才給「最有心機」那一句 */
function kingsState(){
  const out={說明:"八王是 D&D 八個陣營的吞噬者之王（S 級），主角是絕對中立的第九王。他們知道主角，但不急著出手。只能寫主角已經知道的事，「？？？」的不要替主角揭開；八王的勝負、通信記錄、檔案都由程式決定。"};
  Object.keys(KINGS).forEach(k=>{const K=kingOf(k), x=S.kings[k]; if(!x.page&&k!=="beast")return;
    const o={陣營:K.al,狀態:x.ate?"已被主角吞噬":x.beaten?"被主角打倒":x.stance||"還沒交手"};
    K_FIELDS.forEach(([f,l])=>{o[l]=x.know[f]?kingField(k,f):"？？？"});
    if(k==="clown"&&(S.at===K.lair||(S.raid&&S.raid.king==="clown"))){o.扮演提示=`這位是八王裡最有心機的：只要混亂，會說謊、挑撥、假裝合作。他開口一定先說「${CLOWN_LINE}」。他可以在對話裡騙主角，但程式管的數字、物品、關係、檔案你不能改。其他王不是這樣。`}
    out[K.t]=o});
  return out;
}

function lichHTML(x){
  const asks=x.asks||0, paid=x.paid||[];
  const ally="";                                   // v0.52：結盟改由 allyHTML 統一顯示
  if(asks>=3)return `<div class="d" style="width:100%">巫妖王的情報已經給了三次。<br><button class="tl" id="lichfin">${LC?"確定？這是決戰（八王戰，輸了會死）":"再向他要情報（決戰）"}</button>${ally}</div>`;
  const kings=Object.keys(KINGS).filter(z=>z!=="lich"&&S.kings[z].page!==false), uni=S.items.filter(n=>LICH_PAY.unique.ok(n)), sg=S.items.filter(n=>LICH_PAY.sgrade.ok(n));
  const opt=(v,t,ok,why)=>`<option value="${v}"${ok&&!paid.includes(v)?"":" disabled"}>${t}${paid.includes(v)?"（付過了）":ok?"":`（${why}）`}</option>`;
  return `<div class="d" style="width:100%"><b>向巫妖王要情報</b>（${asks}/3）：選一位王，一次揭開他 3 欄。每次付一種代價，每種只能付一次。
    <div class="padd" style="flex-wrap:wrap;margin-top:4px"><select id="lichk">${kings.map(z=>`<option value="${z}">${esc(kingOf(z).t)}</option>`).join("")}</select>
    <select id="lichp">${opt("life","一條你看重的生命",S.party.length>0,"身邊沒有同伴")}${opt("unique","一件獨特的聚落魔法物品",uni.length>0,"還沒有")}${opt("sgrade","一件 S 級的魔法物品",sg.length>0,"還沒有")}</select>
    <select id="lichw">${S.party.map(p=>`<option value="${esc(p.n)}">${p.mate?"💍":""}${esc(p.n)}</option>`).join("")}${[...uni,...sg].map(n=>`<option value="item:${esc(n)}">✦${esc(n)}</option>`).join("")}</select>
    <button class="tl" id="lichgo">${LC==="go"?"確定付出？（回不來）":"付出代價"}</button></div>
    ${ally}</div>`;
}
let LC="";

/* ═════════ v0.52：八王各自的三種貨幣、結盟、幫一戰、加護、背叛、小丑王（設計見專案《魔物篇_八王殘酷選擇_1111》）═════════
   每位王三種貨幣，每種只能付一次；每付一種，自己選換一樣：通信記錄／加護／他的檔案全開（各一次）。巫妖王照 v0.51。
   結盟要先殺另一位王（巫妖←金龍、金龍←巨人、巨人←金龍、獨角獸←紫蟲、紫蟲←獨角獸、獸王←小丑王）；小丑王是三種都付清才結盟。
   結盟的王可以來幫你打一場八王戰（每位一次，那一整場每階段多一層優勢）。
   x.paid＝付過的貨幣、x.got＝換過的東西、x.helped＝幫過一戰；S.bless＝加護；S.law＝金龍王的律令；S.vow＝不吃類人的誓；
   S.betray＝背叛次數；S.alone＝小丑王第三項（沒有巢穴、同伴、伴侶）；S.trueName＝知道管理員的真名。 */
const BETRAY_N=3;                                  // 小丑王第一項的門檻（用戶：3 或 5，之後用機器人測）
const ADMIN_NAME="亞當";
const ALLY_NEED={lich:"gold",gold:"giant",giant:"gold",uni:"worm",worm:"uni",beast:"clown"};
const ruledList=()=>Object.keys(S.world||{}).filter(n=>domOf(n)===3&&!S.world[n].razed);
const friendList=()=>Object.keys(S.world||{}).filter(n=>isSettle(n)&&S.world[n].known&&!S.world[n].razed&&stOf(n)>=2);
const compList=()=>S.party.filter(p=>!p.temp);
const beastComp=()=>compList().filter(p=>!isHumanoid({sp:p.kind,name:p.n}));
function razeSettle(n,why,notes){
  const x=S.world[n]; if(!x||x.razed)return;
  x.razed=true; x.dom=0; x.kind="廢墟"; x.note=`${why}，只剩廢墟。`.slice(0,60); S.razed=[...(S.razed||[]),n];
  S.npcs.filter(y=>y.where===n&&!S.party.some(p=>p.n===y.n)).forEach(y=>npcGone(y.n,"聚落被消滅",notes));
  notes.push(`〈系統〉${n}${why}。`);
}
const KPAY={
 gold:[
  {id:"evil",get t(){return evilAbd()?"退位：放棄巢穴之主的身分（這一局拿不到酋長、共主、皇帝）":"消滅三個非人類的聚落（之前消滅的也算）"},
   can:()=>evilAbd()?(S.abdicated?"已經退位了":null):(evilN()>=3?null:`現在 ${evilN()}/3`),
   do:(a,n)=>{if(evilAbd()){S.abdicated=true;n.push("你在金龍王面前退位。巢穴還是你的家，但你不再是巢穴之主。（這一局拿不到酋長、共主、皇帝）")}else n.push(`金龍王數了數：你消滅了 ${evilN()} 個邪惡的據點。他很滿意。`)}},
  {id:"corpse",t:"交出冰霜巨人王的屍體（不能吃）",can:()=>giantCorpse()>=0?null:S.kings.giant.ate?"冰霜巨人王已經被你吃了":"要先殺了冰霜巨人王，而且屍體還沒被吃掉",
   do:(a,n)=>{S.corpses.splice(giantCorpse(),1);S.kings.giant.given=true;n.push("你把冰霜巨人王的屍體交給了金龍王。這位王，你再也吞噬不到了。")}},
  {id:"mates2",t:"交出兩位伴侶",opts:()=>{const m=mates().map(p=>p.n), o=[];m.forEach((x,i)=>m.slice(i+1).forEach(y=>o.push([`${x}|${y}`,`${x}、${y}`])));return o},
   do:(a,n)=>{a.split("|").forEach(z=>npcGone(z,"被交給了金龍王",n,true))}}],
 elf:[
  {id:"elfback",t:"歸還從精靈身上得到的一切（精靈語、從精靈學來的技能、精靈的物品）",can:()=>{const e=elfStuff();return e.lang||e.sk.length||e.it.length?null:"你身上沒有從精靈得來的東西"},
   do:(a,n)=>{const e=elfStuff();if(e.lang)S.langs=S.langs.filter(l=>l!=="精靈語");S.skills=S.skills.filter(z=>!e.sk.includes(z));
    e.it.forEach(i=>{S.items.splice(S.items.indexOf(i),1);delete S.mat[i];S.party.forEach(q=>{if(q.gear===i){q.gear=null;q.gearMat=null}})});
    n.push(`你把從精靈身上得到的都還了回去：${[e.lang?"精靈語":"",...e.sk.map(z=>`「${z.n}」`),...e.it.map(i=>`✦${i}`)].filter(Boolean).join("、")}。`)}},
  {id:"kingpow",t:"放下一位王的力量（吞噬那位王得到的技能全部失去）",opts:()=>Object.keys(KINGS).filter(k=>S.skills.some(z=>z.srcK===k)).map(k=>[k,`${kingOf(k).t}（${S.skills.filter(z=>z.srcK===k).map(z=>z.n).join("、")}）`]),
   do:(a,n)=>{const l=S.skills.filter(z=>z.srcK===a);S.skills=S.skills.filter(z=>z.srcK!==a);n.push(`你放下了${kingOf(a).t}的力量：${l.map(z=>`「${z.n}」`).join("、")}再也用不了。`)}},
  {id:"guard",t:"留下一位同伴，在精靈村當守林人",opts:()=>compList().map(p=>[p.n,`${p.mate?"💍":""}${p.n}`]),do:(a,n)=>npcGone(a,"留在精靈村當守林人",n,true)}],
 giant:[
  {id:"raze",t:"消滅一個友好以上的聚落",opts:()=>friendList().map(z=>[z,`${z}（${SREL[stOf(z)+2]}）`]),do:(a,n)=>{razeSettle(a,"被你消滅了",n);heatAdd(3,`${a}被哥布林消滅了`,n)}},
  {id:"duel",t:"當著他的面，和自己的一位同伴決鬥到死",opts:()=>compList().map(p=>[p.n,`${p.mate?"💍":""}${p.n}`]),do:(a,n)=>{const p=S.party.find(q=>q.n===a);npcGone(a,"在冰霜巨人王面前和你決鬥，死了",n,true);n.push(`你和${a}決鬥。倒下的是${a}。${p&&p.mate?"（你的伴侶）":""}`)}},
  {id:"divine",t:"交出神兵",can:()=>S.divine?null:"你沒有神兵（轉生時才鑄得出來）",do:(a,n)=>{n.push(`你把神兵「${S.divine.name}」交給了冰霜巨人王。它不會再跟著你，轉生也不會。`);S.divine=null}}],
 uni:[
  {id:"freeAll",t:"放走所有向你稱臣的聚落",can:()=>ruledList().length?null:"沒有向你稱臣的聚落",do:(a,n)=>{const l=ruledList();l.forEach(z=>{S.world[z].dom=0});n.push(`${l.join("、")}不再向你稱臣。`)}},
  {id:"mate",t:"放一位伴侶回她的族裡",opts:()=>mates().map(p=>[p.n,p.n]),do:(a,n)=>{npcGone(a,"回到了她的族裡",n,true)}},
  {id:"vow",t:"發誓不再吃類人（永久）",can:()=>S.vow?"已經發過誓了":null,do:(a,n)=>{S.vow=true;n.push("你在獨角獸王面前發誓：從此不再吃類人。")}}],
 worm:[
  {id:"tribute",t:"立約上貢：每 10 天交 10 份存糧，違約他就來",do:(a,n)=>{S.kings.worm.tribute=S.day+10;n.push(`紫蟲王記下了這筆帳：第 ${S.day+10} 天起，每 10 天從巢穴拿走 10 份存糧。`)}},
  {id:"hostage",t:"一位同伴當人質，住在他那裡",opts:()=>compList().map(p=>[p.n,`${p.mate?"💍":""}${p.n}`]),do:(a,n)=>{const p=S.party.find(q=>q.n===a);S.party=S.party.filter(q=>q!==p);
    S.kings.worm.hostage=p;const x=S.npcs.find(y=>y.n===a);if(x)x.where=kingOf("worm").lair;n.push(`${a}留在紫蟲王的深淵，當你的人質。`)}},
  {id:"feed",t:"把一個向你稱臣的聚落給他吃掉",opts:()=>ruledList().map(z=>[z,z]),do:(a,n)=>razeSettle(a,"被紫蟲王整個吞掉了",n)}],
 beast:[
  {id:"pop",t:"巢穴人口降兩格",can:()=>S.alone?"你沒有巢穴":S.nest.pop>=3?null:"人口不到兩格可以降",do:(a,n)=>{S.nest.pop-=2;nestSync();n.push(`巢穴的同類有一部分被獸王帶走了。人口：${POP[S.nest.pop-1]}。`)}},
  {id:"lv",t:"巢穴降一級",can:()=>S.alone?"你沒有巢穴":S.nest.lv&&S.nest.lv!=="F"?null:"巢穴還沒有 E 級以上",do:(a,n)=>{const nn=S.nest, f=(nn.fac||[]).pop();nn.lv=GRADES[gIdx(nn.lv)-1];nn.pts=0;nn.pick=null;
    if(f){delete (nn.facT||{})[f];S.party.forEach(p=>{if(p.fac===f)p.fac=null})}n.push(`巢穴降到 ${nn.lv} 級，物資點數歸零${f?`，〔${f}〕被拆了`:""}。`)}},
  {id:"beast",t:"交出一位野獸系同伴，讓牠回歸自然",opts:()=>beastComp().map(p=>[p.n,`${p.n}（${p.kind}）`]),do:(a,n)=>npcGone(a,"回歸了自然",n,true)}],
 clown:[
  {id:"betray",t:`背叛盟友 ${BETRAY_N} 次以上（在友好、同盟的聚落選「背叛」）`,can:()=>(S.betray||0)>=BETRAY_N?null:`現在 ${S.betray||0}/${BETRAY_N}`,do:(a,n)=>n.push(`小丑王數著你背叛過的人：${S.betray} 個。他笑得很開心。`)},
  {id:"kings",t:"殺掉除了他以外的七位王",can:()=>{if(S.kings.elf.lost)return "精靈王不會出現了，這一項付不出來";const l=Object.keys(KINGS).filter(k=>k!=="clown"&&!S.kings[k].beaten);return l.length?`還剩 ${l.length} 位`:null},do:(a,n)=>n.push("小丑王：「七個都死了啊。」")},
  {id:"alone",t:"不再有巢穴、同伴、伴侶——只剩你自己、裝備和技能（永久）",can:()=>S.alone?"已經是一個人了":null,do:(a,n)=>goAlone(n)}]
};
const KBLESS={elf:"回家的儀式（回家的結局還沒做，先記下來）",gold:"替你壓下人類的討伐一次（注目度歸零，正在路上的討伐隊撤回）",giant:"他的氏族來替你守一次討伐戰（那一整場每階段多一層優勢）",
  uni:"治好一處捨身留下的永久傷",worm:"一次判定裡，你付的一項代價由他替你付",beast:"森林的野獸不再襲擊你"};
const KREW=k=>[["frag","他的通信記錄"],...(KBLESS[k]?[["bless",`加護：${KBLESS[k]}`]]:[]),["file","他的檔案全開"]];
function goAlone(n){
  S.party.slice().forEach(p=>{if(p.temp){S.party=S.party.filter(q=>q!==p);n.push(`和${p.n}的契約作廢，${p.n}回到${p.temp.home}。`)}else npcGone(p.n,p.mate?"你為了小丑王離開了她":"被你丟下了",n,true)});
  S.npcs.filter(x=>x.where===NEST()&&(x.captive||x.contract)).forEach(x=>npcGone(x.n,"巢穴沒了，散了",n));
  const w=S.world[NEST()]; if(w){w.kind="廢棄的巢穴";w.note="你自己丟下的巢穴。"}
  Object.assign(S.nest,{food:0,pop:1,d:1,lv:null,pts:0,fac:[],facT:{},pick:null,tags:[]}); S.offer=null; S.alone=true; nestSync();
  if(S.raid&&!S.raid.king&&!S.raid.on)S.raid=null;
  S.alone=true; n.push("〈系統〉你丟下了巢穴、同伴和伴侶。從現在起只有你自己、你的裝備、你的技能。（之後不能再收同伴、建巢穴、抓俘虜、訂契約）");
}
function kingPay(k,id,arg,rew){
  const K=kingOf(k), x=S.kings&&S.kings[k], c=(KPAY[k]||[]).find(z=>z.id===id);
  if(!x||!c||busy||S.dead||S.at!==K.lair||lairHid(k)||!x.know.want||x.stance==="war"||x.beaten||(x.paid||[]).includes(id))return;
  if(c.can&&c.can())return; if(c.opts&&!c.opts().some(o=>o[0]===arg))return;
  const pre=snap(), notes=[];
  S.log.push({who:"you",text:`向${K.t}付出：${c.t.replace(/（永久）$/,"")}${arg?`（${arg}）`:""}`,pre});
  c.do(arg,notes); x.paid=[...(x.paid||[]),id];
  if(!x.stance){x.stance="neutral";notes.push(`${K.t}認可了你：互不侵犯。`)}   /* v0.60：付一種代價＝認可＋中立 */
  if(rew&&KREW(k).some(r=>r[0]===rew)&&!(x.got||[]).includes(rew)){x.got=[...(x.got||[]),rew];
    if(rew==="frag"){if(!x.frag){x.frag=true;notes.push(`${K.t}給了你他的管理員通信記錄。管理員的手機：${phoneN()}/8`)}else notes.push("（他的通信記錄你已經有了）")}
    else if(rew==="file"){let m=0;K_FIELDS.forEach(f=>{if(kingReveal(k,f[0],notes))m++});if(!m)notes.push("（他的檔案你都已經知道了）")}
    else if(rew==="bless")kingBless(k,notes)}
  if(k==="clown"&&x.paid.length>=3&&x.stance!=="ally"){x.stance="ally";S.trueName=true;
    notes.push("小丑王：「好啊，結盟。」",`小丑王告訴你管理員的真名：${ADMIN_NAME}。`,"還有殺死他的辦法：沒有真名的時候，對他做什麼都會被他秒殺；知道真名，他就殺得死。要連打七場。","小丑王不會陪你去。（管理員的手機 8/8 見到他時，可以選「殺他」）")}
  endCheck(notes); S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
function kingBless(k,notes){
  S.bless=S.bless||{};
  if(k==="gold"){S.heat=0;if(S.raid&&!S.raid.king&&!S.raid.on){notes.push(`${S.raid.name}接到了撤退的命令。`);S.raid=null}notes.push("金龍王的加護：人類的注目度歸零。")}
  else if(k==="elf"){S.ritual=true;notes.push("精靈王教了你回家的儀式。（回家的結局之後的版本才有）")}
  else if(k==="beast"){S.bless.beast=true;notes.push("獸王的加護：森林的野獸不再襲擊你。")}
  else{S.bless[k]=1;notes.push(`${kingOf(k).t}的加護：${KBLESS[k]}。（留著，用的時候才算）`)}
}
/* 獨角獸王的加護：治好一處捨身的傷。S.sacHurt 記每一次捨身（v0.52 起才記；舊存檔只認得【殘缺】） */
function sacHurtList(){
  const l=(S.sacHurt||[]).map((h,i)=>[String(i),h.k==="hp"?"HP 上限 -5":h.k==="maim"?"【殘缺】":`失去的技能「${h.sk&&h.sk.n}」`]);
  if(!l.some(z=>/殘缺/.test(z[1]))&&hasTag("殘缺"))l.push(["tag","【殘缺】"]);
  return l;
}
function uniHeal(v){
  if(busy||S.dead||!S.bless||!S.bless.uni)return; const pre=snap(), notes=[];
  if(v==="tag"){if(!hasTag("殘缺"))return;S.tags=S.tags.filter(t=>t!=="殘缺");notes.push("獨角獸王的角碰了你一下。【殘缺】好了。")}
  else{const h=(S.sacHurt||[])[+v];if(!h)return;S.sacHurt.splice(+v,1);
    if(h.k==="hp"){S.hpMax+=5;notes.push(`獨角獸王的角碰了你一下。HP 上限 +5（${S.hpMax}）。`)}
    else if(h.k==="maim"){if(!S.sacHurt.some(z=>z.k==="maim"))S.tags=S.tags.filter(t=>t!=="殘缺");notes.push("獨角獸王的角碰了你一下。【殘缺】好了。")}
    else if(h.sk){if(!S.skills.some(s=>s.n===h.sk.n))S.skills.push(h.sk);notes.push(`獨角獸王的角碰了你一下。你想起了「${h.sk.n}」。`)}}
  S.bless.uni=0; S.log.push({who:"you",text:"請獨角獸王治傷",pre}); S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
/* 背叛：在友好、同盟的聚落動手。關係直接變敵對，算一次背叛（小丑王第一項） */
function betray(n){
  if(busy||S.dead||S.at!==n||!isSettle(n)||stOf(n)<2)return;
  const pre=snap(), notes=[], x=S.world[n];
  S.log.push({who:"you",text:`背叛${n}`,pre});
  advanceTime(2,notes); const was=stOf(n); x.st=-2; x.grudge=(x.grudge||0)+1; S.betray=(S.betray||0)+1;
  notes.push(`你在${n}背後動手。${n}對你：${SREL[was+2]} → 敵對。他們會記住這件事。`,`（背叛：${S.betray} 次）`);
  endCheck(notes); S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
let BTC="", KPC="";
/* 紫蟲王的上貢：到期從巢穴拿 10 份；不夠＝違約，他上門（八王戰，在巢穴打） */
function wormDay(notes){
  const x=S.kings&&S.kings.worm; if(!x||!x.tribute||x.beaten||S.day<x.tribute)return;
  if(!S.alone&&(S.nest.food||0)>=10){S.nest.food-=10;x.tribute+=10;nestSync();notes.push(`〔上貢〕紫蟲王拿走了 10 份存糧。下一次：第 ${x.tribute} 天。`);return}
  if(S.raid)return;                               // 已經有別的仗在路上：等打完再說
  x.tribute=0; x.stance="war";
  S.raid={name:"紫蟲王",lv:"S",size:kingOf("worm").desc,king:"worm",kind:"full",ofK:7,due:nowH(),seen:true,prep:[],comp:["紫蟲王"]};
  notes.push("〈系統〉《大賢者》：「警告。上貢不足。紫蟲王來收帳了。」");
}
/* 幫一戰：能叫來幫忙的結盟的王 */
const helpers=k=>Object.keys(S.kings||{}).filter(z=>z!==k&&S.kings[z].stance==="ally"&&!S.kings[z].helped&&!S.kings[z].beaten);
const helpSel=k=>{const h=helpers(k);return h.length?`<select id="khelp"><option value="">不叫結盟的王</option>${h.map(z=>`<option value="${z}">請${esc(kingOf(z).t)}來幫這一戰（只有一次）</option>`).join("")}</select>`:""};
function helpSet(r,h){if(!r||!r.king||!h||!helpers(r.king).includes(h))return;r.help=h;S.kings[h].helped=true}
function kingPayHTML(k,x){
  if(k==="lich"||!KPAY[k]||x.beaten||!x.know.want)return "";
  if(x.stance==="war")return `<div class="note" style="width:100%">${esc(kingOf(k).t)}把你當敵人，不會再收你的代價。</div>`;
  const paid=x.paid||[], got=x.got||[], rw=KREW(k).filter(r=>!got.includes(r[0]));
  return `<div class="d" style="width:100%"><b>向${esc(kingOf(k).t)}付代價</b>（每種只能付一次，付了回不來）${k==="clown"?"：三種都付清就結盟，他會告訴你管理員的真名和殺死他的辦法。":""}
    <div class="padd" style="flex-wrap:wrap;margin-top:4px">${rw.length?`<label class="note">換什麼：</label><select id="kpr">${rw.map(r=>`<option value="${r[0]}">${esc(r[1])}</option>`).join("")}</select>`:`<span class="note">（他能給的都給過了）</span>`}</div>
    ${KPAY[k].map(c=>{const done=paid.includes(c.id), why=!done&&c.can&&c.can(), op=!done&&c.opts?c.opts():null, off=done||why||(op&&!op.length);
      return `<div class="padd" style="flex-wrap:wrap;margin-top:4px"><span>${done?"✓ ":""}${esc(c.t)}</span>${op&&op.length?`<select id="kpw_${c.id}">${op.map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("")}</select>`:""}
        ${done?`<span class="note">（付過了）</span>`:off?`<span class="note">（${esc(why||"沒有可以付的")}）</span>`:`<button class="tl" data-kp="${k}|${c.id}">付出</button>`}</div>`}).join("")}</div>`;
}
function allyHTML(k,x){
  if(k==="elf"&&!x.beaten&&x.stance!=="war"){if(x.stance==="ally")return `<div class="note" style="width:100%">已結盟${x.helped?"（幫過你一戰了）":"：打別的八王時可以請他來幫一戰"}</div>`;
    return ateN()>=3?`<div class="note" style="width:100%">精靈王：「你吞了太多王。我不跟你結盟。」</div>`:`<button class="tl" data-ka="ally|elf">和精靈王結盟</button>`}
  const need=ALLY_NEED[k]; if(!need||x.beaten)return "";
  if(x.stance==="ally")return `<div class="note" style="width:100%">已結盟${x.helped?"（幫過你一戰了）":"：打別的八王時可以請他來幫一戰"}</div>`;
  if(x.stance==="war")return "";
  return S.kings[need].beaten?`<button class="tl" data-ka="ally|${k}">和${esc(kingOf(k).t)}結盟（${esc(kingOf(need).t)}已死）</button>`:`<div class="note" style="width:100%">${esc(kingOf(k).t)}：要結盟，先殺了${esc(kingOf(need).t)}。</div>`;
}
function blessHTML(){
  const b=S.bless||{}, out=[];
  if(b.beast)out.push("獸王：森林的野獸不再襲擊你");
  if(b.giant)out.push("冰霜巨人王：下一場討伐戰，他的氏族來守");
  if(b.worm)out.push("紫蟲王：一次判定裡替你付一項代價（判定卡上勾選）");
  const uh=b.uni?sacHurtList():[];
  const tri=S.kings&&S.kings.worm&&S.kings.worm.tribute?`<div class="d">紫蟲王的上貢：第 ${S.kings.worm.tribute} 天要交 10 份存糧</div>`:"";
  const flags=[S.vowHuman?"金龍教的受洗：不吃人類":"",S.abdicated?"在金龍王面前退位了（這一局拿不到酋長、共主、皇帝）":"",S.ritual?"精靈王教的回家儀式（回家的結局之後才有）":"",S.law?"金龍王的律令：不能突襲、消滅聚落":"",S.vow?"對獨角獸王的誓：不吃類人":"",S.alone?"小丑王：你沒有巢穴、同伴、伴侶":"",(S.betray||0)?`背叛過 ${S.betray} 次`:"",S.trueName?`管理員的真名：${ADMIN_NAME}`:""].filter(Boolean);
  if(!out.length&&!b.uni&&!tri&&!flags.length)return "";
  return `<div class="card"><h3>加護與代價</h3>${out.map(t=>`<div class="d">${esc(t)}</div>`).join("")}
    ${b.uni?`<div class="d">獨角獸王：治好一處捨身的傷${uh.length?`<div class="padd" style="margin-top:4px"><select id="uhsel">${uh.map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join("")}</select><button class="tl" id="uhgo">治好它</button></div>`:"（你身上沒有捨身的傷，先留著）"}</div>`:""}
    ${tri}${flags.map(t=>`<div class="d">${esc(t)}</div>`).join("")}</div>`;
}
/* 送給模型：主角身上和八王有關的永久狀態 */
function kingVows(){
  const b=S.bless||{}, o=[];
  if(S.alone)o.push("主角為了小丑王丟下了巢穴、同伴、伴侶：現在只有自己一個人，不能寫同伴、族人出場，也沒有巢穴可以回");
  if(S.law)o.push("主角身上刻著金龍王的律令：不能突襲、消滅任何聚落");
  if(S.vow)o.push("主角對獨角獸王發過誓：不吃類人（不要寫主角吃類人）");
  if(S.vowHuman)o.push("主角在金龍教受過洗：不吃人類（不要寫主角吃人類）");
  if(S.abdicated)o.push("主角在金龍王面前退位了：不再是巢穴之主");
  if(S.ritual)o.push("主角從精靈王那裡學到了回家的儀式（還沒用）");
  if(b.beast)o.push("獸王的加護：森林的野獸不會襲擊主角（不要寫野獸主動攻擊主角）");
  if(S.kings&&S.kings.worm&&S.kings.worm.hostage)o.push(`${S.kings.worm.hostage.n}是主角留在紫蟲王那裡的人質，不在主角身邊`);
  if(S.trueName)o.push(`主角從小丑王那裡知道了管理員的真名（${ADMIN_NAME}）。不要讓主角對別人說出來，除非玩家自己寫`);
  if(S.adminDown)o.push(`管理員${ADMIN_NAME}已經倒下了，主角正要決定之後的世界`);
  if(S.ritual||artN()||S.cores)o.push(`回家的材料：神器 ${artN()}/8、S 級核心 ${S.cores||0} 顆${S.ritual?"、精靈王的儀式":""}`);
  return o;
}

/* ═════════ v0.53：找到精靈王、金龍王；兩位王的新代價（設計見專案《魔物篇_精靈王與殺死管理員_1112》）═════════
   精靈王：精靈村同盟 → 告訴你行蹤 → 在那裡探索 3 次（每次一條線索）→ 找到他。找到之前精靈村被消滅＝他不會出現。
   金龍王：人類城鎮同盟 → 金龍教要你受洗（發誓不再吃人類）→ 告訴你行蹤 → 探索 3 次 → 找到他。
   x.trace＝知道行蹤、x.clue＝線索數、x.found＝找到了、x.lost＝不會出現了；S.vowHuman＝受洗的誓；S.abdicated＝退位；S.ritual＝回家的儀式。 */
const K_CLUE={elf:"精靈村",gold:"人類城鎮"};
const HUMAN_RE=/人類|冒險者|衛兵|商人/;
const lairHid=k=>!!K_CLUE[k]&&!!S.kings&&!!S.kings[k]&&!S.kings[k].found;
const ateN=()=>Object.values(S.kings||{}).filter(x=>x.ate).length;
const evilN=()=>(S.razed||[]).filter(n=>!/人類/.test(n)).length;
const evilLeft=()=>Object.keys(S.world||{}).filter(n=>isSettle(n)&&!S.world[n].razed&&!/人類/.test(n)&&S.world[n].kind!=="廢棄的巢穴").length;
const evilAbd=()=>evilN()<3&&evilN()+evilLeft()<3;            // 世界上剩下的非人類聚落湊不到 3 個 → 這一項變成退位
const giantCorpse=()=>(S.corpses||[]).findIndex(c=>c.king==="giant");
function elfStuff(){
  return {lang:(S.langs||[]).includes("精靈語"),sk:S.skills.filter(z=>z.src==="精靈"),it:(S.items||[]).filter(i=>/精靈/.test(i))};
}
function clueLine(k){
  const x=S.kings[k]; if(!K_CLUE[k]||x.found)return "";
  return `<div class="d">${x.lost?`${esc(kingOf(k).t)}不會出現了（${K_CLUE[k]}沒了）。`:x.trace?`行蹤：${esc(kingOf(k).t==="金龍王"?"金龍教":"精靈村")}說他在「${esc(kingOf(k).lair)}」。線索 ${x.clue||0}/3（去那裡探索）。`
    :k==="elf"?"要找他：精靈村跟你同盟，他們才會說。":"要找他：人類城鎮跟你同盟，金龍教的人才會來找你。"}</div>`;
}
function traceOpen(k,notes){
  const x=S.kings[k], K=kingOf(k), nd=S.world[K.lair], from=K_CLUE[k]; if(!nd)return;
  x.trace=true; nd.known=true; nd.links=nd.links||{}; nd.links[from]=3; if(S.world[from]){S.world[from].links=S.world[from].links||{};S.world[from].links[K.lair]=3}
  notes.push(`〈系統〉地圖上多了「${K.lair}」（從${from}走 3 小時）。在那裡探索三次，找${K.t}留下的線索。`);
}
/* 每回合檢查：精靈村同盟就說行蹤；精靈村、人類城鎮沒了，那位王就不會出現 */
function clueCheck(notes){
  if(!kingsOpen()||!S.kings)return;
  Object.keys(K_CLUE).forEach(k=>{const x=S.kings[k], v=K_CLUE[k]; if(!x||x.found||x.lost)return;
    if(!S.world[v]||S.world[v].razed){x.lost=true; const nd=S.world[kingOf(k).lair]; if(nd)nd.known=false;
      notes.push(`〈系統〉${v}沒了。${kingOf(k).t}的行蹤，再也沒有人知道了。`);return}
    if(x.trace||stOf(v)<3)return;
    if(k==="elf"){notes.push(`精靈村的長老告訴你：精靈王最後出現在「${kingOf(k).lair}」。`);traceOpen(k,notes)}
    else if(!x.asked){x.asked=true;notes.push("金龍教的人來找你：「受洗吧。發誓不再吃人類，我們就告訴你金龍王在哪裡。」（到人類城鎮，在地圖頁決定）")}});
}
/* 金龍教的受洗 */
function baptize(){
  const x=S.kings&&S.kings.gold; if(busy||S.dead||!x||x.trace||x.lost||S.at!=="人類城鎮"||stOf("人類城鎮")<3||!kingsOpen())return;
  const pre=snap(), notes=[]; S.log.push({who:"you",text:"在金龍教受洗",pre});
  advanceTime(1,notes); S.vowHuman=true; x.asked=true;
  notes.push("你在金龍教受洗，發誓不再吃人類。（永久：人類的屍體你不能吃）",`金龍教的人告訴你：金龍王在「${kingOf("gold").lair}」。`);
  traceOpen("gold",notes);
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
const baptHTML=()=>{const x=S.kings&&S.kings.gold;
  return x&&kingsOpen()&&!x.trace&&!x.lost&&S.at==="人類城鎮"&&stOf("人類城鎮")>=3&&!S.dead?`<br><button class="tl" id="bapt">受洗：發誓不再吃人類（金龍教告訴你金龍王在哪；永久）</button>`:""};
/* 探索：在王的行蹤找線索（第三條＝找到他） */
function clueSeed(){
  const nd=S.world[S.at]; if(!nd||!nd.king||!K_CLUE[nd.king])return null;
  const k=nd.king, x=S.kings[k], K=kingOf(k); if(!x||x.found||!x.trace||x.lost)return null;
  x.clue=(x.clue||0)+1;
  if(x.clue<3)return {label:`探索：${S.at}`,prompt:`【這段要發生的事（程序抽到的，照這個寫）】你在${S.at}探索，找到了${K.t}留下的第 ${x.clue} 條線索（共 3 條）。自己想一個符合他的痕跡（${K.desc}）。不要讓主角見到他本人。`};
  x.found=true; const n=[]; kingReveal(k,"lair",n);
  return {label:`探索：${S.at}`,prompt:`【這段要發生的事（程序抽到的，照這個寫）】你順著三條線索，在${S.at}找到了${K.t}本人（${K.desc}）。寫出第一次見到他的樣子。他還沒有出手。`};
}
/* 舊存檔：補精靈王的領域；已經揭開金龍王領域的當作找到了；精靈村、人類城鎮沒有就補上（藏在隨機地區） */
function kingsFix(o){
  if(!o||!o.world)return;
  ["精靈村","人類城鎮"].forEach(n=>{if(o.world[n])return; const d=DEMI.find(z=>z.n===n), region=SITE_REGIONS[rint(0,SITE_REGIONS.length-1)];
    o.world[n]={kind:d.kind,note:d.note,st:d.st,region,links:{},known:false};
    if(o.sites)o.sites.push({n,region,need:rint(2,4),found:false}); else{o.world[n].known=true;o.world[n].links[region]=3;if(o.world[region])o.world[region].links[n]=3}});
  if(!o.kings)return;
  const K=KINGS.elf; if(!o.world[K.lair]){o.world[K.lair]={kind:"八王領域",region:K.lair,note:K.desc,links:{[K.link]:3},known:false,king:"elf"};
    if(o.world[K.link]){o.world[K.link].links=o.world[K.link].links||{};o.world[K.link].links[K.lair]=3}}
  const g=o.kings.gold; if(g&&g.know&&g.know.lair&&!g.found)g.found=true;
  if(!o.dun){const s0=S;S=o;dunInit();S=s0}                    // v0.55：舊存檔補 S 級地城
  dunShow(o);                                                 // v0.56：地城一開始就標在地圖上
}

/* ═════════ v0.54：殺死管理員（設計見專案《魔物篇_精靈王與殺死管理員_1112》）═════════
   沒有真名就動手＝結局「有勇無謀」。有真名＝一個人七連戰（討伐戰引擎，S.raid.admin），每戰亞當改掉一條規則，你因為知道真名多一層優勢；輸四場死。
   贏了選「成為管理員」「沒有管理員」（用戶寫的結局文字）。三個都是結局，之後照常轉生。 */
const ADMIN_STEP=["他關掉了你的技能（這一戰主角只能用物品和神兵）","他把你的等級改回 F（主角的身體一下子變回最弱的時候）","他叫出你殺過的王的影子",
  "他遮住了一切（主角看不見自己付了什麼）","他拿走了你的身體（主角的 HP 被砍掉一半）","他關掉了捨身","你叫出他的真名：亞當"];
const END_TXT={reckless:"你舉起武器。管理員沒有看你。",
  a_rule:"你進入一個空白木地板房間，房間內有大量的半透明藍色面板，這都是這個世界的元素，你想怎麼調整你就可以隨時調整。有一個藍色面板可以讓你召喚卡車君從地球召喚異世界人（任意人數）。",
  a_none:"你不是管理員、你也不是王、即使你吞噬了王，但規則本身已經不存在了，這個世界變成一片混沌。小丑王十分喜歡你，他是唯一的王了，他背棄跟你的盟約，你什麼都沒有。只有一個人在異世界持續不斷的逃亡。"};
function adminPrompt(r,c){
  return [`【殺死管理員・七連戰】（現在 ${timeStr()}，${PERIOD(S.hour)}，地點：${r.at||S.at}）`,
    `對手是這個世界的管理員，真名「${ADMIN_NAME}」。主角一個人來：沒有巢穴、沒有同伴，只有自己、裝備、技能。主角知道他的真名，所以這一次殺得死他。每一戰他都會改掉這個世界的一條規則。小丑王沒有來。輸了主角會死。`,
    `第 3 戰他叫出的影子是：${r.shadow}。`];
}
function adminStage(ch,stage){
  if(stage===1)ch.noSk=true;
  if(stage===2)ch.lvF=true;
  if(stage===4){ch.blind=true;ch.costs=(ch.costs||[]).sort(()=>Math.random()-0.5)}
  if(stage===6)ch.noSac=true;
}
function endSet(k,pre,txt){
  const M=metaGet(), e=ENDINGS.find(z=>z.k===k);
  S.ends[k]=S.day; if(!M.ends[k])M.ends[k]={day:S.day,run:(S.rebirths||0)+1}; metaSave();
  S.ended={k,day:S.day}; S.dead=true; S.log.push(sysEntry(`${END_TXT[k]}${txt||""}\n〈系統〉結局：${e.n}。`)); save(); TAB="story"; render();
}
function adminKill(){
  if(busy||S.dead||S.raid||!S.metAdminLive||phoneN()<8||S.adminDown)return; const pre=snap();
  S.log.push({who:"you",text:"對管理員動手",pre});
  if(!S.trueName){endSet("reckless");return}
  const beat=Object.keys(S.kings||{}).filter(k=>S.kings[k].beaten), sh=beat.length?kingOf(beat[rint(0,beat.length-1)]).t:"一位王";
  S.raid={name:`管理員${ADMIN_NAME}`,lv:"S",size:"這個世界的管理員",admin:true,kind:"admin",at:S.at,on:true,stage:1,of:7,wins:0,fails:0,mom:0,prep:[],comp:[ADMIN_NAME],seen:true,shadow:sh};
  S.opts=[]; save(); doJob({kind:"raid",ctx:{stage:1}},snap(),S.log.length);
}
function adminEnd(r,end,notes){
  S.raid=null;
  if(end==="win"){S.adminDown=true;notes.push(`〈系統〉管理員${ADMIN_NAME}倒下了。（下面選：成為管理員／沒有管理員）`)}
  else{S.dead=true;S.deathWhy=`敗給了管理員${ADMIN_NAME}`;notes.push(`你敗給了管理員${ADMIN_NAME}。`,"（可以按「撤回」回到之前。）")}
}
function adminFinal(c){
  if(busy||S.dead||!S.adminDown)return; const pre=snap();
  S.log.push({who:"you",text:c==="rule"?"成為管理員":"沒有管理員",pre}); endSet(c==="rule"?"a_rule":"a_none");
}

/* ═════════ v0.55：種族神兵、S 級地城、回家、留下、結局房間（設計見專案《魔物篇_種族神兵_S級地城_回家_1112》）═════════ */
/* 種族神兵：一族一件（8 族），帶在身上（或同行同伴拿著）就自動生效，只在關鍵戰（討伐戰、八王戰、進化戰、殺管理員、地城）。
   拿法：同盟（對方送）、掠奪（突襲大成功、消滅）。偷之後另寫一章。S.rwGot＝已經拿過的聚落；S.rwUse＝今天用了幾次（一天三次的那兩件）。 */
const RW={"人類城鎮":{n:"曙光長劍",d:"對「暗」屬性的對手多一層"},"精靈村":{n:"月光長弓",d:"每場關鍵戰的第一階段多一層"},
  "矮人聚落":{n:"符文戰錘",d:"每一階段劣勢少一條"},"半身人田地":{n:"幸運投石索",d:"少付一項代價（一天三次）"},
  "蛙人村":{n:"殘影斗篷",d:"輸一階段不扣生命值（一天三次）"},"諾姆據點":{n:"齒輪盾",d:"在巢穴打的討伐戰每階段多一層"},
  "鳥人聚落":{n:"風羽之冠",d:"每場關鍵戰的最後一階段多一層"},"蜥蜴人營地":{n:"記仇之牙",d:"上一階段輸了，這一階段多一層"}};
const rwOf=n=>Object.values(RW).find(z=>z.n===n);
const rwHave=n=>S.items.includes(n);                               // 用戶：只能在主角身上
const rwLeft=k=>{const u=S.rwUse&&S.rwUse.day===S.day?S.rwUse:{};return 3-(u[k]||0)};
const rwSpend=k=>{if(!S.rwUse||S.rwUse.day!==S.day)S.rwUse={day:S.day};S.rwUse[k]=(S.rwUse[k]||0)+1};
function rwGive(set,why,notes){
  const w=RW[set]; S.rwGot=S.rwGot||{}; if(!w||S.rwGot[set])return; S.rwGot[set]=why;
  S.items.push(w.n); S.mat[w.n]={lv:"S",sp:set.replace(/城鎮|村|聚落|田地|據點|營地/g,""),unique:true,rw:set};
  notes.push(`〈系統〉${why}：得到 ✦${w.n}（${set}的種族神兵・S 級）。${w.d}。帶在身上就會生效，只在關鍵戰有用。`);
}
function rwFoeAttr(){const r=S.raid; if(!r||!r.king)return null; return r.king==="clown"?S.kings.clown.cattr:KINGS[r.king].attr}
function rwAdv(ch){
  if(!ch||!(ch.raid&&S.raid||ch.war&&S.war))return [];
  const st=ch.raid?ch.raid.stage:ch.war.stage, of=ch.raid?ch.raid.of:5, mom=ch.raid?S.raid.mom:S.war.mom, r=S.raid, out=[];
  const atNest=!!ch.raid&&!r.king&&!r.admin&&!r.dun&&(!r.at||r.at===NEST());
  if(rwHave("曙光長劍")&&ch.raid&&rwFoeAttr()==="暗")out.push("✦曙光長劍：對手是暗屬性");
  if(rwHave("月光長弓")&&st===1)out.push("✦月光長弓：先手");
  if(rwHave("符文戰錘")&&(ch.dis||[]).length+autoDis(ch).length>0)out.push("✦符文戰錘：擋下一條劣勢");
  if(rwHave("幸運投石索")&&rwLeft("luck")>0)out.push(`✦幸運投石索：少付一項（今天還剩 ${rwLeft("luck")} 次）`);
  if(rwHave("齒輪盾")&&atNest)out.push("✦齒輪盾：守在巢穴");
  if(rwHave("風羽之冠")&&st===of)out.push("✦風羽之冠：最後一階段");
  if(rwHave("記仇之牙")&&mom<0)out.push("✦記仇之牙：上一階段輸了");
  return out;
}
function rwShade(){if(!rwHave("殘影斗篷")||rwLeft("shade")<=0)return false;rwSpend("shade");S.log.push(sysEntry(`✦殘影斗篷：這一下沒打中你（今天還剩 ${rwLeft("shade")} 次）`));return true}
/* 每回合：同盟的聚落送你種族神兵 */
function rwCheck(notes){Object.keys(RW).forEach(set=>{const x=S.world[set];if(!x||x.razed||(S.rwGot||{})[set])return;
  if(stOf(set)>=3)rwGive(set,`${set}跟你同盟，把他們的神兵交給了你`,notes); else if(domOf(set)===3)rwGive(set,`${set}向你稱臣，獻上了他們的神兵`,notes)})}

/* S 級地城：6～8 章開了之後，8 個地城藏在 8 個地區，在那一帶探索才發現。三人（你＋兩位同行）才能進。
   三階段 S 級戰鬥（討伐戰引擎，S.raid.dun）；輸兩階段＝全員傳送回巢穴、沒人死、什麼都沒拿到，可以再來；生命值打到 0 也是傳送回去。
   打贏：神器＋S 級核心＋S 級魔法物品，地城關閉。S.dun＝{地城名:{art,cleared}}；S.cores＝S 級核心數。 */
const DUNS=[["熔心窟","炎之心","火"],["潮鳴淵","潮之鏡","水"],["岩冠塚","岩之冠","土"],["風角塔","風之角","風"],["木種林","木之種","木"],["光環殿","光之環","光"],["闇鑰牢","闇之鑰","暗"],["虛匣門","虛之匣",null]];
const DUN_STEP=["第一層：地城的陷阱和守衛","第二層：地城的主人派出的怪物","最深處：守著神器的守護者"];
const ARTS=DUNS.map(d=>d[1]);
const artN=()=>ARTS.filter(a=>S.items.includes(a)).length;
function dunInit(){
  if(S.dun)return; S.dun={}; const regs=[...SITE_REGIONS].sort(()=>Math.random()-0.5);
  DUNS.forEach(([n,art],i)=>{const region=regs[i%regs.length]; S.dun[n]={art,cleared:false};
    if(!S.world[n])S.world[n]={kind:"S級地城",region,links:{[region]:3},known:true,note:`S 級地城。最深處藏著神器「${art}」。`,dun:true};
    if(S.world[region]){S.world[region].links=S.world[region].links||{};S.world[region].links[n]=3}});
}
const DUN_MSG="〈系統〉《世界之聲》：「這個世界出現了 8 個 S 級地城。」（地圖上都標出來了；要你＋兩位同行才能進）";
function dunShow(o){Object.keys(o.dun||{}).forEach(n=>{const w=o.world[n];if(!w||w.known)return;w.known=true;w.links=w.links||{};w.links[w.region]=3;
  if(o.world[w.region]){o.world[w.region].links=o.world[w.region].links||{};o.world[w.region].links[n]=3}; const s=(o.sites||[]).find(x=>x.n===n);if(s)s.found=true})}
function dunHTML(){
  const n=S.at, d=S.dun&&S.dun[n]; if(!d||S.dead)return "";
  if(d.cleared)return `<div class="card"><h3>${esc(n)}（S 級地城）</h3><div class="note">已經空了。神器、核心、寶物都被你拿走，地城關閉了。</div></div>`;
  const w=S.party.filter(p=>p.with), ok=w.length>=2&&!S.alone&&!S.raid;
  return `<div class="card"><h3>${esc(n)}（S 級地城）</h3><div class="note">最深處藏著神器「${esc(d.art)}」。三階段都要贏、對手 S 級、可以捨身。輸一階段（或生命值打到 0），全員被傳送回巢穴（沒人會死，但什麼都帶不回來，可以再來）。打贏就拿走神器、S 級核心和一件 S 級魔法物品，地城會關閉。</div>
    ${ok?`<button class="tl" id="dungo">進入地城（你＋${esc(w.map(p=>p.n).join("、"))}）</button>`:`<div class="note">${S.alone?"你只有一個人，進不去（要三個人）。":`要三個人才能進：你＋兩位同行的同伴（現在同行 ${w.length} 位）。`}</div>`}</div>`;
}
function dunEnter(){
  const n=S.at, d=S.dun&&S.dun[n]; if(!d||d.cleared||busy||S.dead||S.raid||S.alone||S.party.filter(p=>p.with).length<2)return;
  const pre=snap(); S.log.push({who:"you",text:`進入${n}`,pre});
  S.raid={name:n,lv:"S",size:"S 級地城",dun:n,kind:"dun",at:n,on:true,stage:1,of:3,wins:0,fails:0,mom:0,prep:[],comp:["地城的守護者"],seen:true};
  S.opts=[]; save(); doJob({kind:"raid",ctx:{stage:1}},snap(),S.log.length);
}
function dunPrompt(r){
  return [`【S 級地城・${r.dun}】（現在 ${timeStr()}，${PERIOD(S.hour)}）`,
    `主角帶著兩位同伴（${S.party.filter(p=>p.with).map(p=>p.n).join("、")}）走進 S 級地城「${r.dun}」，一共三層，最深處藏著神器「${S.dun[r.dun].art}」。對手都是 S 級。地城的規矩：三層都要過，任何一層撐不住，所有人會被傳送回巢穴，沒有人會死在這裡。`];
}
function dunEnd(r,end,notes){
  const d=S.dun[r.dun]; S.raid=null;
  if(end==="win"){d.cleared=true; S.items.push(d.art); S.mat[d.art]={lv:"S",sp:"神器",artifact:true}; S.cores=(S.cores||0)+1;
    const pool=Object.values(POOLS).flat(), sk=pool.length?pool[rint(0,pool.length-1)]:{n:"守護",sys:"防禦"};
    let nm=`${r.dun}的秘寶`; while(S.items.includes(nm))nm+="・改"; S.items.push(nm); S.mat[nm]={lv:"S",sp:"地城",skill:{n:sk.n,sys:sk.sys}};
    notes.push(`〈系統〉${r.dun}攻略完成。`,`得到神器 ✦${d.art}（神器 ${artN()}/8）`,`得到 S 級核心（現在 ${S.cores} 顆）`,`得到 ✦${nm}（S 級魔法物品，附帶「${sk.n}」）`,`${r.dun}關閉了。`)}
  else{S.at=NEST(); S.loc=NEST(); notes.push(`〈系統〉撐不住了。所有人被傳送回${NEST()}，什麼都沒帶回來。（${r.dun}還在，可以再來）`)}
}

/* 回家：神器 8 件＋S 級核心＋精靈王的儀式（都會用掉）。三次「你真的要離開了嗎」→ 傳送門 → 選要帶哪些伴侶。
   一個人回去要一顆核心，每帶一位多一顆；核心不夠，就有人沒跟過來（精靈王不會告訴你要幾顆）。按「留下」＝結局「留在這個世界」。 */
const HOME_TXT={portal:"傳送門出現了。",hug:"你的伴侶們衝了過來抱住你，希望你帶他們一起走。",
  mates:"然後你們穿越了傳送門後傳送門崩塌，回到了你的狹窄公寓。大家在客廳中央面面相覷。你變回原本的人類面貌。但你發現你竟然還有藍色面板。他們也都是原本世界的魔物樣子。但你發現你竟然可以幫他們調整面板。你跟伴侶們永遠在一起了。",
  alone:"你醒了，在病床上。你救了人，上了地方新聞。你只是不知道為什麼，只看得到一個藍色面板。而當你看向旁邊的蘋果時，上面寫著：是否要吞噬這個蘋果。",
  apart:"你出現在你住的狹窄公寓，什麼事情都像沒發生過，旁邊的手機傳來朋友約你聚餐的訊息，一切好像從未發生過，但又如此刻骨銘心。"};   // apart：用戶 11-12 08:21 寫的，08:42 改用病床那段，先留著
const homeReady=()=>!!S.ritual&&artN()>=8&&(S.cores||0)>=1;
let HOMEQ=0;
function homeHTML(){
  if(!homeReady()||S.dead||S.raid)return "";
  const ms=mates().map(p=>p.n);
  if(!HOMEQ)return `<div class="check"><h3>回家</h3><div class="note">神器 8/8、S 級核心 ${S.cores} 顆、精靈王的儀式。都準備好了。</div><button class="tl" id="homego">打開回家的儀式</button></div>`;
  if(HOMEQ<=3)return `<div class="check"><h3>回家（${HOMEQ}/3）</h3><div class="note">你真的要離開了嗎${ms.length?`，${esc(ms.join("、"))}看著你`:""}${HOMEQ===3?"。":""}</div>
    <div class="padd" style="margin-top:6px"><button class="tl" id="homeyes">${HOMEQ===3?"確定離開":"離開"}</button><button class="tl" id="homestay">留下</button></div></div>`;
  return `<div class="check"><h3>傳送門</h3><div class="note">${HOME_TXT.portal}${ms.length?`<br>${HOME_TXT.hug}<br>要帶誰一起走？`:""}</div>
    ${ms.length?`<div class="tags">${ms.map(m=>`<label class="tag"><input type="checkbox" data-hm="${esc(m)}" checked> ${esc(m)}</label>`).join("")}</div>`:""}
    <button class="tl" id="homego2">穿過傳送門</button></div>`;
}
function homeStay(){
  if(!homeReady()||busy||S.dead)return; const pre=snap(); HOMEQ=0;
  S.log.push({who:"you",text:"留下",pre}); endSet("stay");
}
function homeLeave(take){
  if(!homeReady()||busy||S.dead||HOMEQ<4)return; const pre=snap(); HOMEQ=0;
  const ms=mates().map(p=>p.n), pick=(take||[]).filter(n=>ms.includes(n)), cap=Math.max(0,(S.cores||0)-1);
  const go=[...pick].sort(()=>Math.random()-0.5), came=go.slice(0,cap), lost=go.slice(cap);
  S.log.push({who:"you",text:pick.length?`帶著${pick.join("、")}穿過傳送門`:"一個人穿過傳送門",pre});
  ARTS.forEach(a=>{const i=S.items.indexOf(a);if(i>=0)S.items.splice(i,1)}); S.cores=0; S.ritual=false;
  const k=came.length?"home2":"home", extra=lost.length?`\n你回去的時候發現，有人不見了：${lost.join("、")}。`:"";
  END_TXT[k]=HOME_TXT[came.length?"mates":"alone"]; endSet(k,null,extra);
}
/* 結局房間（回想）：看過的結局可以重看文字；第一次結局之後問要不要全部打開。 */
Object.assign(END_TXT,{home:HOME_TXT.alone,home2:HOME_TXT.mates,stay:"你留了下來。"});
function endRoomHTML(){
  const M=metaGet(), all=!!M.allOpen, list=ENDINGS.filter(e=>END_TXT[e.k]&&(all||M.ends[e.k]));
  if(!list.length)return "";
  return `<div class="card"><h3>結局房間</h3><div class="note">看過的結局可以在這裡重看${all?"（已經全部打開）":""}。</div>
    ${list.map(e=>`<details style="margin-top:6px"><summary>${esc(e.n)}</summary><div class="note" style="margin-top:4px">${esc(END_TXT[e.k])}</div></details>`).join("")}</div>`;
}
const allOpenHTML=()=>{const M=metaGet(); return S.ended&&!M.askedAll?`<div class="note" style="margin-top:8px;padding:8px;border:1px solid currentColor;border-radius:6px">結局很多。要不要把全部結局打開，直接在「履歷」頁的結局房間看劇情？<div class="padd" style="margin-top:6px"><button class="tl" id="allopen">全部打開</button><button class="tl" id="allno">不用</button></div></div>`:""};
function allOpen(y){const M=metaGet(); M.askedAll=true; if(y)M.allOpen=true; metaSave(); render()}

/* v0.56：S 級核心（吃不吃玩家決定：吃了就從三個 S 級強力技能裡選一個學，核心用掉，回家就少一顆）、地城秘寶（吸收＝學會它的技能、秘寶消失；或留著給巫妖王）、蘋果。 */
const treasures=()=>S.items.filter(n=>{const m=matOf(n);return m&&m.sp==="地城"&&m.skill});
function coreHTML(){
  const ts=treasures(); if(!(S.cores||0)&&!ts.length&&!S.coreCands)return "";
  return `<div class="card"><h3>S 級核心與秘寶</h3>
    ${S.coreCands?`<div class="note">核心在你身體裡化開了。選一個學會（S 級）：</div><div class="padd" style="flex-wrap:wrap;margin-top:4px">${S.coreCands.map((c,i)=>`<button class="tl" data-cp="${i}">${esc(c.n)}（${esc(c.sys)}）</button>`).join("")}</div>`
      :(S.cores||0)?`<div class="note">S 級核心：${S.cores} 顆。回家要用（自己一顆，每帶一位伴侶多一顆）；吃掉可以學一個 S 級的強力技能，但就少一顆。</div><button class="tl" id="coreeat">吃掉一顆核心</button>`:""}
    ${ts.map(n=>`<div class="d">✦${esc(n)}：附帶「${esc(matOf(n).skill.n)}」。可以拿著用、交給巫妖王，或吸收（學會這個技能，秘寶消失）。<br><button class="tl" data-ab="${esc(n)}">吸收</button></div>`).join("")}</div>`;
}
function coreEat(){
  if(busy||S.dead||!(S.cores>0)||S.coreCands)return;
  const have=new Set(S.skills.map(s=>s.n)), pool=[...new Map(Object.values(POOLS).flat().filter(s=>!have.has(s.n)).map(s=>[s.n,s])).values()].sort(()=>Math.random()-0.5);
  S.cores--; S.coreCands=pool.slice(0,3).map(s=>({n:s.n,sys:s.sys}));
  S.log.push({who:"you",text:"吃掉一顆 S 級核心（不能撤回）"}); S.log.push(sysEntry(`你吃掉了一顆 S 級核心（還剩 ${S.cores} 顆）。到「技能」頁選一個學會。`)); save(); render();
}
function corePick(i){
  const c=S.coreCands&&S.coreCands[i]; if(!c||busy)return; const notes=[];
  S.log.push({who:"you",text:`從核心學會：${c.n}（不能撤回）`}); const s=addSkill(c,"S"); S.coreCands=null;
  notes.push(`〈系統〉《世界之聲》：「習得 ${c.n}（S級・${c.sys}）。」${s.box==="store"?"（可用的位置滿了，先放進倉庫）":""}`);
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
function absorb(n){
  const m=matOf(n); if(busy||S.dead||!m||m.sp!=="地城"||!m.skill||!S.items.includes(n))return;
  S.log.push({who:"you",text:`吸收 ✦${n}（不能撤回）`}); S.items.splice(S.items.indexOf(n),1); delete S.mat[n];
  const have=S.skills.some(s=>s.n===m.skill.n); if(!have)addSkill(m.skill,"S");
  S.log.push(sysEntry(have?`✦${n}化成光，鑽進你身體裡。「${m.skill.n}」你已經會了。`:`✦${n}化成光，鑽進你身體裡。〈系統〉《世界之聲》：「習得 ${m.skill.n}（S級・${m.skill.sys}）。」`)); save(); render();
}
/* （v0.57：蘋果只顯示在結局文字裡，不給玩家按） */

/* ═════════ v0.60：成王試煉 → 九王並立（設計見專案《魔物篇_九王並立_成王試煉_1112》）═════════
   前提 S 級；八位王都認可（各付一種代價＝認可＋互不侵犯；小丑王要看穿謊言）、一位都沒殺、沒開戰過。
   小丑王是謎語人：三件關於其他王的事，一件是謊言；猜錯扣 HP 10、MP 5（不會扣到死），再猜，一定猜得對。 */
const kingOK=k=>{const x=S.kings&&S.kings[k]; if(!x||x.beaten||x.ate||x.stance==="war"||!x.stance)return false; return k==="clown"?!!x.riddleOK||(x.paid||[]).length>0:(x.paid||[]).length>0};
const nineN=()=>Object.keys(KINGS).filter(kingOK).length;
const nineReady=()=>!!S.kings&&S.lv==="S"&&nineN()===8;
function riddleMake(){
  const fs=[["attr","屬性"],["ins","本能"],["weak","弱點"],["lair","領域"]], ks=Object.keys(KINGS).filter(k=>k!=="clown"&&k!=="elf"||(k==="elf"&&S.kings.elf.found));
  const pick=[...ks].sort(()=>Math.random()-0.5).slice(0,3), lie=Math.floor(Math.random()*3);
  const lines=pick.map((k,i)=>{const [f,l]=fs[Math.floor(Math.random()*fs.length)], v=kingField(k,f);
    if(i!==lie)return `${kingOf(k).t}的${l}是「${v}」`;
    const others=ks.filter(z=>z!==k).map(z=>kingField(z,f)).filter(z=>z&&z!==v); return `${kingOf(k).t}的${l}是「${others[Math.floor(Math.random()*others.length)]||"沒有"}」`});
  return {lines,lie,tried:[]};
}
function riddleHTML(x){
  if(x.beaten||x.ate||x.stance==="war"||x.riddleOK)return x.riddleOK?`<div class="note" style="width:100%">你看穿了小丑王的謊言，他認可了你。</div>`:"";
  if(!x.riddle)return `<button class="tl" data-rd="go">聽小丑王說三件事（其中一件是謊言）</button>`;
  return `<div class="d" style="width:100%"><b>小丑王：「我說三件事，只有一件是假的。」</b>（猜錯：HP -10、MP -5）
    ${x.riddle.lines.map((t,i)=>`<div class="padd" style="margin-top:4px"><span>${esc(t)}</span>${x.riddle.tried.includes(i)?`<span class="note">（不是這個）</span>`:`<button class="tl" data-rd="${i}">這是謊言</button>`}</div>`).join("")}</div>`;
}
function riddle(v){
  const x=S.kings&&S.kings.clown; if(!x||busy||S.dead||S.at!==kingOf("clown").lair||x.beaten||x.stance==="war"||x.riddleOK)return;
  const notes=[];
  if(v==="go"){if(x.riddle)return; x.riddle=riddleMake(); S.log.push(sysEntry(`小丑王笑著說：「${CLOWN_LINE}」\n「我說三件事，只有一件是假的。猜猜看？」`)); save(); render(); return}
  const i=+v; if(!x.riddle||x.riddle.tried.includes(i))return; const pre=snap();
  S.log.push({who:"you",text:`「第 ${i+1} 件是謊言。」`,pre});
  if(i===x.riddle.lie){x.riddleOK=true; if(!x.stance)x.stance="neutral"; notes.push("小丑王拍手大笑：「答對了。」","小丑王認可了你：互不侵犯。")}
  else{x.riddle.tried.push(i); S.hp=Math.max(1,S.hp-10); S.mp=Math.max(0,S.mp-5); notes.push(`小丑王笑得更開心了：「錯了。」（HP -10、MP -5，現在 HP ${S.hp}）`)}
  endCheck(notes); S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
END_TXT.k_nine="你得到了八王的認可，你選了一條強者之路，這不是哥布林家族、酋長、皇帝之路，也不是管理員之路，更不是回家之路，而是你成為了第九王。\n管理員在你腦內打開一個全息投影：\n「恭喜你啦，你成為第九王了，不過我也沒什麼好給你的，只能給你看我的影像，其他八王腦子裡面也是這個影像，你以後漫長的生活會習慣的，我有事情會再聯絡你，沒事就不會跳出來提醒的，放心好了。」";
const nineHTML=()=>nineReady()&&!S.dead&&!S.raid?`<div class="check"><h3>成王試煉</h3><div class="note">你到了 S 級，八位王都認可了你。</div><button class="tl" id="ninego">成為第九王</button></div>`:"";
function nineEnd(){
  if(!nineReady()||busy||S.dead)return; const pre=snap(), rg=(S.world[NEST()]||{}).region||NEST();
  S.log.push({who:"you",text:"成為第九王",pre});
  S.log.push(sysEntry(`〈系統〉《世界之聲》：「第九名吞噬者成為第九王。${rg}一帶，從此是第九王的領域。」`));
  endSet("k_nine");
}
const nineLine=()=>kingsOpen()?`<div class="note">成王試煉：${S.lv==="S"?"✓":"○"} S 級、認可 ${nineN()}/8（每位王付一種代價；小丑王要看穿他的謊言；殺過、開戰過的王不會認可你）</div>`:"";
