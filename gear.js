/* 魔物篇｜gear.js：裝備欄（v0.63）。照孤獨異世界的七個欄位，用戶 11-14 定：
   - 欄位：頭、項鍊、戒指、武器、副手、衣服、鞋子。物品照名字自動分欄；拿到時那一欄空著就自動穿上；背包頁可以換、可以卸。
   - 武器沒有每場 +1（用戶選「維持白字用掉才 +1」）；遠程、雙手只管能不能配盾（盾只配單手近戰，或空手）。
   - 防具減傷：盾、衣服各 −20%，頭 −10%，最少剩三成。逃跑時鞋子、盾各 +1。
   - 種族神兵穿上才生效（nest.js rwHave）。同伴維持簡單版（gear＋hold）。
   - 穿著的東西仍然在 S.items 裡（S.eq 只記名字），所以給人、丟掉、鍛造、付代價都照舊；東西不見了 gearSync 會自動卸下。 */

/* ═════════ 欄位 ═════════ */
const SLOTS=["頭","項鍊","戒指","武器","副手","衣服","鞋子"];
const SLOT_FIX={"曙光長劍":"武器","月光長弓":"武器","符文戰錘":"武器","幸運投石索":"武器","殘影斗篷":"衣服","齒輪盾":"副手","風羽之冠":"頭","記仇之牙":"項鍊"};
const SLOT_RE=[["副手",/盾/],["頭",/冠|盔|帽|頭巾|面具|頭箍/],["項鍊",/項鍊|項圈|護符|牙飾|骨飾|墜飾|吊墜|念珠/],["戒指",/戒|指環|手環|臂環|護腕|手套|手鐲/],
  ["鞋子",/鞋|靴/],["衣服",/甲(?!片)|衣|袍|斗篷|披風|鎧|背心|外套/],["武器",/劍|刀|匕首|矛|槍|斧|錘|槌|鎚|棍|棒|杖|鞭|弓|弩|投石索|彈弓|叉|戟|鐮|爪刃|拳套/]];
/* 這件東西穿在哪一欄（不是裝備＝null）：藥水、魔法原料、碎片之類不算 */
function slotOf(n){
  if(!n)return null; if(SLOT_FIX[n])return SLOT_FIX[n]; if(POTION(n))return null;
  const m=matOf(n); if(m&&!m.skill&&!m.fx&&!m.unique)return null;
  if(/碎片|甲片|鱗片|殘骸|斷掉|半截|屍體|鐵礦/.test(n))return null;
  const x=SLOT_RE.find(([,re])=>re.test(n)); return x?x[0]:null;
}
const isRangedW=n=>/弓|弩|投石|彈弓|標槍|飛刀/.test(n||"");
const isTwoW=n=>!/手斧|投石索|彈弓|飛刀/.test(n||"")&&/弓|弩|斧|錘|槌|鎚|矛|槍|戟|大劍|巨劍|長柄/.test(n||"");
const oneMelee=n=>!n||(!isRangedW(n)&&!isTwoW(n));
const wtWord=n=>isRangedW(n)?(isTwoW(n)?"雙手遠程":"單手遠程"):isTwoW(n)?"雙手":"單手";
const worn=n=>!!(S&&S.eq&&SLOTS.some(k=>S.eq[k]===n));
const wornList=()=>S&&S.eq?SLOTS.map(k=>S.eq[k]).filter(Boolean):[];
/* 能不能穿：回傳 true 或原因 */
function canWear(n){
  const k=slotOf(n); if(!k)return "這不是裝備";
  if(typeof scarOn==="function"&&scarOn("hand")&&(k==="副手"||(k==="武器"&&isTwoW(n))))return "單手的傷：不能用雙手武器和盾";   /* v0.66 */
  if(k==="副手"&&!oneMelee(S.eq&&S.eq.武器))return "盾只能配單手近戰武器（或空手）";
  return true;
}
/* 每次畫面、存檔前：東西不見了就卸下；新拿到的、那一欄空著就自動穿上（玩家自己卸下的不會再自動穿） */
function gearSync(){
  if(!S||!Array.isArray(S.items))return;
  S.eq=S.eq||{}; const lost=[];
  SLOTS.forEach(k=>{const n=S.eq[k]; if(n==null)S.eq[k]=null; else if(!S.items.includes(n)||slotOf(n)!==k){S.eq[k]=null;lost.push(k)}});
  if(S.eq.副手&&!oneMelee(S.eq.武器))S.eq.副手=null;
  SLOTS.forEach(k=>{if(S.eq[k]&&canWear(S.eq[k])!==true){S.eq[k]=null;lost.push(k)}});   /* v0.66：單手的傷，穿著的雙手武器、盾卸下 */
  lost.forEach(k=>{const n=S.items.find(x=>slotOf(x)===k&&!worn(x)&&canWear(x)===true); if(n)S.eq[k]=n});   /* 用掉、壞掉、給人了：背包裡有同一欄的就換上 */
  const seen=new Set(S.eqSeen||[]);
  S.items.forEach(n=>{if(seen.has(n))return; seen.add(n); const k=slotOf(n); if(k&&!S.eq[k]&&!worn(n)&&canWear(n)===true)S.eq[k]=n});
  S.eqSeen=[...seen].filter(n=>S.items.includes(n));
  if(typeof fxSync==="function")fxSync();   /* v0.64：厚命、深泉 */
}
function wear(i){
  const n=S.items[i]; if(n==null||busy||S.dead)return; const k=slotOf(n), ok=canWear(n); if(ok!==true)return;
  S.eq[k]=n; if(k==="武器"&&S.eq.副手&&!oneMelee(n))S.eq.副手=null;
  save(); render();
}
function unwear(k){if(!S.eq||!S.eq[k]||busy)return; S.eq[k]=null; if(k==="武器"&&S.eq.副手&&!oneMelee(null))S.eq.副手=null; save(); render()}

