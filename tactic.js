/* 魔物篇｜tactic.js：標籤式行動組合解析器（v0.78）。
   規格：Project《異世界RPG_標籤式行動組合解析器_規格_1112》；程式照 isekai-playbook7 的 combo.js（artCheck）改。
   用戶 11-15 定：
   - 判定卡出現時打字：大賢者判斷是不是在出手。是 → 拆成步驟，程式照標籤和對手特性判斷每一步成不成立；不是 → 照舊「改做這件事」交給 AI。可以更正、撤回。
   - 每個成立的步驟 +1（一層優勢）。用到的技能照舊扣次數和 MP（自己的技能 1 MP，魔法物品附帶的不扣；8 個技能就 −8 MP）。排列組合是玩家自己描述的。
   - 所有判定卡都能用，包括關鍵戰（關鍵戰淨優勢照舊最多 0）。招（記下來、叫名字重放）之後再做。
   Claude 定的（可改）：同一個東西做同一種事只算一步；徒手、武器、地形不用 MP，一場各自最多算一步；技能標籤照系別和名字推。
   欄位：判定卡 ch.tac={text,steps,res,keys,mp,bonus}（ch.combo 已經是合體技，不能用）。 */
const TAC_TAGS=["火","水","土","風","木","光","暗","切割","重量","硬化","包覆","聲音","移動","感知","魔力"];
const TAC_PRIM={
  傷害:["切割","重量","硬化","火","水","風","魔力","土","暗","木","光"],
  防護:["硬化","包覆","土","水","風","木"],
  位移:["移動","風","重量"],
  破綻:["感知","聲音","光"],
  隱匿:["包覆","聲音","暗","木","土"],
  環境:["土","水","火","風","木"],
  附加:TAC_TAGS,增幅:TAC_TAGS};
const TAC_CTRL={束縛:["包覆","重量","土","木"],減速:["水","土","包覆","暗","木"],致盲:["光","火","暗","土"],擊退:["重量","風"],
  窒息:["包覆","水","風","土"],威嚇:["火","光","聲音"],中毒:["暗"]};
const TAC_ALIAS={黏:"土",黏液:"土",粉末:"土",粉:"土",沙:"土",沙子:"土",泥:"土",岩:"土",石:"土",
  酸:"水",冰:"水",冷:"水",霧:"水",雪:"水",毒:"暗",影:"暗",詛咒:"暗",熱:"火",炎:"火",熔岩:"火",雷:"風",電:"風",草:"木",根:"木",藤:"木"};
const tacTag=t=>{t=String(t||"").trim();return TAC_ALIAS[t]||t};
const tacUniq=a=>[...new Set(a)];
function tacStep(st){
  const x=Object.assign({},st||{},{src:String((st||{}).src||"").trim(),prim:String((st||{}).prim||"").trim(),kind:String((st||{}).kind||"").trim(),tags:tacUniq(((st||{}).tags||[]).map(tacTag))});
  if(x.prim==="腐蝕"||(x.prim==="控制"&&x.kind==="腐蝕")){x.prim="傷害";x.kind=""}
  if(TAC_CTRL[x.prim]){x.kind=x.prim;x.prim="控制"}
  return x;
}
/* 技能的標籤：照系別和名字推（玩家不用自己標） */
const SK_TAG_RE=[["切割",/牙|爪|咬|撕|刺|斬|砍|劈|割|刃|刀|劍|矛|鐮|角|啄/],["重量",/撞|衝|砸|踩|拳|摔|壓|錘|重|蠻力|怪力|尾|甩|踢|猛/],["硬化",/硬|殼|鱗|甲|盾|岩膚|鐵皮/],
  ["移動",/疾|跑|奔|跳|躍|攀|飛|滑翔|潛行|閃|竄|步|遁/],["感知",/嗅|夜視|感知|聽|看|察|探|洞察|鷹眼|直覺|預判/],["聲音",/吼|嚎|叫|歌|鳴|聲|咆哮|尖嘯|威嚇|恐嚇|嚇/],
  ["包覆",/絲|網|纏|捆|包|裹|黏|膜/],["暗",/毒|影|暗|詛咒|腐/],["火",/火|炎|焰|燃|灼|熱/],["水",/水|冰|寒|霜|雪|霧|酸|潮/],["風",/風|雷|電|旋|嵐/],
  ["土",/土|岩|石|沙|泥|地裂/],["木",/木|藤|根|草|花|葉|孢/],["光",/光|聖|曦|治癒/],["魔力",/魔|法術|咒|術/]];
