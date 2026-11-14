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
  if(k==="副手"&&!oneMelee(S.eq&&S.eq.武器))return "盾只能配單手近戰武器（或空手）";
  return true;
}
/* 每次畫面、存檔前：東西不見了就卸下；新拿到的、那一欄空著就自動穿上（玩家自己卸下的不會再自動穿） */
function gearSync(){
  if(!S||!Array.isArray(S.items))return;
  S.eq=S.eq||{}; const lost=[];
  SLOTS.forEach(k=>{const n=S.eq[k]; if(n==null)S.eq[k]=null; else if(!S.items.includes(n)||slotOf(n)!==k){S.eq[k]=null;lost.push(k)}});
  if(S.eq.副手&&!oneMelee(S.eq.武器))S.eq.副手=null;
  lost.forEach(k=>{const n=S.items.find(x=>slotOf(x)===k&&!worn(x)&&canWear(x)===true); if(n)S.eq[k]=n});   /* 用掉、壞掉、給人了：背包裡有同一欄的就換上 */
  const seen=new Set(S.eqSeen||[]);
  S.items.forEach(n=>{if(seen.has(n))return; seen.add(n); const k=slotOf(n); if(k&&!S.eq[k]&&!worn(n)&&canWear(n)===true)S.eq[k]=n});
  S.eqSeen=[...seen].filter(n=>S.items.includes(n));
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
    return `<div class="crow"><b>${k}</b>：${n?`${m?"✦ ":""}${esc(n)}${k==="武器"?`（${wtWord(n)}）`:""}${m&&m.lv?`・${m.lv}級`:""}${idle?` <button class="tl" data-uw="${k}">卸下</button>`:""}`:`<span class="none">（空）</span>`}</div>`}).join("");
  return `<div class="card"><h3>裝備</h3>${rows}
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
}