/* ═════════ 效果 ═════════ */
/* 防具減傷：盾 −20%、衣服 −20%、頭 −10%，最少剩三成 */
function armorMult(){
  if(!S||!S.eq)return 1;
  const m=1-(S.eq.副手&&/盾/.test(S.eq.副手)?.2:0)-(S.eq.衣服?.2:0)-(S.eq.頭?.1:0);
  return Math.max(.3,m);
}
const armorCut=d=>d>0?Math.max(1,Math.ceil(d*armorMult())):d;
/* 逃跑：鞋子、盾各 +1（判定的「做什麼」看得出是在逃） */
const FLEE_RE=/逃|撤退|撤離|跑走|甩開|脫身|躲開|甩掉|開溜/;
function gearAdv(ch){
  const out=[]; if(!ch||!S.eq||!FLEE_RE.test(ch.what||""))return out;
  if(S.eq.鞋子)out.push(`${S.eq.鞋子}：跑得快`);
  if(S.eq.副手&&/盾/.test(S.eq.副手))out.push(`${S.eq.副手}：擋著往後退`);
  return out;
}
/* 給模型看的：身上穿著什麼 */
function gearBrief(){return SLOTS.filter(k=>S.eq&&S.eq[k]).map(k=>`${k}：${S.eq[k]}`)}

/* ═════════ 畫面：技能頁的「裝備」卡 ═════════ */
function gearHTML(){
  gearSync();
  const am=armorMult(), idle=!busy&&!S.dead;
  const rows=SLOTS.map(k=>{const n=S.eq[k], m=n&&matOf(n);
    return `<div class="crow"><b>${k}</b>：${n?`${m?"✦ ":""}${esc(n)}${k==="武器"?`（${wtWord(n)}）`:""}${m&&m.lv?`・${m.lv}級`:""}${m&&m.fx?`・${esc(fxDesc(m.fx))}`:m&&m.skill?`・附帶「${esc(m.skill.n)}」`:m&&m.unique&&typeof rwOf==="function"&&rwOf(n)?`・${esc(rwOf(n).d)}`:""}${idle?` <button class="tl" data-uw="${k}">卸下</button>`:""}`:`<span class="none">（空）</span>`}</div>`}).join("");
  const tele=fxAny("tele")?`<div class="crow">✦ 歸巢：${S.teleDay===S.day?"今天用過了":inNest()?"你就在巢穴":`<button class="tl" id="telego"${idle&&!(S.raid&&S.raid.on)&&!S.war?"":" disabled"}>瞬間回巢穴（一天一次）</button>`}</div>`:"";
  return `<div class="card"><h3>裝備</h3>${rows}${tele}
    <div class="note" style="margin-top:6px">防具減傷：盾、衣服各 20%，頭 10%${am<1?`（現在被打只吃 ${Math.round(am*100)}%）`:""}。逃跑時鞋子、盾各多一層。種族神兵要穿上才生效。盾只能配單手近戰武器（或空手）。<br>拿到東西時那一欄空著會自動穿上；在下面背包按「穿上」換。白字武器防具照舊可以在判定時「用掉一件」換一層優勢（穿著的也行，用掉就卸下了）。</div></div>`;
}
/* 背包裡每一件後面的按鈕 */
function gearBtn(n,i){
  if(!slotOf(n))return "";
  if(worn(n))return `<span class="note">（穿著・${slotOf(n)}）</span>`;
  const ok=canWear(n);
  return ok===true?`<button class="tl" data-wr="${i}">穿上（${slotOf(n)}${S.eq[slotOf(n)]?`，換下 ${esc(S.eq[slotOf(n)])}`:""}）</button>`:`<span class="note">（${esc(ok)}）</span>`;
}
function gearBind(){
  document.querySelectorAll("[data-wr]").forEach(b=>b.onclick=()=>wear(+b.dataset.wr));
  document.querySelectorAll("[data-uw]").forEach(b=>b.onclick=()=>unwear(b.dataset.uw));
  const tg=document.getElementById("telego"); if(tg)tg.onclick=teleHome;
  const ec=document.getElementById("esccraft"); if(ec)ec.onclick=escCraft;   /* v0.69 */
  if(typeof craftBind==="function")craftBind();   /* v0.74 */
  if(typeof takeBind==="function")takeBind();     /* v0.75 */
}

/* ═════════ 魔法效果（v0.64）═════════
   照孤獨異世界的效果表，挑魔物篇用得到的（巧手、靈光、安眠、清泉、商人、通曉、傳說級沒搬）。
   用戶 11-14：鍛造時「附帶技能」或「效果」二選一；效果照原料那隻魔物抽（火系多半出燼紋、避火）。
   效果要穿著才生效；戰鬥用的效果，物品等級比對手低就不生效（不會壞）。存法：S.mat[名字].fx={t,v}。 */
const ELEMS=["火","水","土","風","木","光","暗"];
const ELEM_NM={火:"燼",水:"澪",土:"磐",風:"嵐",木:"萌",光:"曦",暗:"蝕"};
const FOE_CLS=["野獸","類人","蟲","不死","龍","構裝"];
const FX=[
 {t:"elem",w:0,d:"X紋：攻擊帶屬性，可以觸發相剋"},
 {t:"burst",w:2,nm:"餘震",d:"有對手的判定大成功後，下一場多一層優勢"},
 {t:"keen",w:2,nm:"一閃",d:"有對手的判定大成功少付一項（成功就是大成功）"},
 {t:"bane",w:0,d:"剋X：對某一類對手多一層優勢"},
 {t:"vicious",w:1,nm:"血契",d:"有對手的判定多一層優勢，但每次你也扣 HP 5%"},
 {t:"defend",w:2,nm:"擋災",d:"被打少受 20% 傷"},
 {t:"fort",w:1,nm:"穩樁",d:"關鍵戰（進化戰、討伐戰、八王戰）的傷害不再 ×1.5"},
 {t:"resist",w:0,d:"避X：被這種屬性的對手打，傷害減半"},
 {t:"regen",w:1,nm:"生息",d:"有對手的判定成功，HP 回 10%"},
 {t:"hp",w:1,nm:"厚命",d:"HP 上限 +20%"},{t:"mp",w:1,nm:"深泉",d:"MP 上限 +20%"},
 {t:"move",w:1,nm:"輕身",d:"移動時間減半"},{t:"fly",w:1,nm:"浮空",d:"逃跑多一層優勢"},
 {t:"tele",w:1,nm:"歸巢",d:"一天一次，瞬間回到巢穴"},
 {t:"gather",w:1,nm:"豐收",d:"採集、搜刮時間減半"},
 {t:"path",w:1,nm:"尋路",d:"探索時找到隱藏據點的進度多算一次"},
 {t:"thrift",w:1,nm:"節食",d:"吃飽能撐的時間加倍"},
 {t:"growth",w:1,nm:"成長",d:"有對手的判定成功，存在值 +1"},
 {t:"devote",w:1,nm:"奉獻",d:"捐給巢穴的物資點數 +50%"}];