function skTags(s){
  if(Array.isArray(s.tags)&&s.tags.length)return s.tags.map(tacTag).filter(t=>TAC_TAGS.includes(t));
  const n=String(s.n||""), out=SK_TAG_RE.filter(([,re])=>re.test(n)).map(([t])=>t);
  if(ELEMS.includes(s.sys))out.unshift(s.sys);
  if(!out.length)out.push(s.sys==="意圖"?"感知":s.sys==="武技"?"切割":"重量");
  if(s.sys==="意圖"&&!out.some(t=>["感知","聲音"].includes(t)))out.push("感知");
  return tacUniq(out).slice(0,5);
}
/* 周圍的地形 */
const ENV_RE=[["木",/林|森|樹|叢|藤/],["水",/河|湖|溪|沼|泉|海|潭|雪|冰|霜/],["土",/岩|山|洞|石|礦|丘|谷|窟|坡/],["火",/火山|熔/],["風",/崖|高原|峰|風/]];
function envTags(){const t=`${S.at||""}${here().region||""}${(regionOf()||{}).n||""}${((regionOf()||{}).terr||[]).join("")}`;return ENV_RE.filter(([,re])=>re.test(t)).map(([k])=>k)}
/* 這張判定卡能拿來用的東西 */
function tacSources(ch){
  const L=[], fl=ch&&ch.foeLv?gIdx(ch.foeLv):-1;
  if(!(ch&&ch.noSk)){
    boxList("act").forEach(s=>L.push({n:s.n,k:"skill",key:s.n,mp:1,tags:skTags(s),used:skUsed(s.n)}));
    S.items.forEach(it=>{const m=matOf(it);if(!m||!m.skill||L.some(x=>x.it===it))return;const key=`${m.skill.n}（${it}）`;
      if(fl>=0&&gIdx(m.lv)<fl)return;   /* 比對手低的魔法物品不拿來組合（單獨選技能時照舊可以硬用） */
      L.push({n:key,k:"item",key,mp:0,it,tags:skTags(m.skill),used:skUsed(key)})});
  }
  const w=S.eq&&S.eq.武器; if(w){const m=matOf(w);const tg=/錘|槌|鎚|棍|棒|斧/.test(w)?["重量"]:/弓|弩|投石/.test(w)?["切割","移動"]:["切割"];if(m&&m.fx&&m.fx.t==="elem")tg.push(m.fx.v);L.push({n:w,k:"weapon",tags:tacUniq(tg),free:true})}
  const env=envTags(); if(env.length)L.push({n:"周圍",k:"env",tags:env,free:true,label:"周圍的地形"});
  L.push({n:"自己",k:"self",tags:["移動","重量","感知"],free:true,label:"你自己（徒手）"});
  return L;
}
function tacFoeTags(ch){const t=(ch.foeTags||[]).slice();if((ch.group||1)>1||ch.multi)t.push("群體");return tacUniq(t)}
/* 檢查步驟：每一步成不成立、算幾層 */
function tacCheck(steps,ch){
  steps=(steps||[]).map(tacStep).slice(0,8);
  const src=tacSources(ch), by=n=>src.find(x=>x.n===n)||src.find(x=>x.k==="item"&&(x.n.startsWith(n)||x.it===n))||src.find(x=>n&&x.n.includes(n));
  const fired=[], idle=[], res=[], attached={}, seen=new Set(), freeUsed=new Set(); let mp=S.mp;
  const T=tacFoeTags(ch), foe=ch.foe||"對手";
  steps.forEach((st,i)=>{
    const x=by(st.src), head=`${x?x.label||x.n:st.src}・${st.prim==="控制"?st.kind:st.prim}${st.tags.length?`〔${st.tags.join("")}〕`:""}`;
    const r={head,say:st.say||"",prim:st.prim,kind:st.kind,ok:false,count:false,tags:[]}; res.push(r);
    if(!x){r.why=`手邊沒有${st.src||"這個東西"}`;return}
    if(!fired.includes(x)){
      if(x.used){r.why=`【${x.n}】今天用過了`;return}
      if(x.mp&&mp<x.mp){r.why=`MP 不夠（${x.n}）`;return}
      mp-=x.mp||0; fired.push(x);
    }
    const allow=tacUniq(x.tags.concat(attached[x.n]||[]));
    const tags=st.tags.filter(t=>allow.includes(t)); r.tags=tags;
    if(!tags.length){r.why=`${x.label||x.n}沒有「${st.tags.join("、")||"這種"}」的性質（它有：${allow.join("、")}）`;return}
    if(st.prim==="控制"){const need=TAC_CTRL[st.kind];if(!need){r.why="看不出是哪種控制";return}if(!tags.some(t=>need.includes(t))){r.why=`${st.kind}要有${need.join("、")}其中之一`;return}}
    else if(!TAC_PRIM[st.prim]){r.why="看不出這一步在做什麼";return}
    else if(!tags.some(t=>TAC_PRIM[st.prim].includes(t))){r.why=`${st.prim}要有${TAC_PRIM[st.prim].join("、")}其中之一`;return}
    if(st.prim==="增幅"){const j=parseInt(st.to,10)-1,t=res[j];
      if(!(j>=0&&j<i&&t&&t.ok)){r.why="要增幅的那一步不存在或沒成立";return}
      const fit=t.prim==="控制"?(TAC_CTRL[t.kind]||[]):(TAC_PRIM[t.prim]||[]);
      if(!(tags.some(y=>t.tags.includes(y))||tags.some(y=>fit.includes(y))||(tags.includes("風")&&t.tags.includes("火"))||tags.includes("魔力"))){r.why="和要增幅的那一步沒有關聯";return}}
    const has=y=>tags.includes(y);
    if(st.prim==="傷害"&&T.includes("群體")&&!tags.some(y=>["火","風","水","土","木"].includes(y))){r.why="一群東西，單點的攻擊打不完";return}
    if(st.prim==="傷害"&&T.includes("敏捷")&&!res.slice(0,i).some(p=>p.ok&&["控制","破綻","隱匿"].includes(p.prim))){r.why=`${foe}太快，直接打會被躲開（先困住、找破綻或躲起來）`;return}
    if(st.prim==="傷害"&&T.includes("硬甲")&&tags.every(y=>y==="切割")){r.why=`${foe}的硬殼，光用割的沒用`;return}
    if(st.prim==="環境"&&T.includes("飛行")&&!has("風")){r.why=`${foe}在天上，地形困不住牠`;return}
    if(st.prim==="控制"){
      if(st.kind==="致盲"&&T.includes("無眼")){r.why=`${foe}沒有眼睛`;return}
      if(st.kind==="束縛"&&T.includes("飛行")&&!has("重量")&&!has("土")){r.why=`${foe}在天上，要帶重量或土才拉得下來`;return}
      if(st.kind==="束縛"&&T.includes("群體")){r.why="一群東西綁不住";return}
      if((st.kind==="窒息"||st.kind==="中毒")&&T.includes("不呼吸")){r.why=`${foe}不用呼吸`;return}
      if((st.kind==="威嚇"||st.kind==="中毒")&&T.includes("構裝")){r.why=`${foe}不會怕、也不吃毒`;return}
      if((st.kind==="束縛"||st.kind==="擊退")&&T.includes("巨大")&&!has("重量")){r.why=`${foe}太大，要帶重量才壓得住`;return}}
    if(st.prim==="附加"&&st.to)attached[st.to]=tacUniq((attached[st.to]||[]).concat(tags));
    r.ok=true;
    const key=`${x.n}|${st.prim}|${st.kind}`;
    if(seen.has(key)){r.note="同一個東西做同一種事，只算一步";return}
    if(x.free&&freeUsed.has(x.n)){r.note=`${x.label||x.n}一場只算一步`;return}
    seen.add(key); if(x.free)freeUsed.add(x.n); r.count=true;
  });
  const used=fired.filter(x=>x.k==="skill"||x.k==="item");
  return {steps,res,idle,bonus:res.filter(r=>r.count).length,keys:used.map(x=>x.key),mp:used.reduce((a,x)=>a+(x.mp||0),0),foeTags:T};
}
/* 判定的優勢：成立的步驟各一層 */
function tacAdv(ch){return ch&&ch.tac?ch.tac.res.filter(r=>r.count).map(r=>`組合：${r.head}`):[]}
/* 大賢者：把玩家的話拆成步驟 */
function tacMsgs(text,ch){
  const src=tacSources(ch).filter(x=>!x.used);
  const prim=Object.entries(TAC_PRIM).filter(([k])=>!["附加","增幅"].includes(k)).map(([k,v])=>`${k}：${v.join("、")}`).join("；");
  const ctrl=Object.entries(TAC_CTRL).map(([k,v])=>`${k}：${v.join("、")}`).join("；");
  return [{role:"system",content:`你是主角腦中的《大賢者》，只負責把玩家這句話拆成戰鬥步驟，不寫故事、不判斷成敗。
- 只能用「可用的東西」清單裡的來源，src 照抄清單上的名字；沒提到用什麼的動作（徒手、身體）算「自己」。
- 每一步：src、prim（傷害、控制、防護、位移、破綻、隱匿、環境、附加、增幅 其中一個）、kind（prim 是控制時填：束縛、減速、致盲、擊退、窒息、威嚇、中毒）、tags（這一步用到的性質，只能從那個來源的標籤裡挑）、to（附加：加到哪個來源；增幅：增幅第幾步，填數字）、say（玩家怎麼說的，12 字內）。
- 各種動作要的性質：${prim}；控制——${ctrl}；附加、增幅：任何性質。
- 照玩家說的順序拆，玩家沒說的不要加。最多 8 步。
- 玩家這句話不是在戰鬥裡出手（例如談判、說話、逃跑、離開、躲起來不打、做別的事、問問題），回 {"combo":false}。
只輸出 JSON：{"combo":true,"steps":[{"src":"…","prim":"…","kind":"","tags":["…"],"to":"","say":"…"}]}`},
   {role:"user",content:`局面：${ch.what||""}。對手：${ch.foe||"？"}${ch.foeLv?`（${ch.foeLv}級）`:""}${(ch.foeTags||[]).length?`，特性：${ch.foeTags.join("、")}`:""}。
可用的東西：${src.map(x=>`${x.n}〔${x.tags.join("、")}〕`).join("；")}
玩家說：「${text}」`}];
}
function validateTac(res){
  const o=parseObjs(res.txt).reverse().find(x=>x&&(typeof x.combo==="boolean"||Array.isArray(x.steps)));
  if(o)return o; const e=new Error(res.cut?"回應被截斷":"沒照格式回傳"); e.raw=res.txt.slice(0,400); throw e;
}
/* 判定卡上打字：先問大賢者是不是組合；不是就照舊交給 AI 改寫局面 */
async function tacTry(text,free,ch){
  const e=S.log[S.log.length-1]; busy=true; S.err=null; render();
  let o=null; try{o=(await callModel(tacMsgs(text,ch),700,validateTac,null)).val}catch(err){o=null}
  busy=false;
  if(!o||o.combo===false||!Array.isArray(o.steps)||!o.steps.length){ if(o)return act(text,free,ch,true); S.err={msg:"大賢者沒聽懂這句（連線或格式出錯）。可以再送一次，或照原本的卡付代價。"}; render(); return }
  const cur=e&&e.alts&&e.alts[e.i]&&e.alts[e.i].check; if(!cur){render();return}
  cur.tac={text,...tacCheck(o.steps,cur)}; save(); render();
}
function tacClear(){const ch=pendingCheck(); if(!ch||busy)return; delete ch.tac; save(); render()}
function tacFix(){const ch=pendingCheck(); if(!ch||busy||!ch.tac)return; const t=ch.tac.text; delete ch.tac; save(); render(); const ta=document.getElementById("freein"); if(ta){ta.value=t;ta.focus()}}
function tacHTML(ch){
  const t=ch&&ch.tac; if(!t)return "";
  return `<div class="sacbox tac"><label>組合（大賢者拆的步驟）：+${t.bonus} 層優勢${t.keys.length?`・用到 ${t.keys.length} 個技能${t.mp?`，MP -${t.mp}`:""}`:""}</label>
    ${t.res.map((r,i)=>`<div class="${r.count?"adv":r.ok?"note":"dis"}">${i+1}. ${r.count?"✓":r.ok?"△":"✗"} ${esc(r.head)}${r.say?`（${esc(r.say)}）`:""}${r.why?`：${esc(r.why)}`:r.note?`：${esc(r.note)}`:""}</div>`).join("")}
    <div style="margin-top:6px"><button class="tl" id="tacfix">更正</button> <button class="tl" id="tacdel">撤回</button></div></div>`;
}
function tacBind(){const a=document.getElementById("tacfix");if(a)a.onclick=tacFix;const b=document.getElementById("tacdel");if(b)b.onclick=tacClear}
/* 付代價時：扣技能次數和 MP，回傳給紀錄看的一句 */
function tacPay(ch,notes){
  const t=ch&&ch.tac; if(!t||!t.bonus)return "";
  S.usedSk=S.usedSk||[]; let mp=0;
  t.keys.forEach(k=>{if(!skUsed(k)){S.usedSk.push(k);if(!/（.+）$/.test(k))mp++}});
  mp=Math.min(mp,S.mp); if(mp){S.mp-=mp}
  notes.push(`組合：${t.res.filter(r=>r.count).map(r=>r.head).join(" → ")}（+${t.bonus}${t.keys.length?`，用掉 ${t.keys.join("、")}`:""}${mp?`，MP -${mp}`:""}）`);
  return `用組合「${t.text}」（成立 ${t.bonus} 步）`;
}
