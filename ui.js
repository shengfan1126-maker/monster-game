/* 魔物篇｜ui.js：畫面：狀態列、分頁、故事、卡片。
   所有 .js 共用同一個全域範圍，載入順序見 index.html；改之前先讀 README.md。 */
/* ═════════ 畫面 ═════════ */
function render(){
  const M=$("main");
  if(!S){ M.innerHTML=startHTML(); bindStart(); return; }
  M.innerHTML=statusHTML()+tabsHTML()+`<div class="panel">${panelHTML()}</div>`;
  M.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{TAB=b.dataset.tab;render()});
  if(TAB==="story") bindStory();
  if(TAB==="nest") bindNest();
  if(TAB==="map") bindMap();
  if(TAB==="skill") document.querySelectorAll("[data-sd]").forEach(b=>b.onclick=()=>{const i=+b.dataset.sd;if(SD!==i){SD=i;render();return}SD=-1;const s=S.skills[i];if(s&&!isUq(s)&&!S.err){S.skills.splice(i,1);SWI=[];SWO=[];MG=[];MGK="";const n=[];fillAct(n);if(n.length)S.log.push(sysEntry(n.join("\n")))}save();render()});
  if(TAB==="skill") document.querySelectorAll("[data-sw]").forEach(b=>b.onclick=()=>{const i=+b.dataset.sw;SWI=SWI.includes(i)?SWI.filter(x=>x!==i):[...SWI,i];render()});
  if(TAB==="skill") document.querySelectorAll("[data-sx]").forEach(b=>b.onclick=()=>{const i=+b.dataset.sx;SWO=SWO.includes(i)?SWO.filter(x=>x!==i):[...SWO,i];render()});
  if(TAB==="skill"&&$("swdo"))$("swdo").onclick=()=>swapSkills();
  if(TAB==="skill") document.querySelectorAll("[data-mg]").forEach(b=>b.onclick=()=>{const [k,i]=b.dataset.mg.split("|"),n=+i;if(MGK!==k){MGK=k;MG=[]}MG=MG.includes(n)?MG.filter(x=>x!==n):MG.length<5?[...MG,n]:MG;render()});
  if(TAB==="skill"&&$("mgdo"))$("mgdo").onclick=()=>mergeSkills();
  if(TAB==="skill") document.querySelectorAll("[data-di]").forEach(b=>b.onclick=()=>{const i=+b.dataset.di;if(DI!==i){DI=i;render();return}DI=-1;const it=S.items[i];if(it!=null){S.items.splice(i,1);delete S.mat[it]}save();render()});
  if(TAB==="skill") document.querySelectorAll("[data-cd]").forEach(b=>b.onclick=()=>{const i=+b.dataset.cd;if(CD!==i){CD=i;render();return}CD=-1;S.corpses.splice(i,1);save();render()});
  if(TAB==="skill") document.querySelectorAll("[data-ut]").forEach(b=>b.onclick=()=>{const i=+b.dataset.ut;
    if(UT!==i){UT=i;render();return} S.tags.splice(i,1);UT=-1;save();render()});
}
function startHTML(){
  const has=!!load();
  return `<div class="start">
    <h2>灰岩洞</h2>
    <p>你記得自己死過一次。<br>醒來時，你是一窩哥布林裡最晚長大的那一隻。</p>
    <input id="pname" maxlength="12" placeholder="你叫什麼名字？" autocomplete="off">
    <button class="big" id="pgo">醒來</button>
    ${has?`<button class="ghost" id="pcont">繼續上次的進度</button>`:""}
    <button class="ghost" id="pimp">匯入存檔</button>
    ${(PROV==="gemini"?ls.g("gm_key"):PROV==="or"?ls.g("or_key"):(ls.g("gm_key")||ls.g("or_key")))?"":`<p style="margin-top:18px">開始前先點右上角 ⚙ 填 Gemini 或 OpenRouter 的 key。</p>`}
  </div>`;
}
function bindStart(){
  $("pgo").onclick=()=>{
    const nm=$("pname").value.trim()||"無名";
    S=newGame(nm); heal(); S.log.push({who:"gm",kind:"sys",alts:[{text:OPENING,opts:OPEN_OPTS.slice()}],i:0}); S.opts=OPEN_OPTS.slice(); TAB="story"; save(); render();
  };
  $("pname").onkeydown=e=>{if(e.key==="Enter")$("pgo").click()};
  if($("pcont"))$("pcont").onclick=()=>{S=load();heal();render()};
  $("pimp").onclick=()=>impfile.click();
}
function statusHTML(){
  const hpc=S.hp<=Math.ceil(S.hpMax/4)?"low":"";
  return `<div class="stat">
    <span class="nm">${esc(S.name)}</span>
    <span><span class="k">${esc(S.sub?S.sub.name:"哥布林")}・${S.stage}</span><b>${S.lv}</b></span>
    <span class="${hpc}"><span class="k">HP</span><b>${S.hp}/${S.hpMax}</b></span>
    <span><span class="k">MP</span><b>${S.mp}/${S.mpMax}</b></span>
    <span><span class="k">存在值</span><b>${S.exist}/${existMax(S.lv)}</b></span>
    <span><span class="k">第</span><b>${S.day}</b><span class="k">天</span> <b>${pad2(S.hour)}:${pad2(S.min||0)}</b><span class="k">${PERIOD(S.hour)}</span></span>
    ${heatLv()>=1?`<span class="${heatLv()>=3?"low":""}"><span class="k">注目</span><b>${HEAT[heatLv()].n}</b>${S.raid&&S.raid.seen&&!S.raid.now?`<span class="k">・${Math.max(0,Math.ceil((S.raid.due-nowH())/24))} 天</span>`:""}</span>`:""}
    <span class="loc">📍 ${esc(S.loc)}${S.loc.includes(S.at)?"":`（${esc(S.at)}）`}${S.party.some(p=>p.with)?`　·　同行：${S.party.filter(p=>p.with).map(p=>esc(p.n)+(p.tags.length?`【${p.tags.join("")}】`:"")).join("、")}`:""}${S.tags.length?"　·　"+S.tags.map(t=>`<span class="tg ${/飢餓|瀕死|中毒|流血|腹痛/.test(t)?"bad":""}">${esc(t)}</span>`).join(""):""}</span>
  </div>`;
}
function tabsHTML(){
  const T=[["story","故事"],["skill","技能"],["nest","同伴・巢穴"],["map","地點"],["record","履歷"]];
  return `<nav class="tabs">${T.map(([k,n])=>`<button data-tab="${k}" class="${TAB===k?"on":""}">${n}</button>`).join("")}</nav>`;
}
function panelHTML(){
  if(TAB==="skill") return skillHTML();
  if(TAB==="nest") return nestHTML();
  if(TAB==="record") return recordHTML();
  if(TAB==="map") return mapHTML();
  return storyHTML();
}
function paras(t){
  return t.split(/\n+/).filter(s=>s.trim()).map(s=>{
    const sys=/^〈系統〉/.test(s.trim());
    return `<p class="${sys?"sys":""}">${esc(s.trim().replace(/^〈系統〉/,""))}</p>`;
  }).join("");
}
function pendingCheck(){const e=S.log[S.log.length-1];return e&&e.who==="gm"&&e.alts[e.i].check?e.alts[e.i].check:null}
function pendingFoe(){const e=S.log[S.log.length-1];return e&&e.who==="gm"&&e.kind==="resolve"&&e.alts[e.i].askFoe||null}
/* 判定成功、故事卻沒寫清楚對手的下場：讓玩家說 */
function foeFate(k){
  const f=pendingFoe(); if(busy||!f)return;
  const pre=snap(), notes=[], kind=f.name;
  S.log.push({who:"you",text:{dead:`${f.name}死了`,fled:`${f.name}逃了／投降了`,cap:`把${f.name}帶回巢穴`,up:`${f.name}還站著`}[k],pre});
  if(k==="dead")applyDefeat({name:f.name,kind,lv:f.lv,cls:f.cls,dead:true},notes);
  else if(k==="fled")applyDefeat({name:f.name,kind,lv:f.lv,cls:f.cls,dead:false},notes);
  else if(k==="cap"){gainExist(f.lv,notes,f.cls?1:0);facHit({name:f.name,kind},notes);capture({name:f.name,kind:raceOf(f.name)||kind,lv:f.lv,cls:f.cls},notes);S.lastFoe=null}
  else notes.push(`${f.name}還站著。要打倒牠，就再動手一次。`);
  S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
function pendingCands(){const e=S.log[S.log.length-1];return e&&e.kind==="devour"&&e.alts[0].cands&&e.alts[0].cands.length?e.alts[0].cands:null}
function checkHTML(ch){
  const ci=checkInfo(ch);
  const lay=[...(ch.useSk?[weakSk(ch)?`<span class="dis">－ 「${esc(ch.useSk)}」等級低於對手，視同白字，沒有效果（硬用會壞）</span>`:`<span class="adv">＋ 用「${esc(ch.useSk)}」</span>`]:[]),...ch.adv.map(x=>`<span class="adv">＋ ${esc(x)}</span>`),...ch.dis.map(x=>`<span class="dis">－ ${esc(x)}</span>`),
    ...(ci.lvDiff?[`<span class="dis">－ 對方高你 ${ci.lvDiff} 級</span>`]:[])].join("");
  const war=ch.war&&S.war, raid=ch.raid&&S.raid;
  const sacs=war||raid?[["","不舍身"],["hp","HP 上限 -5"],["maim","留下【殘缺】"],...S.skills.filter(x=>x.sys!=="Unique").map(x=>[`sk:${x.n}`,`失去技能「${x.n}」`])]:[];
  const warBox=raid?`<div class="sacbox"><label>舍身（算兩項，傷殘是永久的）</label><select id="sacsel">${sacs.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select></div>
    <div class="note" style="margin-top:6px">已經守住 ${S.raid.wins}・失守 ${S.raid.fails}。失守 ${Math.floor(S.raid.of/2)+1} 次巢穴就完了；守住 ${Math.floor(S.raid.of/2)+1} 次${S.raid.of>=5?"（大成功算兩次）":""}就贏。</div>`:war?`<div class="sacbox"><label>舍身（算兩項，傷殘是永久的）</label><select id="sacsel">${sacs.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select></div>
    <div class="rtrow"><button class="tl" id="rtopen">${RETREAT?"不撤退了":"撤退…"}</button></div>
    ${RETREAT?`<div class="rtbox"><div class="note">撤退要犧牲回不來的東西：</div>
      ${S.party.map((p,k)=>`<button class="tl" data-rt="ally|${k}">讓 ${esc(p.n)} 斷後（牠會死）</button>`).join("")}
      <button class="tl" data-rt="hp">HP 上限 -5</button><button class="tl" data-rt="maim">留下【殘缺】</button>
      ${S.items.map((it,i)=>`<button class="tl" data-rt="item|${i}">丟下 ${esc(it)}</button>`).join("")}</div>`:""}`:"";
  const sks=boxList("act").map(x=>({v:x.n,t:`${x.n}（${x.sys}・${x.g}）MP -1${skUsed(x.n)?"・今天已用":""}`,off:S.mp<1||skUsed(x.n)}));
  S.items.forEach(n=>{const m=matOf(n);if(m&&m.skill){const k=`${m.skill.n}（${n}）`, weak=ch.foeLv&&gIdx(m.lv)<gIdx(ch.foeLv);sks.push({v:k,t:`${m.skill.n}（✦${n}・${m.lv}級）${skUsed(k)?"・今天已用":weak?`・等級低於對手(${ch.foeLv})，沒效果，硬用會壞`:""}`,off:skUsed(k)})}});
  const ones=oneShots(), itBox=ones.length?`<div class="sacbox"><label>用掉一件普通武器防具（多一層優勢，用完就沒了）</label><select id="itemsel"><option value="">不用</option>${ones.map(n=>`<option value="${esc(n)}"${ch.useItem===n?" selected":""}>${esc(n)}</option>`).join("")}</select></div>`:"";
  const skBox=sks.length?`<div class="sacbox"><label>用哪個技能（多一層優勢，一次一個；自己的技能 MP -1，魔法物品的不用）</label><select id="skillsel"><option value="">不用技能</option>${sks.map(x=>`<option value="${esc(x.v)}"${ch.useSk===x.v?" selected":""}${x.off?" disabled":""}>${esc(x.t)}</option>`).join("")}</select></div>`:"";
  return `<div class="check${war||raid?" war":""}">
    <h3>${raid?`討伐戰 ${ch.raid.stage}/${ch.raid.of}・${esc(S.raid.name)}：`:war?`進化戰 ${ch.war.stage}/5・${esc(S.war.foe.name)}：`:ch.multi?`連戰 ${ch.multi.n}/${ch.multi.of}・${ch.multi.cls?"小頭目 ":""}${esc(ch.foe)}：`:"判定："}${esc(ch.what)}</h3>
    ${ch.multi?`<div class="note" style="margin-bottom:6px">${ch.multi.group?`對方有 ${ch.multi.group} 個，每贏一階段打倒或打跑一個。`:`帶職業的小頭目，打兩個階段。`}大成功＝直接打倒${ch.multi.group?"帶頭的，其餘潰散":"牠"}。失敗會挨一下，但還能繼續打。</div>`:""}
    ${lay?`<div class="lay">${lay}</div>`:""}
    <div class="need">付 <b>${ci.need}</b> 項成功・付 <b>${ci.big}</b> 項大成功${ci.need===0?"（不付也會成功）":""}<br><small>虛線框的通用代價一次只能選一項${ci.stalled?"；這場已經拖過一次，不能再拖":""}</small></div>
    <div class="costs">${ci.costs.map((c,i)=>`<label class="cost${c.g?" gen":""}"><input type="checkbox" data-c="${i}"><span>${esc(c.t)}${c.g?"":effOf(c)}</span></label>`).join("")}</div>
    ${skBox}${itBox}${warBox}
    <button class="paybtn" id="paybtn">付出 0 項：${tierOf(0,ci)}</button>
  </div>`;
}
const effOf=c=>{const x=[];if(c.ally)x.push(`${c.ally}【負傷】`);if(c.hp)x.push(`HP ${c.hp}`);if(c.mp)x.push(`MP ${c.mp}`);if(c.time)x.push(`+${c.time} 小時`);if(c.tag)x.push(`【${c.tag}】`);if(c.item)x.push(`失去 ${c.item}`);
  return x.length&&!x.some(v=>c.t.includes(v))?`<small class="eff">${esc(x.join("・"))}</small>`:""};
function candsHTML(cs){
  return `<div class="check"><h3>《大賢者》：選一項吸收</h3>
    <div class="cands">${cs.map((p,j)=>{const s=S.skills.find(x=>x.n===p.n);
      const gv=S.party.map((a,k)=>allyCan(a,p)?`<button class="tl give" data-lp="${j}|${k}">給 ${esc(a.n)}${a.dir&&DIRS[a.dir].sys.test(p.sys)?"（對路）":""}</button>`:"").join("");
      return `<div><button class="opt" data-l="${j}" style="width:100%">${esc(p.n)}<span class="cs">${esc(p.sys)}・${s?"已經會了":`新技能 ${S.lv}`}</span></button>${gv?`<div class="gives">${gv}</div>`:""}</div>`}).join("")}
    <button class="tl" id="skip">都不要</button></div></div>`;
}
function storyHTML(){
  const L=S.log, n=L.length;
  let lastYou=-1; for(let i=n-1;i>=0;i--)if(L[i].who==="you"){lastYou=i;break}
  const html=L.map((e,idx)=>{
    if(e.who==="you"){
      const canUndo=!busy&&idx===lastYou&&(e.pre||(L[idx+1]&&L[idx+1].pre)||(idx===n-1&&S.err));
      return `<div class="youwrap"><div class="you${e.ooc?" ooc":""}">${esc(e.text)}</div>${canUndo?`<button class="undo" id="undo">撤回</button>`:""}</div>`;
    }
    const isLast=idx===n-1, a=e.alts[e.i], ai=e.kind==="turn"||e.kind==="resolve"||e.kind==="old"||e.kind==="war"||e.kind==="ooc";
    if(isLast&&EDIT&&ai) return `<div class="gm edit"><textarea id="edtext">${esc(a.text)}</textarea>
      <div class="gmtools"><button class="tl" id="edcancel">取消</button><button class="tl" id="edsave">儲存</button></div></div>`;
    const by=a.by?`<span class="by">由 ${esc(shortName(a.by))} 撰寫${a.fb?`・前面 ${a.fb} 個沒通`:""}${a.loose?"・沒照格式，選項從缺":""}</span>`:"";
    let tools=by?`<div class="gmtools">${by}</div>`:"";
    if(isLast&&!busy&&ai){
      const sw=e.alts.length>1?`<span class="sw"><button id="prv" aria-label="上一個版本">◀</button>${e.i+1}/${e.alts.length}<button id="nxt" aria-label="下一個版本">▶</button></span>`:"";
      tools=`<div class="gmtools">${by||`<span class="by"></span>`}${sw}${e.job?`<button class="tl" id="regen">重新回答</button>`:""}<button class="tl" id="edit">編輯</button></div>`;
    }
    const notes=(e.notes||[]).length?`<div class="notes">${paras(e.notes.join("\n"))}</div>`:"";
    return `<div class="gm ${e.kind==="sys"||e.kind==="devour"?"sysgm":""}${e.kind==="ooc"?" ooc":""}">${paras(a.text)}${notes}${tools}</div>`;
  }).join("");
  let tail="";
  if(busy) tail=`<div class="gm" id="live"><div class="wait">故事正在展開</div></div>`;
  else if(S.err) tail=`<div class="err">這回合沒寫出來：${esc(S.err.msg)}${S.err.raw?`<details style="margin-top:6px"><summary>看模型回了什麼</summary><div style="white-space:pre-wrap;font-size:11.5px;margin-top:4px">${esc(S.err.raw)}</div></details>`:""}<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="tl" id="retry">再試一次</button></div></div>`;
  else if(TOAST) tail=`<div class="err">${esc(TOAST)}</div>`;
  let bottom="";
  const ch=!busy&&!S.err&&pendingCheck(), cs=!busy&&!S.err&&pendingCands();
  const pf=!busy&&!S.err&&!S.dead&&pendingFoe();
  const idle=!busy&&!S.err&&!S.dead&&!ch&&!cs&&!pf&&!pendingSubs()&&!S.war&&!(S.evo&&S.evo.forced!=null);
  const bagFood=S.corpses.map((c,i)=>idle?(EA===i?`<button class="it food" data-ecp="${i}|private">私下吃 ${esc(c.name)}<small>+1 小時</small></button><button class="it food" data-ecp="${i}|public">當眾吃<small>${esc(witnesses(c).join("、"))}會看到</small></button>`:`<button class="it food" data-ec="${i}">吃 ${esc(c.name)}<small>${isFresh(c)?"新鮮":"不新鮮"}</small></button>`):`<span class="it food">${esc(c.name)}<small>${isFresh(c)?"新鮮":"不新鮮"}</small></span>`);
  const bagHv=S.corpses.map((c,i)=>idle&&isBeast(c)?`<button class="it harv" data-hv="${i}">拆 ${esc(c.name)} 的原料</button>`:"").filter(Boolean);
  const nm=it=>matOf(it)?`✦${esc(it)}`:esc(it), mc=it=>matOf(it)?" mat":"";
  const bagItem=S.items.map((it,i)=>idle?`<button class="it${mc(it)}" data-bi="${i}">${BI===i?`吃掉 ${nm(it)}？${matOf(it)?"（能學技能）":""}`:nm(it)}</button>`:`<span class="it${mc(it)}">${nm(it)}</span>`);
  const bag=`<div class="bag"><span class="k">背包</span>${bagFood.length+bagItem.length?[...bagFood,...bagHv,...bagItem].join(""):`<span class="none">空的</span>`}</div>${idle&&(S.items.length||bagHv.length)?`<div class="bagnote">金色是食材，點一下就吃；✦ 是魔法原料或魔法物品，點兩下吃掉能學技能；其他東西點兩下也能硬吞，但學不到。</div>`:""}`;
  if(S.dead) bottom=`<div class="dead"><b>你死了。</b><br>按上面的「撤回」回到上一步，或在齒輪裡重新開始。</div>`;
  else if(ch) bottom=checkHTML(ch)+`<div class="free" style="margin-top:10px">
        <textarea id="freein" rows="2" placeholder="或改做別的事、說句話…"></textarea>
        <button class="send" id="sendbtn">送出</button></div>`;
  else if(cs) bottom=candsHTML(cs);
  else if(pf) bottom=`<div class="check"><h3>${esc(pf.name)}怎麼了？</h3><div class="note" style="margin-bottom:8px">判定成功了，但故事沒寫清楚${esc(pf.name)}的下場。照你讀到的選一個，程序才知道要不要留屍體、給存在值。</div>
      <div class="cands"><button class="opt" data-fate="dead">牠死了（留下屍體）</button><button class="opt" data-fate="fled">牠逃了或投降了（還活著）</button>${HUMANOID.test(pf.name)?`<button class="opt" data-fate="cap">打昏了，帶回巢穴當俘虜</button>`:""}<button class="opt" data-fate="up">牠還站著</button></div></div>`;
  else if(!busy&&!S.err&&pendingSubs()) bottom=`<div class="check"><h3>選擇進化方向</h3><div class="cands">${pendingSubs().map((x,j)=>`<button class="opt" data-sub="${j}"><b>${esc(x.name)}</b><span class="cs">${esc(x.essence)}</span><span class="cs">${esc(x.look)}</span></button>`).join("")}</div></div>`;
  else if(!busy&&!S.err&&S.nameEvo&&S.party.some(p=>!p.named)){const can=S.party.map((p,k)=>[p,k]).filter(([p])=>!p.named);if(!can.some(([p,k])=>k===NE.k))NE.k=can[0][1];
    bottom=`<div class="check"><h3>命名進化</h3><div class="note">你進化了。可以替一名同伴取名，讓牠一起進化、選一個方向。</div>
      <div class="sacbox"><label>誰</label><select id="nek">${can.map(([p,k])=>`<option value="${k}"${k===NE.k?" selected":""}>${esc(p.n)}（${esc(p.kind)}）</option>`).join("")}</select>
      <label>新名字（不改就留空）</label><input id="nen" maxlength="10" value="${esc(NE.name)}" placeholder="${esc(S.party[NE.k].n)}" style="font:inherit;padding:7px;border:1px solid var(--line);border-radius:5px;background:var(--card);color:var(--ink)">
      <label>方向</label><select id="ned">${Object.keys(DIRS).map(d=>`<option${d===NE.dir?" selected":""}>${d}</option>`).join("")}</select></div>
      <button class="paybtn" id="neok">命名</button><div style="text-align:right;margin-top:6px"><button class="tl" id="neno">這次不命名</button></div></div>`}
  else if(!busy&&!S.err&&S.raid&&S.raid.now&&!S.raid.on){const r=S.raid;
    bottom=`<div class="check war"><h3>${esc(r.name)}來了</h3><div class="note">${esc(r.size)}・${r.lv}級。在${esc(NEST())}迎戰，共 ${r.army?5:3} 個階段，同伴全部上場。<br>對你有利：${raidAdv().slice(0,3).map(esc).join("、")||"沒有"}<br>輸了就是全滅。不想打，只能丟下一切逃走（存糧全失、人口剩一格、俘虜走散）。</div>
      <button class="paybtn" id="raidgo">迎戰</button>
      <div class="padd" style="margin-top:8px"><select id="fleeto">${moveDests().map(n=>`<option>${esc(n)}</option>`).join("")}</select><button class="tl" id="raidflee">丟下巢穴逃走</button></div></div>`}
  else if(!busy&&!S.err&&S.raid&&S.raid.on&&!(S.log.at(-1).alts&&S.log.at(-1).alts[S.log.at(-1).i].check)) bottom=`<div class="check war"><h3>討伐戰還沒打完</h3><button class="paybtn" id="raidcont">繼續（第 ${Math.min(S.raid.of,S.raid.stage)}/${S.raid.of} 階段）</button></div>`;
  else if(!busy&&!S.err&&S.war) bottom=`<div class="check war"><h3>進化戰還沒打完</h3><button class="paybtn" id="warcont">繼續（第 ${Math.min(5,S.war.stage)}/5 階段）</button></div>`;
  else if(!busy&&!S.err&&S.evo&&S.evo.forced!=null){const f=S.evo.cands[S.evo.forced];
    bottom=`<div class="check war"><h3>${esc(f.name)}找上門了</h3><div class="note">${esc(f.kind)}・${f.lv}級。${esc(f.note)}<br>期限已過，躲不掉了。</div><button class="paybtn" data-war="${S.evo.forced}">迎戰</button></div>`}
  else if(!busy&&!S.err){
    const opts=S.opts.map((o,i)=>`<button class="opt" data-o="${i}">${esc(o)}</button>`).join("");
    const menu=(S.stage==="幼體"?MENU_KID:MENU_ADULT).map(m=>`<button class="mb" data-mn="${m.k}">${m.k==="nest"&&!inNest()?`回巢穴・${pathHours(S.at,NEST())??"?"}h`:m.t}</button>`).join("");
    const left=S.evo?S.evo.due-nowH():0;
    const evoCard=S.evo?`<div class="check war evo"><h3>進化戰</h3><div class="note">存在值已滿，不會再增加。期限：${hStr(S.evo.due)}（還有 ${left} 小時）。逾期，其中一名會主動找上門。單挑，同伴不能插手；共 5 個階段。</div>
      ${S.evo.cands.map((f,i)=>`<div class="foe"><div><b>${esc(f.name)}</b><span>${esc(f.kind)}・${f.lv}級・${esc(f.where)}</span><div class="d">${esc(f.note)}</div></div><button class="tl" data-war="${i}">挑戰</button></div>`).join("")}</div>`:"";
    bottom=`${evoCard}${opts}
      <div class="menu">${menu}</div>
      ${TRAVEL?`<div class="exits"><div class="k">從${esc(S.at)}可以去：</div>${exitsOf(S.at).map(([n,h])=>`<button class="tl" data-go="${esc(n)}">${S.world[n].kind==="地區"?"":"📍"}${esc(n)}・${h}h</button>`).join("")}${hiddenOf(S.at).length?`<div class="note">這裡還有 ${hiddenOf(S.at).length} 個方向沒探索過。</div>`:""}</div>`:""}
      <div class="free">
        <textarea id="freein" rows="2" placeholder="或寫下你想做的事…（開頭打 ooc 可以問系統問題）"></textarea>
        <button class="send" id="sendbtn">送出</button>
      </div>`;
  }
  return `<div class="log" id="log">${html}${tail}</div><div class="choices">${S.dead?"":bag}${bottom}</div>`;
}
function bindStory(){
  const on=(id,f)=>{const b=$(id);if(b)b.onclick=f};
  document.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>act(S.opts[+b.dataset.o]));
  document.querySelectorAll("[data-mn]").forEach(b=>b.onclick=()=>doMenu(b.dataset.mn));
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>doMenu("travel",b.dataset.go));
  document.querySelectorAll("[data-ec]").forEach(b=>b.onclick=()=>{const i=+b.dataset.ec, c=S.corpses[i];
    if(c&&isHumanoid(c)&&witnesses(c).length){EA=EA===i?-1:i;render();return} eatCorpse(i)});
  document.querySelectorAll("[data-ecp]").forEach(b=>b.onclick=()=>{const [i,h]=b.dataset.ecp.split("|");EA=-1;eatCorpse(+i,null,h)});
  document.querySelectorAll("[data-ei]").forEach(b=>b.onclick=()=>eatItem(+b.dataset.ei));
  document.querySelectorAll("[data-dp]").forEach(b=>b.onclick=()=>drinkPotion(+b.dataset.dp));
  document.querySelectorAll("[data-hv]").forEach(b=>b.onclick=()=>harvest(+b.dataset.hv));
  document.querySelectorAll("[data-bi]").forEach(b=>b.onclick=()=>{const i=+b.dataset.bi;if(BI!==i){BI=i;render();return}BI=-1;eatItem(i)});
  document.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>learn(+b.dataset.l));
  document.querySelectorAll("[data-lp]").forEach(b=>b.onclick=()=>{const [j,k]=b.dataset.lp.split("|").map(Number);learnFor(j,k)});
  document.querySelectorAll("[data-war]").forEach(b=>b.onclick=()=>startWar(+b.dataset.war));
  document.querySelectorAll("[data-sub]").forEach(b=>b.onclick=()=>pickSub(+b.dataset.sub));
  document.querySelectorAll("[data-rt]").forEach(b=>b.onclick=()=>{const [k,a]=b.dataset.rt.split("|");retreat(k,a==null?null:+a)});
  on("rtopen",()=>{RETREAT=!RETREAT;render()});
  on("warcont",()=>contWar());
  on("raidgo",()=>startRaid());
  on("raidflee",()=>moveNest($("fleeto").value,true));
  on("raidcont",()=>{const r=S.raid;if(!r||busy)return;const half=Math.floor(r.of/2)+1;doJob({kind:"raid",ctx:{stage:r.stage,end:r.fails>=half?"lose":(r.wins>=half||r.stage>r.of)?(r.wins>r.fails?"win":"lose"):null}},snap(),S.log.length)});
  {const k=$("nek");if(k){k.onchange=()=>{NE.k=+k.value;render()};$("nen").oninput=e=>NE.name=e.target.value;$("ned").onchange=e=>NE.dir=e.target.value;
    $("neok").onclick=()=>{nameEvolve(NE.k,$("nen").value.trim(),$("ned").value);NE={k:0,dir:"戰士",name:""}};$("neno").onclick=()=>{S.nameEvo=false;save();render()}}}
  on("skip",skipLearn);
  document.querySelectorAll("[data-fate]").forEach(b=>b.onclick=()=>foeFate(b.dataset.fate));
  const ta=$("freein");
  if(ta){ $("sendbtn").onclick=()=>{const v=ta.value;if(v.trim()){ta.value="";act(v,true,pendingCheck()||null)}};
    ta.onkeydown=e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();$("sendbtn").click()}}; }
  const pb=$("paybtn");
  if(pb){
    const ch=pendingCheck(), ci=checkInfo(ch);
    const sel=()=>[...document.querySelectorAll("[data-c]")].filter(x=>x.checked).map(x=>+x.dataset.c);
    const ss=$("sacsel"), sac=()=>ss&&ss.value?ss.value:null;
    const sk=$("skillsel"); if(sk)sk.onchange=()=>{ch.useSk=sk.value||null;save();render()};
    const isel=$("itemsel"); if(isel)isel.onchange=()=>{ch.useItem=isel.value||null;save();render()};
    const upd=()=>{const n=sel().length+(sac()?2:0);pb.textContent=`付出 ${n} 項：${tierOf(n,ci)}`;pb.dataset.t=tierOf(n,ci)};
    document.querySelectorAll("[data-c]").forEach(x=>x.onchange=()=>{
      if(x.checked&&ci.costs[+x.dataset.c].g)document.querySelectorAll("[data-c]").forEach(y=>{if(y!==x&&ci.costs[+y.dataset.c].g)y.checked=false});
      upd()}); if(ss)ss.onchange=upd;
    pb.onclick=()=>pay(sel(),sac());
  }
  on("retry",()=>retry()); on("regen",regen); on("undo",undo);
  on("prv",()=>flip(-1)); on("nxt",()=>flip(1));
  on("edit",()=>{EDIT=true;render()}); on("edcancel",()=>{EDIT=false;render()}); on("edsave",saveEdit);
  const lg=$("log"); if(lg&&lg.lastElementChild&&!EDIT) lg.lastElementChild.scrollIntoView({block:"start",behavior:"smooth"});
}
function skillHTML(){
  const row=s=>{const i=S.skills.indexOf(s), st=(s.box||"act")==="store";
    const used=!isUq(s)&&!st&&skUsed(s.n);
    return `<div class="sk"${used?` style="opacity:.45"`:""}><span class="n">${esc(s.n)}${used?"（今天已用）":""}</span><span class="s">${esc(s.sys)}・${esc(fnOf(s))}</span><span class="lv">${esc(s.g||"")}</span>
      ${st?`<button class="tl" data-sw="${i}">${SWI.includes(i)?"取消換入":"換進可用"}</button>`:`<button class="tl" data-sx="${i}">${SWO.includes(i)?"取消換出":"換出到倉庫"}</button>`}
      <button class="tl" data-sd="${i}">${SD===i?"確定放棄？":"放棄"}</button></div>`};
  const mg=mergeGroups().map(g=>`<div class="note" style="margin:8px 0 4px"><b>${esc(g.fn)}・${g.g}級</b>：有 ${g.list.length} 個${g.ok&&g.to?`，選 5 個併成 1 個 ${g.to} 級`:g.to?`，要進化到 ${g.to} 級才能併成 ${g.to} 級`:""}</div>
    ${g.ok&&g.to?`<div class="tags">${g.list.map(s=>{const i=S.skills.indexOf(s);return `<button class="tag ut" data-mg="${esc(g.k)}|${i}" style="${MGK===g.k&&MG.includes(i)?"outline:2px solid currentColor":""}">${esc(s.n)}</button>`}).join("")}</div>
    ${MGK===g.k&&MG.length===5?`<button class="paybtn" id="mgdo" style="margin-top:6px">整合這 5 個（4 小時）</button>`:`<div class="note">已選 ${MGK===g.k?MG.length:0}／5</div>`}`:""}`).join("");
  const mgBox=mg?`<div class="card"><h3>整合</h3>${mg}<div class="note" style="margin-top:6px">5 個同功能、同等級的技能可以併成 1 個高一級的（最高只能比你高一級）。整合和換技能都要花 4 小時，這段時間可能出小麻煩。</div></div>`:"";
  const uq=S.skills.filter(isUq).map(s=>`<div class="sk"><span class="n">${esc(s.n)}</span><span class="uniq">UNIQUE</span></div>${s.note?`<div class="note" style="margin:-2px 0 6px">${esc(s.note)}</div>`:""}`).join("");
  const [ac,sc]=boxCap(S.lv), act=boxList("act"), sto=boxList("store");
  const over=sto.length>sc?`<div class="note" style="color:var(--bad,#c33);margin:6px 0">倉庫滿了（${sto.length}／${sc}）。請整合或放棄技能。</div>`:"";
  const sk=`${uq}<h4 style="margin:10px 0 4px">可用（${act.length}／${ac}）</h4>${act.map(row).join("")||`<div class="empty">還沒有。</div>`}
    <h4 style="margin:10px 0 4px">倉庫（${sto.length}／${sc}）</h4>${over}${sto.map(row).join("")||`<div class="empty">空的。</div>`}`;
  const swBar=SWI.length||SWO.length?`<div class="note" style="margin:8px 0">要整理：${SWI.length} 個換進可用、${SWO.length} 個換出。${swapOk()?"":"換完可用的數量會超過上限，請多勾幾個要換出的。"}</div>${swapOk()?`<button class="paybtn" id="swdo">確定整理（合計 4 小時）</button>`:""}`:`<div class="note" style="margin:6px 0">想換技能：在倉庫勾「換進可用」，在可用勾「換出到倉庫」，勾幾個都行，一次合計 4 小時。</div>`;
  return `<div class="card"><h3>技能</h3>${swBar}${sk}</div>${mgBox}
    <div class="card"><h3>狀態</h3>${S.tags.length?`<div class="tags">${S.tags.map((t,i)=>/幼體|飢餓|瀕死/.test(t)?`<span class="tag">${esc(t)}</span>`:`<button class="tag ut" data-ut="${i}">${esc(t)}${UT===i?"　再點一次拿掉":"　×"}</button>`).join("")}</div>`:`<div class="empty">沒有。</div>`}
      <div class="note" style="margin-top:6px">狀態在故事裡解決了就會自動拿掉；程序沒拿掉的，可以點兩下手動拿掉。</div>
      <div class="note" style="margin-top:8px">${hasTag("飢餓")?"正餓著。":`飽足還能撐 ${S.full} 小時。`}${S.stage}餓著的時候，每 ${hungerOf().every} 小時 HP -1。</div></div>
    <div class="card"><h3>背包</h3>${S.corpses.length+S.items.length?`${S.corpses.map((c,i)=>`<div class="crow">🍖 ${esc(c.name)}（${c.lv}級・${c.harvested?"原料已拆・":""}${isFresh(c)?`新鮮，還有 ${24-ageOf(c)} 小時`:`不新鮮了，${Math.max(0,72-ageOf(c))} 小時後爛掉`}）${c.evo?"":`<button class="tl" data-cd="${i}">${CD===i?"確定拿掉？":"已經給人／丟掉"}</button>`}</div>`).join("")}${S.items.map((it,i)=>{const m=matOf(it);return `<div class="crow">${m?`✦ ${esc(it)}（${m.skill?`魔法物品，附帶「${esc(m.skill.n)}」`:"魔法原料"}・${m.lv}級）`:esc(it)}${POTION(it)?`<button class="tl" data-dp="${i}">喝掉</button>`:""}<button class="tl" data-di="${i}">${DI===i?"確定拿掉？":"已經給人／丟掉"}</button></div>`}).join("")}`:`<div class="empty">什麼都沒有。</div>`}
      <div class="note" style="margin-top:6px">🍖 是食材：新鮮的吃了能學技能。✦ 是魔法原料或魔法物品：不會壞，吃了能學技能；魔法物品帶在身上時，它的技能可以在判定時拿來用。魔獸（E 級以上）的屍體可以拆出一項原料，拆了就只剩肉。其他物品吃了只是硬吞。</div></div>
    <div class="note">用技能：判定卡上選一個技能來用，攻擊、輔助、強化都一樣，用了就多一層優勢（少付一項）。一次一個，沒有組合技，不花 MP。<br>技能沒有 Lv，只有等級字母（學到時你的等級）。可用的位置滿了，新技能自動放進倉庫；已經會的技能不會再出現在吸收選單裡。只有新鮮的東西（死去 24 小時內的屍體、活捉的小生物、蛋、新鮮植物）能學到技能。同級保底 1 個，每高一級多 1 個，大成功再 +1。</div>
    <div class="note" style="margin-top:6px">恢復：醒著沒餓，每 3 小時 HP +1（有「再生」就 +再生等級）、MP +1。夜裡睡到天亮：沒餓 HP 回一半、MP 回滿，疲勞和小傷一起消掉；餓著 HP 不回、MP 回一半。白天小睡 3 小時：HP、MP 各回四分之一，消掉【疲憊】。吃東西 HP +1~2。</div>
    ${S.sub?`<div class="card" style="margin-top:12px"><h3>種族：${esc(S.sub.name)}</h3><div>${esc(S.sub.essence)}</div><div class="note">${esc(S.sub.look||"")}</div></div>`:""}`;
}
function track(k,label,list,v){
  const pips=list.map((_,i)=>`<span class="pip${i<v?" on":""}"></span>`).join("");
  return `<div class="trk"><span class="k">${label}</span><span class="v">${list[v-1]}</span><span class="pips" title="${TRACK_HINT[k]}">${pips}</span></div>`;
}
function partyHTML(){
  const rows=S.party.map((p,k)=>`<div class="npc"><div class="h"><b>${esc(p.n)}</b><span>${esc(p.kind)}・${p.lv} 級${p.knack?`・本事：${esc(p.knack)}`:""}</span></div>
      <div class="d">${p.skills.length?p.skills.map(x=>`${esc(x.n)} Lv${x.lv}`).join("、"):"還沒有技能"}${p.tags.length?`　【${p.tags.map(esc).join("】【")}】`:""}</div>
      ${p.note?`<div class="d" style="color:var(--mute)">${esc(p.note)}</div>`:""}
      <div class="pbtn"><button class="tl" data-pw="${k}">${p.with?"同行中 → 留在巢穴":"留在巢穴 → 帶在身邊"}</button><button class="tl" data-pq="${k}">${PQ===k?"確定讓牠離開？":"離隊"}</button><button class="tl" data-rn="${k}">改名</button></div>
      ${RN===k?`<div class="padd" style="margin-top:6px"><input id="rnv" maxlength="10" placeholder="新名字"><button class="tl" id="rnok">確定</button></div>`:""}
      <div class="d">拿著：${(p.hold||[]).length?(p.hold||[]).map((h,j)=>`${esc(h)} <button class="tl" data-hb="${k}|${j}">收回</button>`).join("　"):"空手"}${(p.hold||[]).length<3&&S.items.some(n=>!(matOf(n)&&matOf(n).skill))?` <select data-hg="${k}"><option value="">交給牠…</option>${S.items.filter(n=>!(matOf(n)&&matOf(n).skill)).map(n=>`<option>${esc(n)}</option>`).join("")}</select>`:""}</div>
      ${!p.with?`<div class="d">派工：<select data-job="${k}">${Object.entries(JOBS).map(([j,t])=>`<option value="${j}"${(p.job||"")===j?" selected":""}>${j||"不派工"}${j?`（${t}）`:""}</option>`).join("")}</select></div>`:""}
      ${p.alias&&p.alias.length?`<div class="d" style="color:var(--mute)">以前叫：${p.alias.map(esc).join("、")}</div>`:""}
      ${p.gear||S.items.some(n=>matOf(n)&&matOf(n).skill)?`<div class="d">裝備：<select data-eq="${k}"><option value="">（沒有）</option>${[...(p.gear?[p.gear]:[]),...S.items.filter(n=>matOf(n)&&matOf(n).skill)].map(n=>`<option value="${esc(n)}"${p.gear===n?" selected":""}>✦${esc(n)}（${esc((p.gear===n?p.gearMat:matOf(n)).skill.n)}）</option>`).join("")}</select></div>`:""}</div>`).join("");
  return `<div class="card"><h3>同伴</h3>${PNOTE?`<div class="err">${esc(PNOTE)}</div>`:""}${rows||`<div class="empty">還沒有同伴。</div>`}
    <div class="note" style="margin:8px 0 6px">最多兩名同行，其餘留在巢穴，可以派工（狩獵、採集、看守俘虜、照顧俘虜、巡邏），每天換日時生效。同伴最多 3 個技能（命名過的 4 個），吃東西學到的技能可以給牠們；魔法物品可以給牠們裝備。受傷先【負傷】，再傷就【重傷】退出行動；睡一晚會好轉。<br>故事裡已經跟著你、程序卻沒記到的，可以在這裡補上：</div>
    <div class="padd"><input id="pn" maxlength="10" placeholder="名字"><input id="pk" maxlength="10" placeholder="本事（例如 偵查）"><button class="tl" id="padd">加入</button></div></div>`;
}
let PQ=-1;
function bindNest(){
  {const b=$("mvok");if(b)b.onclick=()=>{const v=$("mvto").value;if(MV!==v){MV=v;render();return}moveNest(v,false)}}
  document.querySelectorAll("[data-pw]").forEach(b=>b.onclick=()=>{const p=S.party[+b.dataset.pw];
    if(!p.with&&S.party.filter(x=>x.with).length>=2){alertNote("同行最多兩名。");return}
    if(!p.with&&p.tags.includes("重傷")){alertNote(`${p.n}還在養傷。`);return}
    p.with=!p.with; if(p.with)p.job=""; save();render()});
  document.querySelectorAll("[data-hg]").forEach(sel=>sel.onchange=()=>{if(!sel.value)return;const n=[];equipAlly(S.party[+sel.dataset.hg].n,sel.value,false,n);S.log.push(sysEntry(n.join("\n")));save();render()});
  document.querySelectorAll("[data-hb]").forEach(b=>b.onclick=()=>{const [k,j]=b.dataset.hb.split("|").map(Number);const p=S.party[k];const it=p.hold[j];if(it==null)return;p.hold.splice(j,1);S.items.push(it);if(p.holdMat&&p.holdMat[it]){S.mat[it]=p.holdMat[it];delete p.holdMat[it]}save();render()});
  document.querySelectorAll("[data-job]").forEach(sel=>sel.onchange=()=>{S.party[+sel.dataset.job].job=sel.value;save();render()});
  document.querySelectorAll("[data-eq]").forEach(sel=>sel.onchange=()=>{const p=S.party[+sel.dataset.eq], v=sel.value;
    if(p.gear){S.items.push(p.gear);S.mat[p.gear]=p.gearMat;p.gear=null;p.gearMat=null}
    if(v){const i=S.items.indexOf(v);if(i>=0){S.items.splice(i,1);p.gear=v;p.gearMat=S.mat[v];delete S.mat[v]}}
    S.log.push(sysEntry(p.gear?`${p.n}裝備了 ✦${p.gear}，學會用「${p.gearMat.skill.n}」。`:`${p.n}卸下了裝備。`));save();render()});
  document.querySelectorAll("[data-rn]").forEach(b=>b.onclick=()=>{const k=+b.dataset.rn;RN=RN===k?-1:k;render()});
  {const ok=$("rnok");if(ok)ok.onclick=()=>{const v=$("rnv").value.trim();const p=S.party[RN];if(v&&p){const n=[];renameChar(p.n,v,n);S.log.push(sysEntry(n.join("\n")));save()}RN=-1;render()}}
  document.querySelectorAll("[data-pq]").forEach(b=>b.onclick=()=>{const k=+b.dataset.pq;if(PQ!==k){PQ=k;render();return}
    const p=S.party[k];S.party.splice(k,1);PQ=-1;const npc=S.npcs.find(x=>x.n===p.n);if(npc)npc.rel="疏遠";save();render()});
  document.querySelectorAll("[data-gn]").forEach(b=>b.onclick=()=>{const [k,i]=b.dataset.gn.split("|");giveNest(k,+i)});
  document.querySelectorAll("[data-ng]").forEach(b=>b.onclick=()=>{const n=b.dataset.ng;if(NG!==n){NG=n;render();return}NG="";npcGone(n,"離開了",null);save();render()});
  const a=$("padd"); if(a)a.onclick=()=>{const n=$("pn").value.trim();if(!n)return;
    const npc=S.npcs.find(x=>x.n===n);recruit({name:n,kind:npc?"哥布林":"哥布林",knack:$("pk").value.trim(),note:""},null);save();render()};
}
let SD=-1, DI=-1, PNOTE="", UT=-1, NG="", BI=-1, CD=-1, TRAVEL=false, RN=-1, EA=-1, NE={k:0,dir:"戰士",name:""};
function alertNote(t){PNOTE=t;render();PNOTE=""}
function nestGiveHTML(){
  if(!inNest())return `<div class="note" style="margin-top:6px">回到${NEST()}才能把食物交給巢穴。</div>`;
  const cs=S.corpses.map((c,i)=>!c.evo&&shareOfCorpse(c)?`<button class="tl" data-gn="c|${i}">${esc(c.name)}（+${shareOfCorpse(c)}）</button>`:"").join("");
  const is=S.items.map((it,i)=>shareOfItem(it)?`<button class="tl" data-gn="i|${i}">${esc(it)}（+${shareOfItem(it)}）</button>`:"").join("");
  return cs||is?`<div style="margin-top:8px"><div class="k" style="font-size:12.5px;font-weight:800;margin-bottom:4px">交給巢穴</div><div class="gives" style="justify-content:flex-start">${cs}${is}</div></div>`:"";
}
function placesHTML(){return ""}
function mapHTML(){
  const h=here(), known=Object.entries(S.world).filter(([n,x])=>x.known&&n!==S.at);
  const ppl=n=>S.npcs.filter(y=>y.where===n&&!S.party.some(p=>p.n===y.n));
  const sl=n=>isSettle(n)?`<div class="d">對你：<b>${SREL[stOf(n)+2]}</b>${S.world[n].grudge?`　記仇 ${S.world[n].grudge}`:""}${(S.world[n].deals||[]).length?`<br>約定：${S.world[n].deals.map(esc).join("；")}`:""}</div>`:"";
  const row=([n,x])=>`<div class="npc"><div class="h"><b>${x.kind==="地區"?"":"📍"}${esc(n)}</b><span>${esc(x.kind)}${x.kind!=="地區"&&x.region&&x.region!==n?`・屬於${esc(x.region)}`:""}・從這裡 ${pathHours(S.at,n)??"?"} 小時</span></div>
      ${x.note?`<div class="d">${esc(x.note)}</div>`:""}${sl(n)}${ppl(n).map(y=>`<div class="d">・${esc(y.n)}（${esc(y.role)}・${y.lv}級）對你：<b>${REL[relOf(y)+2]}</b></div>`).join("")}</div>`;
  return tradeHTML()+`<div class="card"><h3>現在在：${esc(S.at)}</h3><div class="note">${esc(h.kind)}${h.note?`・${esc(h.note)}`:""}</div>${sl(S.at)}
      ${ppl(S.at).map(y=>`<div class="d">・${esc(y.n)}（${esc(y.role)}）對你：<b>${REL[relOf(y)+2]}</b></div>`).join("")}
      <div class="exits" style="margin-top:8px"><div class="k">出口</div>${exitsOf(S.at).map(([n,x])=>`<div class="row"><span>${esc(n)}</span><span>${x} 小時</span></div>`).join("")}
      ${hiddenOf(S.at).length?`<div class="note">還有 ${hiddenOf(S.at).length} 個方向沒探索過，按「探索」去找。</div>`:`<div class="note">這附近的路都走過了；再探索會發現新的冒險地點或地形。</div>`}</div>
      <div class="note" style="margin-top:6px">聚落對你：敵對 → 警戒 → 中立 → 交易 → 友好 → 同盟。到「交易」才能以物易物；公道的生意做幾次會更好。當眾吃他們的族人會被記仇。</div></div>
    <div class="card"><h3>已知的地點</h3>${known.filter(([n,x])=>x.kind!=="地區").map(row).join("")||`<div class="empty">還沒有。</div>`}</div>
    ${S.npcs.some(x=>!x.where&&!S.party.some(p=>p.n===x.n))?`<div class="card"><h3>其他認識的人</h3>${S.npcs.filter(x=>!x.where&&!S.party.some(p=>p.n===x.n)).map(x=>`<div class="d">・${esc(x.n)}（${esc(x.role)}）住處不明</div>`).join("")}</div>`:""}
    <div class="card"><h3>已知的地區</h3>${known.filter(([n,x])=>x.kind==="地區").map(row).join("")}</div>
    <div class="card"><h3>自己加一個地點</h3><div class="note" style="margin-bottom:6px">接在「${esc(S.at)}」旁邊。</div>
      <div class="padd"><input id="mn" maxlength="12" placeholder="地名"><select id="mk"><option>冒險地點</option><option>地形</option><option>聚落</option><option>營地</option><option>巢穴</option></select><select id="mh"><option value="1">1h</option><option value="2">2h</option><option value="3">3h</option><option value="4">4h</option></select></div>
      <div class="padd" style="margin-top:6px"><input id="mt" maxlength="40" placeholder="一句話說明（可以不填）"><button class="tl" id="madd">加入</button></div></div>`;
}
function bindMap(){
  document.querySelectorAll("[data-tr]").forEach(c=>c.onchange=()=>{TRD.sel[c.dataset.tr]=c.checked;render()});
  {const w=$("trw");if(w){w.oninput=e=>TRD.want=e.target.value;$("trok").onclick=()=>{TRD.want=w.value;doTrade()}}}
  const b=$("madd"); if(b)b.onclick=()=>{const n=$("mn").value.trim();if(!n)return;
    addNode({name:n,kind:$("mk").value,note:$("mt").value.trim()},S.at,+$("mh").value,null);save();render()};
}
/* 搬家目的地：已知的非聚落地點、營地（isSettle 把營地也算聚落，這裡要放行）、友好聚落（態度 ≥1）旁邊的「○○外圍營地」（搬過去時自動建立） */
const moveDests=()=>{
  const ks=Object.keys(S.world), nest=NEST();
  const base=ks.filter(k=>S.world[k].known&&k!==nest&&S.world[k].kind!=="廢棄的巢穴"&&(!isSettle(k)||S.world[k].kind==="營地"));
  const out=ks.filter(k=>S.world[k].known&&k!==nest&&isSettle(k)&&S.world[k].kind!=="營地"&&S.world[k].kind!=="巢穴"&&(S.world[k].st||0)>=1&&!k.endsWith("外圍營地")).map(k=>k+"外圍營地").filter(n=>n!==nest&&!ks.includes(n));
  return [...base,...out];
};
function heatHTML(){
  const k=heatLv(), r=S.raid, left=r?Math.max(0,Math.ceil((r.due-nowH())/24)):0;
  return `<div class="card"><h3>外面的眼光</h3>${track("heat","注目度",HEAT.map(h=>h.n),k+1)}
    <div class="note" style="margin-top:6px">巢穴變大、進化、殺人類或精靈矮人、當眾吃人、抓人回來，都會被注意。安分過日子，注目度會慢慢降。到「討伐」，人類會派討伐隊來；到「討伐軍」來的是上百人。</div>
    ${r?`<div class="err" style="margin-top:8px">${esc(r.name)}（${esc(r.size)}・${r.lv}級）正在路上：${r.now?"已經到了":r.seen?`大約 ${left} 天後到`:"不知道什麼時候會到（派人巡邏才看得到動向）"}。<br>對你有利：${raidAdv().slice(0,3).map(esc).join("、")||"沒有"}</div>`:""}
    <div style="margin-top:8px"><div class="k" style="font-size:12.5px;font-weight:800;margin-bottom:4px">搬家</div>
      <div class="note" style="margin-bottom:6px">整窩搬到已知的地點：路上要花時間、存糧丟一半、可能有幾隻不肯走；巢穴原本的地利沒了。討伐隊會撲空，注目度降回「風聲」。${(S.chap||1)<4?"（會進入第 4 章）":""}</div>
      <div class="padd"><select id="mvto">${moveDests().map(n=>`<option${MV===n?" selected":""}>${esc(n)}</option>`).join("")}</select><button class="tl" id="mvok">${MV?"確定搬家？":"搬過去"}</button></div></div></div>`;
}
function nestHTML(){
  const n=S.nest;
  return partyHTML()+heatHTML()+`<div class="card"><h3>${esc(n.name)}</h3>
      <div class="note" style="margin-bottom:8px">${esc(n.note)}</div>
      ${track("p","存糧",PROS,n.p)}${track("pop","人口",POP,n.pop)}${track("d","戰力",DEF,n.d)}
      <div class="tags">${n.tags.map(t=>`<span class="tag ${t.c||""}">〔${esc(t.t)}〕</span>`).join("")}</div>
      <div class="row" style="margin-top:8px"><span class="k">存糧</span><span><b>${n.food||0}</b> 份・每天吃 ${needOf()} 份・夠吃 ${daysOf()} 天${n.fed?`・已經連續吃飽 ${n.fed} 天`:""}</span></div>
      <div class="note" style="margin-top:6px">交給巢穴的屍體：F 級 1 份、E 級 3 份、D 級 6 份；肉 1~2 份。每天吃掉「人口格數」份，俘虜和約定留下的人每人再 1 份。存糧吃光，人口掉一格；連續吃飽 3 天，人口漲一格。夠吃 3 天以上，〔需求（食物）〕自動拿掉。人口、戰力和其他標籤照故事裡發生的事變動。</div>
      ${nestGiveHTML()}
    </div>
    <div class="card"><h3>周圍的勢力</h3>${Object.entries(S.factions).map(([k,f])=>`<div class="row"><span class="k">${esc(k)}</span><span>${f.n>0?`約 ${f.n} / ${f.max}`:"已經被打散"}</span></div>`).join("")}
      <div class="note" style="margin-top:6px">打倒一隻少一隻。打散了就不會再遇到，相關的巢穴禍患也會拿掉。</div></div>
    ${placesHTML()}
    <div class="card"><h3>巢穴裡的人</h3>
      ${S.npcs.filter(x=>!S.party.some(p=>p.n===x.n)&&x.where===NEST()).map(x=>`<div class="npc"><div class="h"><b>${esc(x.n)}${x.captive?"　〔俘虜〕":x.contract?"　〔約定〕":""}</b><span>${esc(x.role)}・${x.lv} 級</span></div>
        <div class="d">${esc(x.face)}　·　對你：<b>${REL[relOf(x)+2]}</b> <span class="pips">${REL.map((_,i)=>`<span class="pip${i<=relOf(x)+2?" on":""}${i>(x.cap==null?3:x.cap)+2?" off":""}"></span>`).join("")}</span>${x.foe?"　（對手）":""}</div>
        <div class="pbtn"><button class="tl" data-ng="${esc(x.n)}">${NG===x.n?"確定他已經不在了？":"他已經不在了"}</button></div></div>`).join("")}
      ${S.gone.length?`<div class="note" style="margin-top:8px">不在的人：${S.gone.map(x=>`${esc(x.n)}（${esc(x.why)}）`).join("、")}</div>`:""}
    </div>`;
}
function recordHTML(){
  return `<div class="card"><h3>吞噬圖鑑</h3>${S.eaten.length?S.eaten.map(e=>`<div class="row"><span class="k">第${e.day}天</span><span>${esc(e.what)}${e.got?"　→ "+esc(e.got):""}</span></div>`).join(""):`<div class="empty">還沒有紀錄。</div>`}</div>
    <div class="card"><h3>稱號</h3>${S.titles.length?S.titles.map(t=>`<div>${esc(t)}</div>`).join(""):`<div class="empty">還沒有。</div>`}</div>`;
}