const fxDef=t=>FX.find(x=>x.t===t)||{};
function fxName(fx){if(!fx)return "";if(fx.t==="elem")return `${ELEM_NM[fx.v]||""}紋`;if(fx.t==="resist")return `避${fx.v}`;if(fx.t==="bane")return `剋${fx.v}`;return fxDef(fx.t).nm||fx.t}
function fxDesc(fx){if(!fx)return "";if(fx.t==="elem")return `${fxName(fx)}：攻擊帶「${fx.v}」，可以觸發相剋`;if(fx.t==="resist")return `${fxName(fx)}：被${fx.v}屬性的對手打，傷害減半`;
  if(fx.t==="bane")return `${fxName(fx)}：對${fx.v}多一層優勢`;return `${fxName(fx)}：${fxDef(fx.t).d||""}`}

/* 對手的屬性、類別（v0.65 起判定卡由模型填 foeEl；沒填就看名字猜） */
const EL_RE=[["水",/冰|雪|霜|寒|凍|水|潮|澪|魚|蛙|蟹/],["火",/火|炎|熔|焰|燼|灼|赤/],["風",/風|雷|電|嵐|鳥|鷹|鴉|雀|翼/],["土",/岩|石|土|沙|泥|山|磐|地底|礦/],
  ["木",/木|樹|藤|草|花|林|蕈|菇|萌/],["光",/光|聖|曦|金龍|獨角獸/],["暗",/暗|影|夜|毒|屍|骸|骨|幽|亡|巫妖|蝕|蟲王|小丑/]];
const elOfName=n=>{const x=EL_RE.find(([,re])=>re.test(n||""));return x?x[0]:null};
const KING_CLS={lich:"不死",gold:"龍",giant:"類人",uni:"野獸",worm:"蟲",beast:"野獸",elf:"類人",clown:null};
const CLS_RE=[["不死",/骷髏|殭屍|屍鬼|幽靈|亡靈|巫妖|吸血鬼|骸骨|死靈|怨靈/],["龍",/龍|蛟|九頭蛇/],["構裝",/魔像|石像|機關|傀儡|構裝/],
  ["蟲",/蟲|蛛|蟻|蜂|蜈蚣|蠍|蛾|蛹|蝗/],["類人",HUMANOID],["野獸",/狼|熊|豬|鹿|兔|鼠|豹|虎|獅|貓|犬|蝠|鴉|鷹|雀|蛇|蜥|狐|猴|牛|羊|鱷|獸|鳥|蛙|魚|蟹/]];
function foeClsOf(ch){const r=ch&&ch.raid&&S.raid; if(r&&r.king)return KING_CLS[r.king]||null; const n=`${ch&&ch.foe||""}`; const x=CLS_RE.find(([,re])=>re.test(n)); return x?x[0]:null}
function foeElOf(ch){
  if(!ch)return null; if(ELEMS.includes(ch.foeEl))return ch.foeEl;
  const r=ch.raid&&S.raid; if(r&&r.king){const a=rwFoeAttr(); return ELEMS.includes(a)?a:null}
  return elOfName(ch.foe||"");
}

/* 身上有效的效果：穿著；有對手時物品等級不能比對手低 */
function fxOn(t,ch){
  const fl=ch&&ch.foeLv?gIdx(ch.foeLv):-1;
  return wornList().filter(n=>{const m=matOf(n);return m&&m.fx&&m.fx.t===t&&(fl<0||gIdx(m.lv)>=fl)}).map(n=>({n,fx:matOf(n).fx,lv:matOf(n).lv}));
}
const fxAny=t=>wornList().some(n=>{const m=matOf(n);return m&&m.fx&&m.fx.t===t});
/* 判定的優勢：剋X、血契、餘震、浮空（逃跑） */
function fxAdv(ch){
  const out=[]; if(!ch)return out;
  if(ch.foe){
    const cl=foeClsOf(ch); fxOn("bane",ch).forEach(x=>{if(cl&&x.fx.v===cl)out.push(`✦${x.n}：剋${cl}`)});
    fxOn("vicious",ch).slice(0,1).forEach(x=>out.push(`✦${x.n}：血契（付的時候你也扣 HP 5%）`));
    if(S.burst)out.push("✦餘震：上一場大成功的力道還在");
  }
  if(FLEE_RE.test(ch.what||""))fxOn("fly",ch).slice(0,1).forEach(x=>out.push(`✦${x.n}：浮空`));
  return out;
}
/* 付完判定：血契扣血、生息回血、成長、餘震（pay 呼叫） */
function fxAfter(ch,tier,notes){
  if(!ch||!ch.foe)return;
  if(fxAdv(ch).some(x=>x.includes("血契"))){const d=Math.max(1,Math.ceil(S.hpMax*.05));S.hp-=d;notes.push(`血契反噬：HP -${d}`)}
  if(S.burst)S.burst=0;
  if(tier==="大成功"&&fxOn("burst",ch).length){S.burst=1;notes.push("✦餘震：力道還在，下一場多一層。")}
  if(tier!=="失敗"){
    const rg=fxOn("regen",ch).length; if(rg&&S.hp>0){const h=Math.min(S.hpMax-S.hp,Math.ceil(S.hpMax*.1*rg)); if(h>0){S.hp+=h;notes.push(`✦生息：HP +${h}`)}}
    if(fxOn("growth",ch).length&&S.exist<existMax(S.lv)){S.exist++;notes.push(`✦成長：存在值 +1（${S.exist}/${existMax(S.lv)}）`);if(S.exist>=existMax(S.lv)&&!S.evo&&!S.war){S.evo=newEvo();evoAnnounce(notes)}}
  }
}
const keenOn=ch=>!!(ch&&ch.foe&&fxOn("keen",ch).length);
const fortOn=ch=>!!(ch&&fxOn("fort",ch).length);
/* 扣血：防具、擋災、避X */
function hitCut(d,ch){
  if(!(d>0))return d;
  let m=armorMult()-.2*fxOn("defend",ch).length; m=Math.max(.3,m);
  const el=foeElOf(ch); if(el&&fxOn("resist",ch).some(x=>x.fx.v===el))m*=.5;
  return Math.max(1,Math.ceil(d*m-1e-9));
}
/* 厚命、深泉：照穿著的件數調整上限（S.fxHp、S.fxMp 記已經加上去的量） */
function fxSync(){
  if(!S||S.hpMax==null)return;
  const nh=fxOn("hp").length, nm=fxOn("mp").length;
  const bh=S.hpMax-(S.fxHp||0), bm=(S.mpMax||0)-(S.fxMp||0);
  const wh=Math.round(bh*.2*nh), wm=Math.round(bm*.2*nm);
  if(wh!==(S.fxHp||0)){S.hpMax=bh+wh;S.fxHp=wh;S.hp=Math.min(S.hp,S.hpMax)}
  if(wm!==(S.fxMp||0)){S.mpMax=bm+wm;S.fxMp=wm;S.mp=Math.min(S.mp,S.mpMax)}
}
/* 時間：輕身移動減半；豐收採集、搜刮減半 */
const travelH=h=>{let x=fxAny("move")?Math.max(1,Math.ceil(h/2)):h; if(typeof scarOn==="function"&&scarOn("leg"))x*=2; return x};   /* v0.66：腿的傷加倍 */
const menuH=(k,h)=>{let x=(k==="forage"||k==="scav")&&fxAny("gather")?Math.max(1,Math.ceil(h/2)):h; if(k==="explore"&&typeof scarOn==="function"&&scarOn("eye"))x*=2; return x};   /* v0.66：眼睛的傷探索加倍 */
/* 歸巢：一天一次瞬間回巢穴 */
function teleHome(){
  if(busy||S.dead||!fxAny("tele")||S.teleDay===S.day||inNest()||(S.raid&&S.raid.on)||S.war)return;
  const pre=snap(); S.log.push({who:"you",text:"歸巢",pre}); S.teleDay=S.day; S.at=NEST(); S.loc=NEST();
  S.log.push(sysEntry(`✦歸巢：眼前一花，你已經站在${NEST()}的洞口。（今天不能再用）`)); save(); render();
}

/* ═════════ 鍛造的效果：照那隻魔物抽（同一組裝備＋原料，抽到的一樣） ═════════ */
function seedRand(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return ()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return (h>>>0)/4294967296}}
const FX_HINT=[[/飛|翼|滑翔|俯衝/,"fly"],[/再生|治癒|蛻皮|斷尾/,"regen"],[/鱗|殼|甲|硬|岩膚|皮厚/,"defend"],[/疾|快|奔|跳|竄/,"move"],[/嗅|追蹤|感知|夜視|洞察/,"path"],
  [/蠻力|怪力|巨|撞|咬合/,"keen"],[/狂|嗜血|吸血/,"vicious"],[/紮根|穩|重/,"fort"],[/冬眠|耐餓|反芻/,"thrift"],[/挖|掘|採/,"gather"]];
function fxFor(wn,mn){
  const mm=matOf(mn)||{}, sp=cleanName(mm.sp||mn), pk=poolKey(sp), pool=(pk&&POOLS[pk])||[];
  const els=[...new Set([...pool.map(s=>s.sys).filter(x=>ELEMS.includes(x)),elOfName(sp),elOfName(mn)].filter(Boolean))];   /* 原料名也算（毒囊＝暗） */
  const cl=(CLS_RE.find(([,re])=>re.test(sp))||[])[0]||null;
  const th=[], gen=FX.filter(x=>x.w).map(x=>({w:x.w,fx:{t:x.t}}));        /* 七成從「這隻魔物的」效果抽，三成從一般效果抽 */
  els.forEach(v=>{th.push({w:3,fx:{t:"elem",v}});th.push({w:2,fx:{t:"resist",v}})});
  if(cl)th.push({w:2,fx:{t:"bane",v:cl}});
  FX_HINT.forEach(([re,t])=>{if(pool.some(s=>re.test(s.n))||re.test(sp)||re.test(mn))th.push({w:3,fx:{t}})});
  const r=seedRand(`${wn}|${mn}`), c=th.length&&r()<.7?th:gen, tot=c.reduce((a,x)=>a+x.w,0); let p=r()*tot;
  for(const x of c){p-=x.w;if(p<0)return x.fx} return c[0].fx;
}
const fxItemName=(fx,wn)=>`${fxName(fx)}${wn}`.slice(0,16);

/* ═════════ 元素相剋、魔物特性（v0.65）═════════
   照孤獨異世界：水剋火、火剋木、木剋土、土剋風、風剋水，光暗互剋，剋到 +1。
   你這邊：這次用的技能的系別（自己的、魔法物品附帶的、神兵的）＋穿著的 X紋。對手：模型在判定卡填 foeEl（沒填看名字、八王照王）。
   魔物特性（敏捷、飛行、硬甲、巨大、群體、無眼、不呼吸、構裝）：判定卡顯示、模型照它加減優劣勢，程式不另外算（用戶：武器沒有每場 +1）。 */
const MON_TAGS=["敏捷","飛行","硬甲","巨大","群體","無眼","不呼吸","構裝"];
const EL_COUNTER={水:"火",火:"木",木:"土",土:"風",風:"水",光:"暗",暗:"光"};
/* 這次用的技能的系別 */
function skSysOf(ch){
  const k=ch&&ch.useSk; if(!k)return null;
  const own=S.skills.find(s=>s.n===k); if(own)return own.sys;
  const it=itemOfSk(k); if(it){const m=matOf(it); return m&&m.skill?m.skill.sys:null}
  if(S.divine){const a=S.divine.abs.find(x=>divKey(x.n)===k); if(a)return a.sys}
  return null;
}
function myEls(ch){const e=[skSysOf(ch),...fxOn("elem",ch).map(x=>x.fx.v)].filter(x=>ELEMS.includes(x)); return [...new Set(e)]}
function elAdv(ch){
  if(!ch||!ch.foe)return [];
  const fe=foeElOf(ch); if(!fe)return [];
  const a=myEls(ch).find(x=>EL_COUNTER[x]===fe); return a?[`相剋：${a}剋${fe}`]:[];
}

/* ═════════ 掉落（v0.68）═════════
   用戶 11-14 19:06：打贏全部魔物都會掉東西（白字裝備／魔法原料／耗材，隨機），有了這個就不用「拆原料」。
   成功 1 件、大成功 2 件（種類不同）；小動物不掉。原料等級＝牠的等級，跟以前拆的一樣不受「最多比你高一級」限制（鍛造成品照舊受限）。
   野獸、魔物：原料六成、牠的骨牙皮做的白字裝備三成、草藥膏一成；類人：白字裝備四成、原料三成、藥水三成。 */
const SMALL_RE=/老鼠|鼠$|蟲子|蟲$|雀$|蟋蟀|蝸牛|蚯蚓|蛹|蛋/;
const BEAST_GEAR=[["骨刀"],["皮甲"],["牙項鍊"],["皮帽"],["皮靴"]];
function dropLoot(d,big,notes){
  if(!d||!d.name)return; const sp=speciesOf(d.name,d.kind)||cleanName(d.name), lv=d.lv||"F";
  if(SMALL_RE.test(sp)||(lv==="F"&&CREATURE.test(sp)&&!/狼|熊|豬|蛇|蜥|蛛/.test(sp)))return;
  const hum=HUMANOID.test(`${d.name}${d.kind||""}`);
  const table=hum?[["gear",.4],["mat",.3],["pot",.3]]:[["mat",.5],["part",.4],["pot",.1]];   /* v0.74：野獸掉部位（皮、角、牙），不掉做好的裝備 */
  const got=[], kinds=[];
  for(let n=0;n<(big?2:1);n++){
    const left=table.filter(([k])=>!kinds.includes(k)), tot=left.reduce((a,[,w])=>a+w,0); let r=Math.random()*tot, k=left[0][0];
    for(const [kk,w] of left){r-=w;if(r<0){k=kk;break}}
    kinds.push(k);
    if(k==="mat"){let nm=`${sp}的${partOf(sp)}`; while(S.items.includes(nm))nm+="・二";
      const c=d.dead!==false?[...S.corpses].reverse().find(x=>sameSp(x,sp)&&!x.matDrop&&!x.harvested):null;
      if(c){c.matDrop={n:nm,lv,sp};got.push(`✦${nm}（魔法原料・${lv}級，還在屍體上：拿走的話，這具屍體就學不到技能）`)}   /* v0.75：用戶 22:51，拿了原料就不能吃肉學技能 */
      else{S.items.push(nm); S.mat[nm]={lv,sp}; got.push(`✦${nm}（魔法原料・${lv}級）`)}}
    else if(k==="part"){const nm=`${sp}${rnd(partsOf(sp))}`; S.items.push(nm); got.push(nm); const c=[...S.corpses].reverse().find(x=>sameSp(x,sp)); if(c)c.part=true}
    else if(k==="gear"){let nm=hum?`${sp}的${rnd(LOOT_GEAR)}`:`${sp}${rnd(BEAST_GEAR)[0]}`; while(S.items.includes(nm))nm+="・二"; S.items.push(nm); got.push(nm)}
    else{const p=hum?rnd(["紅色藥水","藍色藥水","草藥膏"]):"草藥膏"; S.items.push(p); got.push(p)}
  }
  if(got.length)notes.push(`${cleanName(d.name)}掉下了：${got.join("、")}。`);
  gearSync();
}

/* ═════════ 逃跑粉（v0.69）═════════
   用戶 11-14 19:15～19:26：醒來就有 3 包（管理員的恩惠，台詞是用戶寫的）；一般遭遇的判定卡上「逃跑粉」直接脫身、不付代價，關鍵戰不能用。
   不提示配方：吞掉一包才學會（任意植物＋任意骨頭，1 小時，在哪都能做）。怪物分布最高高三級（data.js pickTier）。 */
const GIFT_TXT="叮！你獲得了【逃跑粉】【管理員的恩惠】這是逃跑粉哦，打不過就要跑，不然會被野獸吃掉哦，記得要用，這個世界很殘酷的，努力活下去吧！";
const ESC="逃跑粉";
const escN=()=>S.items.filter(n=>n===ESC).length;
const escOk=ch=>!!(ch&&ch.foe&&!ch.war&&!ch.raid&&!ch.local&&escN()>0);
function escUse(){
  const e=S.log[S.log.length-1], ch=e&&e.alts&&e.alts[e.i]&&e.alts[e.i].check; if(busy||S.dead||!escOk(ch))return;
  const pre=snap(); S.items.splice(S.items.indexOf(ESC),1); const pre2=snap();   /* 撤回用 pre（還沒用掉）；模型結果套在 pre2（已經用掉）上 */
  const prompt=`【程序判定：逃跑粉】主角撒出一包逃跑粉，粉霧炸開，${ch.foe}什麼都看不見、聞不到，主角趁機脫身，沒有付出任何代價（逃跑粉還剩 ${escN()} 包）。寫出脫身的樣子，對手追不上、不會再撲上來；這回合不要給 check，options 給 3 個。`;
  S.log.push({who:"you",text:ESC,prompt,time:null,pre}); S.opts=[]; S.err=null; S.fightDelay=null; save();
  doJob({kind:"turn",prompt,noCheck:true},pre2,S.log.length-1);
}
/* 配方：任意植物（背包或食物裡的）＋任意骨頭 */
const isPlantN=n=>PLANT.test(n||"")&&!slotOf(n)&&!matOf(n)&&!POTION(n)&&n!==ESC;
const isBoneN=n=>/骨/.test(n||"")&&!slotOf(n)&&!matOf(n)&&!POTION(n);
function escParts(){
  const pi=S.items.findIndex(isPlantN), pc=pi<0?S.corpses.findIndex(c=>!c.evo&&PLANT.test(c.name)):-1, bi=S.items.findIndex(isBoneN);
  return {plant:pi>=0?{t:"i",i:pi,n:S.items[pi]}:pc>=0?{t:"c",i:pc,n:S.corpses[pc].name}:null,bone:bi>=0?{t:"i",i:bi,n:S.items[bi]}:null};
}
function escCraftBtn(){
  if(!S.escRecipe)return [];
  const p=escParts(), ok=p.plant&&p.bone;
  return [`<button class="it harv" id="esccraft"${ok&&!busy&&!S.dead?"":" disabled"}>${ok?`做逃跑粉（${esc(p.plant.n)}＋${esc(p.bone.n)}，1 小時）`:"做逃跑粉（要植物和骨頭）"}</button>`];
}
function escCraft(){
  if(busy||S.dead||!S.escRecipe)return; const p=escParts(); if(!p.plant||!p.bone)return;
  const pre=snap(), notes=[];
  S.log.push({who:"you",text:`做逃跑粉（${p.plant.n}＋${p.bone.n}）`,pre});
  [p.plant,p.bone].sort((a,b)=>b.i-a.i).forEach(x=>{if(x.t==="i")S.items.splice(x.i,1)}); if(p.plant.t==="c")S.corpses.splice(p.plant.i,1);
  S.items.push(ESC); notes.push(`你把${p.plant.n}和${p.bone.n}搗碎、拌在一起，做出一包逃跑粉（現在 ${escN()} 包）。`);
  advanceTime(1,notes); S.log.push(sysEntry(notes.join("\n"))); save(); render();
}

/* ═════════ 敘述模式、程式直接結算的選單、背包彈出頁（v0.70）═════════
   用戶 11-14 20:52～21:22：做一些按鈕節省 AI 時間。敘述切換：完整／精簡（預設）／不用，每台裝置記自己的（localStorage mowu_narr）。
   移動、回巢穴、採集、搜刮、探索（找到據點、找到新地方而且沒危險）、狩獵遭遇：程式直接結算（menuSeed 的 quick）。
   精簡＝再請 AI 用很短的提示補一兩句；不用＝只有程式的一行，記在 S.pendNarr，下次叫 AI 時一起交給它帶過。
   狩獵：程式直接出判定卡；付完代價，結果照舊完整交給 AI。判定、自己打字、選項、關鍵戰一律完整。 */
let NARR=ls.g("mowu_narr")||"brief";
const NARR_OPTS=[["full","完整"],["brief","精簡"],["none","不用"]];
const BRIEF_SYS=`你是一個哥布林轉生故事的敘事者。用繁體中文、第二人稱「你」、白話短句，寫 1～2 句（60 字以內），只描寫畫面和感覺。不要新增事件、人物、對話，不要寫戰鬥結果。嚴格禁止武俠、修仙詞彙。另外給 3 個主角接下來可以做的事（每個 12 字以內，具體、貼合當下，不要寫結果）。只輸出 JSON：{"narration":"…","options":["…","…","…"]}`;
function briefMsgs(q){
  return [{role:"system",content:BRIEF_SYS},{role:"user",content:`主角：${S.name}，${S.sub?S.sub.name:"哥布林"}（${S.stage}・${S.lv}級）。時間：${timeStr()}（${PERIOD(S.hour)}）。同行：${S.party.filter(p=>p.with).map(p=>p.n).join("、")||"沒有"}。\n要寫的事（程式已經決定，照這個寫，不要改結果）：${q.text}${q.check?"\n停在要不要動手的那一刻。":""}`}];
}
/* v0.72：程式給的固定選項（不用模式、精簡時 AI 沒給好選項） */
const quickOpts=q=>q.check?[]:["四處看看",(q.loc?q.loc===NEST():inNest())?"在巢穴裡走動":"回巢穴","休息"];
async function quickRun(q){
  const o={narration:q.text,options:quickOpts(q),loc:q.loc||null,time:0,check:q.check?JSON.parse(JSON.stringify(q.check)):null};
  let used="程式";
  if(q.brief){try{const r=await callModel(briefMsgs(q),500,validateTurn,showLive);const t=String(r.val.narration||"").trim();if(t){o.narration=t;used=r.used}
    const op=(Array.isArray(r.val.options)?r.val.options:[]).filter(x=>typeof x==="string"&&x.trim()).map(x=>x.trim().slice(0,20));if(!q.check&&op.length>=2)o.options=op.slice(0,3)}catch(e){}}   /* v0.72：精簡時 AI 一起給選項 */
  return {val:o,txt:JSON.stringify(o),used,fellBack:[],loose:false};
}
/* 狩獵：程式直接出判定卡 */
const TAG_RE=[["飛行",/鳥|鴉|鷹|蝠|雀|蜂|蛾|飛/],["硬甲",/蟹|殼|甲蟲|龜|岩|石像|魔像/],["敏捷",/兔|狐|豹|貓|鼠|猴|蜥/],["巨大",/熊|巨|象|牛|龍|食人魔/],
  ["構裝",/魔像|石像|機關/],["不呼吸",/骷髏|殭屍|幽靈|魔像|石像/],["無眼",/蚯蚓|蛆|盲/]];
const tagsOfName=(n,many)=>[...TAG_RE.filter(([,re])=>re.test(n||"")).map(([t])=>t),...(many?["群體"]:[])].slice(0,3);
function huntQuick(sp,grp,lv,cls,where,terr,actv,many){
  const d=dmgOf(lv), them=/群|兩隻/.test(grp||"")?"牠們":"牠";
  const adv=/睡覺|進食|受了傷|舔傷口/.test(actv)?[`${them}${actv}，沒注意到你`]:[];
  /* v0.73：代價要五花八門（用戶 22:44：不要變成好幾個扣血）。扣血交給卡上通用的「硬吃一下」，這裡給傷、同伴、東西、MP、時間 */
  const w=S.party.filter(p=>p.with&&!p.tags.includes("重傷")), drop=S.items.filter(n=>!matOf(n)&&!POTION(n)&&n!=="逃跑粉"&&!worn(n));
  const wp=w.length?rnd(w).n:null;
  const pool=[...(wp?[{t:`${wp}替你擋了一下`,ally:wp}]:[]),...(drop.length?[{t:"混亂中弄丟了東西",item:rnd(drop)}]:[]),{t:"拚到喘不過氣",mp:-2},{t:"追了很久才得手",time:1}];
  const hurt=rnd([["被抓出傷口","流血"],["腳被咬了一口","瘀傷"],["撲空撞上石頭","扭傷"]]);
  const costs=[{t:hurt[0],tag:hurt[1]},...pool.sort(()=>Math.random()-0.5).slice(0,2)];
  return {hunt:1,loc:where,text:`在${where}的${terr}，你發現了${grpW(grp)}${sp}（${lv}級），${them}${actv}。${cls?`牠是帶職業的${cls}，比一般的難纏。`:""}`,
    check:{what:`獵殺${sp}`,foe:sp,foeLv:lv,foeEl:elOfName(sp),foeTags:tagsOfName(sp,many),group:many?rint(2,4):1,adv,dis:[],costs}};
}
/* 放過牠：程式直接退開，不叫 AI */
function letGo(){
  const e=S.log[S.log.length-1], ch=e&&e.alts&&e.alts[e.i]&&e.alts[e.i].check; if(busy||S.dead||!ch||!ch.hunt)return;
  const pre=snap(); S.log.push({who:"you",text:"放過牠",pre}); S.log.push(sysEntry(`你沒有對${ch.foe}出手，悄悄退開了。`)); S.opts=[]; S.fightDelay=null; save(); render();
}
/* 背包彈出頁（故事頁選單的「背包」） */
let BAGOPEN=false;
function bagOpen(){BAGOPEN=true;render();if(typeof sheetHist==="function")sheetHist()}
function bagClose(pop){if(!BAGOPEN)return;BAGOPEN=false;bsheet.classList.remove("open");if(pop!==true&&typeof dropHist==="function")dropHist();render()}
bx0.onclick=()=>bagClose(); bdone.onclick=()=>bagClose(); bsheet.onclick=e=>{if(e.target===bsheet)bagClose()};

/* ═════════ 做裝備（v0.74）═════════
   用戶 11-14 22:45～22:49：殺鹿掉皮靴很怪 → 野獸掉部位（雪原鹿皮、雪原鹿角、灰狼牙），自己在背包做成裝備。
   - 白字部位、撿到的石片木棍 → 白字裝備；紫色字（魔法原料：有魔力的獸皮、礦石……）也能直接做 → 魔法裝備（附帶技能或效果二選一，跟鍛造一樣；等級受物品上限）。
   - 皮、毛、鱗、羽、殼 → 甲、帽、靴、盾；角、牙、骨、爪 → 匕首、短刀、矛、項鍊、戒指；石 → 刀、矛、戒指；木 → 棍、矛；其他魔法原料 → 項鍊、戒指。
   - 2 小時；巢穴有鍛冶台或有工匠 1 小時。打字做（「用野豬角做匕首」）交給 AI，照舊。 */
function partsOf(sp){
  const T=[[/鹿|羊|牛|羚/,["皮","角","骨"]],[/狼|犬|狐/,["皮","牙","骨"]],[/熊/,["皮","爪","牙"]],[/豬/,["皮","獠牙","骨"]],[/蛇|蜥|鱷|龍/,["鱗","牙","骨"]],
    [/鳥|鷹|鴉|雀/,["羽毛","爪","骨"]],[/蟹|甲蟲|蠍/,["殼","螯"]],[/蛛|蟲|蟻|蜂/,["殼","刺"]],[/兔|鼠|貂/,["皮","骨"]]];
  return (T.find(([re])=>re.test(sp))||[0,["皮","骨","牙"]])[1];
}
const sameSp=(c,sp)=>!c.evo&&(String(c.sp||"").includes(sp)||cleanName(c.name).includes(sp));
const CRAFT_KIND=[["hide",/皮|毛|鱗|羽|翼膜|殼/,[["甲","甲"],["帽","帽"],["靴","靴"],["盾","盾"]]],["hard",/角|牙|骨|爪|齒|螯|刺|針/,[["匕首","匕首"],["短刀","短刀"],["矛","矛"],["項鍊","項鍊"],["戒指","戒指"]]],
  ["stone",/石|礦|晶/,[["刀","刀"],["矛","矛"],["戒指","戒指"]]],["wood",/木|棍|枝|藤/,[["棍","棍"],["矛","矛"]]]];
/* 能拿來做的：白字部位和石片木棍（不是裝備、不是食物、不是藥）、還沒做成東西的魔法原料 */
function craftKind(n){
  const m=matOf(n); if(n===ESC||POTION(n)||slotOf(n))return null;
  if(m&&(m.skill||m.fx||m.unique||m.sp==="地城"))return null;
  const k=CRAFT_KIND.find(([,re])=>re.test(n)); if(k)return k;
  return m?["magic",null,[["項鍊","項鍊"],["戒指","戒指"]]]:null;
}
const craftable=()=>S.items.map((n,i)=>({n,i,k:craftKind(n)})).filter(x=>x.k&&S.items.indexOf(x.n)===x.i);
function craftName(n,suf){
  const b=n.replace(/的/g,"").replace(/^(一塊|幾塊|半截|一根|幾根)/,"").replace(/(尖銳的|啃剩的|斷掉的)/g,"");
  if(/石片|石塊/.test(b))return `石${suf}`; if(/木棍|樹枝|枯枝/.test(b))return `木${suf}`;
  return `${b}${suf}`.slice(0,14);
}
let CFI=-1, CFT="", CFK="sk";
const craftH=()=>hasSmith()?1:2;
function craftHTML(){
  const L=craftable(); if(!L.length)return "";
  if(!L.some(x=>x.i===CFI))CFI=-1; const cur=CFI>=0?L.find(x=>x.i===CFI):null; const m=cur&&matOf(cur.n);
  if(cur&&!cur.k[2].some(([s])=>s===CFT))CFT="";
  const out=cur&&CFT?craftName(cur.n,CFT):"";
  return `<div class="sacbox" style="margin:8px 0"><label>做裝備（${craftH()} 小時${hasSmith()?"，有鍛冶台或工匠":""}）</label>
    <select id="cfm"><option value="">選材料…</option>${L.map(x=>`<option value="${x.i}"${x.i===CFI?" selected":""}>${matOf(x.n)?"✦":""}${esc(x.n)}${matOf(x.n)?`（${matOf(x.n).lv}級）`:""}</option>`).join("")}</select>
    ${cur?`<div class="tags" style="margin-top:6px">${cur.k[2].map(([s])=>`<button class="tag ut" data-cft="${esc(s)}" style="${CFT===s?"outline:2px solid currentColor":""}">${esc(s)}</button>`).join("")}</div>`:""}
    ${m&&out?`<label style="display:block"><input type="radio" name="cfk" value="sk"${CFK==="sk"?" checked":""}> 附帶技能（從${esc(cleanName(m.sp))}的技能池抽）</label><label style="display:block"><input type="radio" name="cfk" value="fx"${CFK==="fx"?" checked":""}> 效果：${esc(fxDesc(fxFor(out,cur.n)))}</label>`:""}
    ${out?`<div class="note">做出：${m?"✦":""}${esc(out)}（${slotOf(out)||"?"}${m?`・魔法・${capItemLv(m.lv)}級`:"・白字"}）</div><button class="paybtn" id="cfdo"${busy||S.dead?" disabled":""}>做</button>`:""}</div>`;
}
async function craftGear(){
  if(busy||S.dead||CFI<0||!CFT)return; const mn=S.items[CFI], k=craftKind(mn); if(!k||!k[2].some(([s])=>s===CFT))return;
  const m=matOf(mn), h=craftH(), pre=snap(); let name=craftName(mn,CFT);
  S.log.push({who:"you",text:`做裝備：${mn} → ${name}`,pre}); busy=true; render();
  let mat=null, notes=[];
  if(m){const tg=capItemLv(m.lv);
    if(CFK==="fx"){const fx=fxFor(name,mn);name=fxItemName(fx,name);mat={lv:tg,sp:m.sp,fx}}
    else{let pool=[];try{pool=await poolFor({name:mn,sp:m.sp,lv:m.lv,mat:true})||[]}catch(e){} const c=pool.length?rnd(pool):null;mat={lv:tg,sp:m.sp,skill:c?{n:c.n,sys:c.sys}:{n:"蠻力",sys:"天生"}}}}
  while(S.items.includes(name))name=(name+"・二").slice(0,18);
  S.items.splice(S.items.indexOf(mn),1); delete S.mat[mn]; S.items.push(name); if(mat)S.mat[name]=mat;
  notes.push(`你花了 ${h} 小時，用${mn}做出了${mat?"✦":""}${name}${mat?`（${mat.lv}級・${mat.fx?fxDesc(mat.fx):`附帶「${mat.skill.n}」`}）`:"（白字）"}。`);
  CFI=-1; CFT=""; advanceTime(h,notes); busy=false; gearSync(); S.log.push(sysEntry(notes.join("\n"))); save(); render();
}
function craftBind(){
  const s=document.getElementById("cfm"); if(s)s.onchange=()=>{CFI=s.value===""?-1:+s.value;CFT="";render()};
  document.querySelectorAll("[data-cft]").forEach(b=>b.onclick=()=>{CFT=b.dataset.cft;render()});
  document.querySelectorAll('[name="cfk"]').forEach(r=>r.onchange=()=>{CFK=r.value;render()});
  const d=document.getElementById("cfdo"); if(d)d.onclick=craftGear;
}

/* ═════════ 拿原料（v0.75）═════════
   用戶 11-14 22:51：拿了魔核（魔法原料）就不能吃肉學技能。掉落的魔法原料先留在屍體上（c.matDrop），
   按「拿」才放進背包，屍體變成「原料已拆」（吃了只是肉）；直接吃屍體學技能，原料就跟著沒了。 */
function takeMat(i){
  const c=S.corpses[i]; if(busy||S.dead||!c||!c.matDrop)return;
  const pre=snap(), m=c.matDrop; S.log.push({who:"you",text:`從${c.name}身上拿走 ✦${m.n}`,pre});
  S.items.push(m.n); S.mat[m.n]={lv:m.lv,sp:m.sp}; c.matDrop=null; c.harvested=true;
  S.log.push(sysEntry(`你拿走了 ✦${m.n}（魔法原料・${m.lv}級）。${cleanName(c.name)}剩下的只是肉，吃了學不到東西了。`)); save(); render();
}
const takeBtn=(c,i)=>c.matDrop&&!busy&&!S.dead?`<button class="it harv" data-tm="${i}">拿 ✦${esc(c.matDrop.n)}</button>`:"";
function takeBind(){document.querySelectorAll("[data-tm]").forEach(b=>b.onclick=()=>takeMat(+b.dataset.tm))}

/* ═════════ 移動途中出事（v0.77，用戶 11-15）═════════
   移動、回巢穴時兩成機率路上出事：一半是擋路的魔物（照這一區抽），一半是其他小事。出事就不走程式直接結算，完整交給 AI，可以出判定卡。 */
let TRIP_P=0.2;
const TRIP_EV=["突然下起冰冷的大雨，路變得又濕又滑","撞見兩隻魔物正在打架，牠們還沒發現你","路邊倒著一具還沒爛的屍體","聽到不遠處有人在呼救","差點踩進獵人留下的陷阱","發現一條以前沒注意過的小路","一群烏鴉在頭頂盤旋，好像在跟著你"];
function tripPrompt(){
  let ev; if(Math.random()<0.5){const {sp,grp,lv}=pickPrey(regionOf());ev=`${grpW(grp)}${sp}（${lv}級）擋在路上`}else ev=rnd(TRIP_EV);
  return `\n【路上出事（程序抽到的）】快到目的地的時候：${ev}。寫出這件事，停在主角要決定怎麼應付的那一刻；要動手或硬闖就給 check（填 foe、foeLv）。`;
}
