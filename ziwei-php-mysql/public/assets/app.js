"use strict";

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
const BRANCH_GRID = {
  巳:[0,0], 午:[0,1], 未:[0,2], 申:[0,3],
  辰:[1,0], 酉:[1,3],
  卯:[2,0], 戌:[2,3],
  寅:[3,0], 丑:[3,1], 子:[3,2], 亥:[3,3]
};
const MUTAGENS = ['祿','權','科','忌'];
const MUTAGEN_CLASS = {祿:'lu',權:'quan',科:'ke',忌:'ji'};
const HOUR_LABELS = ['早子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','晚子'];

const state = {
  caseId: null,
  astro: null,
  chart: null,
  horoscope: null,
  flowDate: new Date(),
  flowTimeIndex: 0,
  selectedBranch: null,
  selectedDecade: 0,
  settings: {algorithm:'default',year_divide:'normal',horoscope_divide:'normal',age_divide:'normal',day_divide:'forward'}
};

function esc(v){return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function pad(n){return String(n).padStart(2,'0');}
function isoDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function parseISO(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12,0,0,0);}
function daysInMonth(y,m){return new Date(y,m,0).getDate();}
function hourToTimeIndex(hour){hour=Number(hour);if(hour===23)return 12;if(hour===0)return 0;return Math.floor((hour+1)/2);}
function timeIndexToHour(idx){idx=Number(idx);if(idx===12)return 23;if(idx===0)return 0;return idx*2-1;}
function zhPalaceName(name){return String(name || '').replace('宮','');}
function showToast(msg,type=''){const t=$('#toast');t.textContent=msg;t.className=`toast show ${type}`;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.className='toast',2200);}
function setStatus(msg=''){ $('#status').textContent=msg; }

async function api(action, opts={}){
  const q = new URLSearchParams(opts.query || {});
  q.set('action',action);
  const res = await fetch(`api.php?${q.toString()}`, {
    method: opts.method || 'GET',
    headers: opts.body ? {'Content-Type':'application/json'} : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(()=>({ok:false,error:`HTTP ${res.status}`}));
  if(!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function fillHourSelectors(){
  const birth=$('#birthHour'); birth.innerHTML='';
  for(let h=0;h<24;h++){
    const opt=document.createElement('option');opt.value=h;opt.textContent=`${pad(h)}:00`;if(h===10)opt.selected=true;birth.appendChild(opt);
  }
  const flow=$('#flowHour'); flow.innerHTML='';
  HOUR_LABELS.forEach((x,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=`${x}時`;flow.appendChild(opt);});
  state.flowTimeIndex=hourToTimeIndex(new Date().getHours());
  flow.value=state.flowTimeIndex;
}

function applyEngineConfig(){
  if(!window.iztro?.astro) return;
  const s=state.settings;
  try{
    window.iztro.astro.config({
      algorithm:s.algorithm || 'default',
      yearDivide:s.year_divide || 'normal',
      horoscopeDivide:s.horoscope_divide || 'normal',
      ageDivide:s.age_divide || 'normal',
      dayDivide:s.day_divide || 'forward'
    });
  }catch(e){ console.warn('iztro config',e); }
}

async function loadSettings(){
  try{
    const {data}=await api('settings');
    state.settings={...state.settings,...data};
  }catch(e){console.warn(e);}
  $('#setAlgorithm').value=state.settings.algorithm;
  $('#setYearDivide').value=state.settings.year_divide;
  $('#setHoroscopeDivide').value=state.settings.horoscope_divide;
  $('#setAgeDivide').value=state.settings.age_divide;
  $('#setDayDivide').value=state.settings.day_divide;
  applyEngineConfig();
}

function createAstro(){
  if(!window.iztro?.astro) throw new Error('排盤核心尚未載入。請確認網路可連線到 jsDelivr，或把 iztro v2.6.1 放到本機 assets/vendor。');
  applyEngineConfig();
  const by=Number($('#birthYear').value), bm=Number($('#birthMonth').value), bd=Number($('#birthDay').value);
  if(!Number.isInteger(by)||by<1900||by>2100||!Number.isInteger(bm)||bm<1||bm>12||!Number.isInteger(bd)||bd<1||bd>31) throw new Error('出生年月日格式錯誤');
  const date=`${by}-${bm}-${bd}`;
  const hour=Number($('#birthHour').value);
  const timeIndex=hourToTimeIndex(hour);
  const gender=$('#gender').value;
  const calendar=$('#calendarType').value;
  let astro;
  if(calendar==='lunar'){
    astro=window.iztro.astro.byLunar(date,timeIndex,gender,$('#isLeapMonth').checked,true,'zh-TW');
  }else{
    astro=window.iztro.astro.bySolar(date,timeIndex,gender,true,'zh-TW');
  }
  return astro;
}

function regenerate(){
  setStatus('');
  try{
    state.astro=createAstro();
    state.chart=state.astro.toJSON ? state.astro.toJSON() : state.astro;
    if(!state.flowDate || Number.isNaN(state.flowDate.getTime())) state.flowDate=new Date();
    updateHoroscope();
    const ds=state.astro.decadalList ? state.astro.decadalList() : [];
    if(ds.length){
      const y=state.flowDate.getFullYear();
      const hit=ds.findIndex(x=>y>=x.yearRange[0] && y<=x.yearRange[1]);
      state.selectedDecade=hit>=0?hit:0;
    }
    renderAll();
  }catch(e){setStatus(e.message);showToast(e.message,'error');}
}

function updateHoroscope(){
  if(!state.astro) return;
  const d=isoDate(state.flowDate);
  state.horoscope=state.astro.horoscope(d,state.flowTimeIndex);
}

function allStars(p){return [...(p.majorStars||[]),...(p.minorStars||[]),...(p.adjectiveStars||[])];}
function scopeMutagens(starName){
  if(!state.horoscope) return '';
  const scopeLabel={decadal:'限',yearly:'年',monthly:'月',daily:'日',hourly:'時'};
  let out='';
  ['decadal','yearly','monthly','daily','hourly'].forEach(scope=>{
    const item=state.horoscope[scope];
    const idx=item?.mutagen?.indexOf(starName) ?? -1;
    if(idx<0) return;
    const m=MUTAGENS[idx];
    out+=`<span class="scope-mutagen ${scope}" title="${scopeLabel[scope]}化${m}">${scopeLabel[scope]}${m}</span>`;
  });
  return out;
}
function starHTML(s, extra=''){
  const type=esc(s.type || 'adjective');
  let x=`<span class="star ${type} ${extra}">${esc(s.name)}`;
  if(s.mutagen) x+=`<span class="mutagen ${MUTAGEN_CLASS[s.mutagen]||''}">${esc(s.mutagen)}</span>`;
  x+=scopeMutagens(s.name);
  if(s.brightness) x+=`<sup class="brightness br b-${brightnessClass(s.brightness)}">${esc(s.brightness)}</sup>`;
  return x+'</span>';
}
function brightnessClass(x){return ({廟:'miao',旺:'wang',得:'de',利:'li',平:'ping',不:'bu',陷:'xian'})[x]||'ping';}
function dynamicMutagen(scope, starName){
  const item=state.horoscope?.[scope];
  if(!item?.mutagen) return '';
  const idx=item.mutagen.indexOf(starName);
  if(idx<0) return '';
  const mark=MUTAGENS[idx];
  return `<span class="mutagen ${MUTAGEN_CLASS[mark]}">${mark}</span>`;
}
function flowStarsFor(index,scope){
  const item=state.horoscope?.[scope];
  if(!item?.stars || !Array.isArray(item.stars[index])) return [];
  return item.stars[index];
}

function makePalace(p,index){
  const el=document.createElement('section');
  el.className='palace';
  el.dataset.branch=p.earthlyBranch;
  el.dataset.index=String(index);
  const gp=BRANCH_GRID[p.earthlyBranch]; if(gp){el.style.gridRow=String(gp[0]+1);el.style.gridColumn=String(gp[1]+1);}
  if(state.horoscope?.yearly?.index===index) el.classList.add('flow-year');
  if(state.horoscope?.age?.index===index) el.classList.add('flow-age');
  if(state.horoscope?.decadal?.index===index) el.classList.add('flow-decade');
  if(state.selectedBranch===p.earthlyBranch) el.classList.add('selected');

  const tags=[];
  const h=state.horoscope;
  if(h){
    if(h.decadal?.palaceNames?.[index]) tags.push(`<span class="flow-tag">限${esc(zhPalaceName(h.decadal.palaceNames[index]))}</span>`);
    if(h.yearly?.palaceNames?.[index]) tags.push(`<span class="flow-tag year">年${esc(zhPalaceName(h.yearly.palaceNames[index]))}</span>`);
    if(h.monthly?.palaceNames?.[index]) tags.push(`<span class="flow-tag month">月${esc(zhPalaceName(h.monthly.palaceNames[index]))}</span>`);
    if(h.daily?.palaceNames?.[index]) tags.push(`<span class="flow-tag day">日${esc(zhPalaceName(h.daily.palaceNames[index]))}</span>`);
    if(h.hourly?.palaceNames?.[index]) tags.push(`<span class="flow-tag hour">時${esc(zhPalaceName(h.hourly.palaceNames[index]))}</span>`);
  }

  const groups={major:[],minor:[],adj:[]};
  (p.majorStars||[]).forEach(s=>groups.major.push(starHTML(s)));
  (p.minorStars||[]).forEach(s=>groups.minor.push(starHTML(s)));
  (p.adjectiveStars||[]).forEach(s=>groups.adj.push(starHTML(s)));

  const flowLines=[];
  ['decadal','yearly','monthly','daily','hourly'].forEach(scope=>{
    const stars=flowStarsFor(index,scope);
    if(!stars.length) return;
    const label={decadal:'限',yearly:'年',monthly:'月',daily:'日',hourly:'時'}[scope];
    const list=stars.map(s=>`<span class="star ${esc(s.type||'adjective')} flow">${esc(s.name)}${dynamicMutagen(scope,s.name)}</span>`).join('');
    flowLines.push(`<div class="star-line"><small>${label}</small> ${list}</div>`);
  });

  const stage=p.decadal?.range || p.stage?.range || ['?','?'];
  el.innerHTML=`
    <div class="palace-head"><span class="stem-branch">${esc(p.heavenlyStem)}${esc(p.earthlyBranch)}</span><span class="palace-name">${esc(zhPalaceName(p.name))}${p.isBodyPalace?'<span class="body-tag">·身</span>':''}</span></div>
    <div class="flow-tags">${tags.join('')}</div>
    <div class="stars">
      ${groups.major.length?`<div class="star-line">${groups.major.join('')}</div>`:''}
      ${groups.minor.length?`<div class="star-line">${groups.minor.join('')}</div>`:''}
      ${groups.adj.length?`<div class="star-line">${groups.adj.join('')}</div>`:''}
      ${flowLines.join('')}
    </div>
    <div class="palace-meta">
      <div class="orange">大限 ${esc(stage[0])}-${esc(stage[1])}</div>
      <div class="teal">小限 ${(p.ages||[]).slice(0,8).map(esc).join('、')}${(p.ages||[]).length>8?'…':''}</div>
      <div class="purple">博士 ${esc(p.boshi12||'')}　將前 ${esc(p.jiangqian12||'')}</div>
      <div>歲前 ${esc(p.suiqian12||'')}</div>
      <div class="changsheng">十二長生 · ${esc(p.changsheng12||'')}</div>
    </div>`;
  el.addEventListener('click',()=>selectPalace(p));
  return el;
}

function centerHTML(){
  const c=state.chart,h=state.horoscope;
  const name=$('#name').value.trim()||'匿名';
  const sdate=esc(c.solarDate||`${$('#birthYear').value}-${pad($('#birthMonth').value)}-${pad($('#birthDay').value)}`);
  const time=esc(c.time||'');
  const mutagenRows=h ? ['decadal','yearly','monthly','daily','hourly'].map(scope=>{
    const item=h[scope]; if(!item) return '';
    const title={decadal:'大限',yearly:'流年',monthly:'流月',daily:'流日',hourly:'流時'}[scope];
    const marks=(item.mutagen||[]).map((star,i)=>`<span class="${MUTAGEN_CLASS[MUTAGENS[i]]}">${MUTAGENS[i]}→${esc(star)}</span>`).join('　');
    return `<div><b>${title}</b> ${esc(item.heavenlyStem||'')}${esc(item.earthlyBranch||'')}　${marks}</div>`;
  }).join('') : '';
  return `<div class="center-box">
    <div class="center-title">紫微斗數排盤</div>
    <div class="center-row"><span class="center-label">姓名：</span><span class="center-value">${esc(name)} <span class="pill gender">${esc(c.gender)}</span><span class="pill bureau">${esc(c.fiveElementsClass)}</span></span></div>
    <div class="center-row"><span class="center-label">公曆：</span><span class="center-value">${sdate} ${esc(c.timeRange||time)}</span></div>
    <div class="center-row"><span class="center-label">農曆：</span><span class="center-value">${esc(c.lunarDate)}　${time}</span></div>
    <div class="center-row"><span class="center-label">四柱：</span><span class="center-value">${esc(c.chineseDate)}</span></div>
    <div class="center-row"><span class="center-label">命主／身主：</span><span class="center-value">${esc(c.soul)} ／ ${esc(c.body)}</span></div>
    <div class="center-row"><span class="center-label">命／身宮：</span><span class="center-value">${esc(c.earthlyBranchOfSoulPalace)}宮 ／ ${esc(c.earthlyBranchOfBodyPalace)}宮</span></div>
    <div class="center-row"><span class="center-label">生肖／星座：</span><span class="center-value"><span class="pill zodiac">${esc(c.zodiac)}</span> ${esc(c.sign)}</span></div>
    <div class="center-flow"><div><b>運限日期：</b>${h?esc(h.solarDate):''}　${h?esc(h.lunarDate):''}</div><div class="flow-legend">${mutagenRows}</div></div>
  </div>`;
}

function renderChart(){
  const root=$('#chart');root.innerHTML='';
  root.style.position='relative';
  const byBranch=new Map(state.chart.palaces.map((p,i)=>[p.earthlyBranch,{p,i}]));
  for(let r=0;r<4;r++) for(let c=0;c<4;c++){
    if((r===1||r===2)&&(c===1||c===2)){
      if(r===1&&c===1){const ce=document.createElement('section');ce.className='center';ce.innerHTML=centerHTML();root.appendChild(ce);} continue;
    }
    const branch=Object.keys(BRANCH_GRID).find(b=>BRANCH_GRID[b][0]===r&&BRANCH_GRID[b][1]===c);
    const got=byBranch.get(branch); if(got) root.appendChild(makePalace(got.p,got.i));
  }
  if(!state.selectedBranch) state.selectedBranch=state.chart.earthlyBranchOfSoulPalace;
  highlightSelected();
}

function selectPalace(p){
  state.selectedBranch=p.earthlyBranch;
  highlightSelected();
  drawSanhe();
}
function highlightSelected(){
  $$('.palace').forEach(x=>x.classList.remove('selected','sanfang'));
  if(!state.selectedBranch||!state.astro)return;
  const current=state.chart.palaces.find(p=>p.earthlyBranch===state.selectedBranch);
  if(!current)return;
  let branches=[state.selectedBranch];
  try{
    const sur=state.astro.surroundedPalaces(current.name);
    const j=sur?.toJSON?sur.toJSON():sur;
    branches=[j.target,j.opposite,j.wealth,j.career].filter(Boolean).map(p=>p.earthlyBranch);
  }catch(e){console.warn(e);}
  branches.forEach((b,i)=>{const el=$(`.palace[data-branch="${b}"]`);if(el)el.classList.add(i===0?'selected':'sanfang');});
}
function drawSanhe(){
  const svg=$('#sanheSvg'),wrap=$('#chartWrapper'); if(!svg||!wrap)return;
  const wr=wrap.getBoundingClientRect(); svg.setAttribute('viewBox',`0 0 ${wr.width} ${wr.height}`);
  const current=state.chart?.palaces.find(p=>p.earthlyBranch===state.selectedBranch);if(!current){svg.innerHTML='';return;}
  let branches=[];try{const sur=state.astro.surroundedPalaces(current.name);const j=sur?.toJSON?sur.toJSON():sur;branches=[j.target,j.opposite,j.wealth,j.career].filter(Boolean).map(p=>p.earthlyBranch);}catch(e){}
  const points={};branches.forEach(b=>{const el=$(`.palace[data-branch="${b}"]`);if(el){const r=el.getBoundingClientRect();points[b]={x:r.left-wr.left+r.width/2,y:r.top-wr.top+r.height/2};}});
  const o=points[state.selectedBranch];if(!o){svg.innerHTML='';return;}
  let out='';branches.slice(1).forEach((b,i)=>{const p=points[b];if(!p)return;const color=i===0?'#2d6cdf':'#e67e22';out+=`<line x1="${o.x}" y1="${o.y}" x2="${p.x}" y2="${p.y}" stroke="${color}" stroke-width="1.6" stroke-dasharray="6,4" opacity=".62"/>`;});svg.innerHTML=out;
}

function currentDecadalList(){return state.astro?.decadalList?.() || [];}
function currentYearList(){
  const d=currentDecadalList()[state.selectedDecade];
  if(!d) return [];
  if(state.astro.yearlyList){try{return state.astro.yearlyList(d.palaceName)||[];}catch(e){console.warn(e);}}
  return [];
}
function renderTimeline(){
  const root=$('#timeline'); root.innerHTML='';
  const ds=currentDecadalList();
  const addRow=(label,cls,items,activeKey,onClick)=>{
    const row=document.createElement('div');row.className=`tl-row ${cls||''}`;
    row.innerHTML=`<div class="tl-label">${label}</div><div class="tl-cells"></div>`;
    const cells=$('.tl-cells',row);
    items.forEach((it,idx)=>{const cell=document.createElement('div');cell.className='tl-cell'+(activeKey(it,idx)?' active':'');cell.innerHTML=it.html;cell.addEventListener('click',()=>onClick(it,idx));cells.appendChild(cell);});root.appendChild(row);
  };
  addRow('大限','decade',ds.map((d,i)=>({raw:d,html:`${d.ageRange[0]}-${d.ageRange[1]}<small>${esc(d.heavenlyStem)}${esc(d.earthlyBranch)} ${esc(zhPalaceName(d.palaceName))}</small>`})),(_,i)=>i===state.selectedDecade,(it,i)=>{state.selectedDecade=i;const y=it.raw.yearRange[0];state.flowDate=new Date(y,Math.min(state.flowDate.getMonth(),11),Math.min(state.flowDate.getDate(),28),12);syncFlowInputs();updateHoroscope();renderAll();});

  const ys=currentYearList();
  addRow('流年','year',ys.map(y=>({raw:y,html:`${y.year}<small>${esc(y.heavenlyStem)}${esc(y.earthlyBranch)} ${y.age}歲</small>`})),it=>it.raw.year===state.flowDate.getFullYear(),it=>{const y=it.raw.year;state.flowDate=new Date(y,state.flowDate.getMonth(),Math.min(state.flowDate.getDate(),28),12);syncFlowInputs();updateHoroscope();renderAll();});

  const y=state.flowDate.getFullYear();
  const months=Array.from({length:12},(_,i)=>({m:i+1,html:`${i+1}月<small>公曆導航</small>`}));
  addRow('流月','month',months,it=>it.m===state.flowDate.getMonth()+1,it=>{const day=Math.min(state.flowDate.getDate(),daysInMonth(y,it.m));state.flowDate=new Date(y,it.m-1,day,12);syncFlowInputs();updateHoroscope();renderAll();});

  const dm=daysInMonth(y,state.flowDate.getMonth()+1);
  const days=Array.from({length:dm},(_,i)=>({d:i+1,html:`${i+1}<small>日</small>`}));
  addRow('流日','day',days,it=>it.d===state.flowDate.getDate(),it=>{state.flowDate=new Date(y,state.flowDate.getMonth(),it.d,12);syncFlowInputs();updateHoroscope();renderAll();});

  const hours=HOUR_LABELS.map((x,i)=>({i,html:`${x}<small>時</small>`}));
  addRow('流時','hour',hours,it=>it.i===state.flowTimeIndex,it=>{state.flowTimeIndex=it.i;syncFlowInputs();updateHoroscope();renderAll();});
}

function renderFlowSummary(){
  const h=state.horoscope;if(!h){$('#flowSummary').textContent='尚未排盤';return;}
  const agePal=state.chart.palaces[h.age?.index];
  const rows=[
    ['大限',h.decadal],['流年',h.yearly],['流月',h.monthly],['流日',h.daily],['流時',h.hourly]
  ].map(([n,x])=>`<div><b>${n}</b>：${esc(x?.heavenlyStem||'')}${esc(x?.earthlyBranch||'')}　命宮落第 ${Number(x?.index??0)+1} 宮　四化 ${(x?.mutagen||[]).map((s,i)=>`${MUTAGENS[i]}→${esc(s)}`).join('、')}</div>`).join('');
  $('#flowSummary').innerHTML=`<div><b>小限：</b>${h.age?.nominalAge??''} 歲，落 ${esc(agePal?.heavenlyStem||'')}${esc(agePal?.earthlyBranch||'')} ${esc(zhPalaceName(agePal?.name||''))}</div>${rows}`;
}
function renderAll(){if(!state.chart)return;renderChart();renderTimeline();renderFlowSummary();requestAnimationFrame(drawSanhe);}
function syncFlowInputs(){$('#flowDate').value=isoDate(state.flowDate);$('#flowHour').value=state.flowTimeIndex;}

async function loadCases(q=''){
  try{const {data}=await api('list',{query:q?{q}:{}});$('#caseCount').textContent=data.length;const root=$('#caseList');if(!data.length){root.innerHTML='<div class="case-item muted">尚未保存命例</div>';return;}root.innerHTML=data.map(c=>`<div class="case-item" data-id="${c.id}"><div class="case-avatar">${esc((c.name||'?')[0])}</div><div class="case-info"><div class="case-name">${esc(c.name)}</div><div class="case-sub">${c.birth_year}-${pad(c.birth_month)}-${pad(c.birth_day)} ${pad(c.birth_hour)}:00 · ${esc(c.gender)}</div></div><button class="case-del" data-del="${c.id}">刪除</button></div>`).join('');$$('.case-item[data-id]',root).forEach(el=>el.addEventListener('click',e=>{if(e.target.matches('[data-del]'))return;loadCase(el.dataset.id);}));$$('[data-del]',root).forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation();if(!confirm('確定刪除這筆命例？'))return;try{await api('delete',{method:'DELETE',query:{id:b.dataset.del}});if(String(state.caseId)===String(b.dataset.del))state.caseId=null;await loadCases($('#caseSearch').value);showToast('已刪除','success');}catch(err){showToast(err.message,'error');}}));}catch(e){$('#caseList').innerHTML=`<div class="case-item muted">${esc(e.message)}</div>`;}
}
async function loadCase(id){
  try{const {data}=await api('get',{query:{id}});state.caseId=Number(data.id);$('#name').value=data.name;$('#birthYear').value=data.birth_year;$('#birthMonth').value=data.birth_month;$('#birthDay').value=data.birth_day;$('#birthHour').value=data.birth_hour;$('#gender').value=data.gender;$('#calendarType').value=data.calendar_type||'solar';$('#isLeapMonth').checked=!!Number(data.is_leap_month);$('#note').value=data.note||'';toggleLeap();regenerate();closeDrawer();showToast('命例已載入','success');}catch(e){showToast(e.message,'error');}
}
async function saveCase(){
  if(!state.chart){showToast('請先排盤','error');return;}
  const body={id:state.caseId,name:$('#name').value.trim()||'匿名',birth_year:Number($('#birthYear').value),birth_month:Number($('#birthMonth').value),birth_day:Number($('#birthDay').value),birth_hour:Number($('#birthHour').value),gender:$('#gender').value,calendar_type:$('#calendarType').value,is_leap_month:$('#isLeapMonth').checked,fix_leap:true,timezone:'Asia/Taipei',note:$('#note').value,chart_json:state.chart};
  try{const r=await api('save',{method:'POST',body});state.caseId=r.id;await loadCases();showToast('命例已保存','success');}catch(e){showToast(e.message,'error');}
}
function exportJSON(){if(!state.chart)return;const data={case:{id:state.caseId,name:$('#name').value,birthYear:Number($('#birthYear').value),birthMonth:Number($('#birthMonth').value),birthDay:Number($('#birthDay').value),birthHour:Number($('#birthHour').value),gender:$('#gender').value,note:$('#note').value},astrolabe:state.chart,horoscope:state.horoscope?.toJSON?state.horoscope.toJSON():state.horoscope,engine:{name:'iztro',version:'2.6.1',settings:state.settings}};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ziwei-${($('#name').value||'case').replace(/[^\w\u4e00-\u9fff-]+/g,'_')}.json`;a.click();URL.revokeObjectURL(a.href);}


function newCase(){
  state.caseId=null;
  $('#name').value='';
  $('#birthYear').value=1990; $('#birthMonth').value=6; $('#birthDay').value=15; $('#birthHour').value=10;
  $('#gender').value='男'; $('#calendarType').value='solar'; $('#isLeapMonth').checked=false; $('#note').value='';
  toggleLeap(); regenerate(); closeDrawer(); showToast('已建立新命例，可修改後保存','success');
}

async function downloadBackup(){
  try{
    const {data}=await api('backup');
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`ziwei-backup-${isoDate(new Date())}.json`; a.click(); URL.revokeObjectURL(a.href);
    showToast('完整備份已匯出','success');
  }catch(e){showToast(e.message,'error');}
}

async function restoreBackupFile(file){
  if(!file)return;
  try{
    const text=await file.text(); const backup=JSON.parse(text);
    const replace=confirm('按「確定」會清空目前命例後還原；按「取消」則合併匯入，不刪除現有命例。');
    const mode=replace?'replace':'merge';
    const r=await api('restore',{method:'POST',body:{backup,mode}});
    await loadSettings(); await loadCases();
    showToast(`已匯入 ${r.imported||0} 筆命例`,'success');
  }catch(e){showToast('匯入失敗：'+e.message,'error');}
  finally{$('#restoreFile').value='';}
}

let deferredInstallPrompt=null;
function setupPwa(){
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW',e)));}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('#installBtn').classList.remove('hidden');});
  window.addEventListener('appinstalled',()=>{$('#installBtn').classList.add('hidden');deferredInstallPrompt=null;showToast('App 已安裝','success');});
  $('#installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('#installBtn').classList.add('hidden');});
}

function toggleLeap(){$('#leapWrap').classList.toggle('hidden',$('#calendarType').value!=='lunar');}
function openDrawer(){$('#drawer').classList.add('open');$('#drawer').setAttribute('aria-hidden','false');$('#drawerMask').classList.add('open');loadCases($('#caseSearch').value);}
function closeDrawer(){$('#drawer').classList.remove('open');$('#drawer').setAttribute('aria-hidden','true');$('#drawerMask').classList.remove('open');}
function openSettings(){$('#settings').classList.add('open');$('#settings').setAttribute('aria-hidden','false');$('#drawerMask').classList.add('open');}
function closeSettings(){$('#settings').classList.remove('open');$('#settings').setAttribute('aria-hidden','true');$('#drawerMask').classList.remove('open');}

function bind(){
  $('#chartBtn').addEventListener('click',regenerate);$('#saveBtn').addEventListener('click',saveCase);$('#exportBtn').addEventListener('click',exportJSON);$('#printBtn').addEventListener('click',()=>window.print());$('#closeBtn').addEventListener('click',()=>window.close());
  $('#newCaseBtn').addEventListener('click',newCase);$('#backupBtn').addEventListener('click',downloadBackup);$('#restoreBtn').addEventListener('click',()=>$('#restoreFile').click());$('#restoreFile').addEventListener('change',e=>restoreBackupFile(e.target.files?.[0]));
  $('#drawerOpen').addEventListener('click',openDrawer);$('#drawerClose').addEventListener('click',closeDrawer);$('#drawerMask').addEventListener('click',()=>{closeDrawer();closeSettings();});$('#settingsOpen').addEventListener('click',openSettings);$('#settingsClose').addEventListener('click',closeSettings);
  $('#calendarType').addEventListener('change',toggleLeap);$('#caseSearch').addEventListener('input',()=>loadCases($('#caseSearch').value));
  $('#flowDate').addEventListener('change',()=>{state.flowDate=parseISO($('#flowDate').value);updateHoroscope();const ds=currentDecadalList();const y=state.flowDate.getFullYear();const hit=ds.findIndex(x=>y>=x.yearRange[0]&&y<=x.yearRange[1]);if(hit>=0)state.selectedDecade=hit;renderAll();});
  $('#flowHour').addEventListener('change',()=>{state.flowTimeIndex=Number($('#flowHour').value);updateHoroscope();renderAll();});
  $('#todayBtn').addEventListener('click',()=>{state.flowDate=new Date();state.flowTimeIndex=hourToTimeIndex(new Date().getHours());syncFlowInputs();updateHoroscope();const ds=currentDecadalList();const y=state.flowDate.getFullYear();const hit=ds.findIndex(x=>y>=x.yearRange[0]&&y<=x.yearRange[1]);if(hit>=0)state.selectedDecade=hit;renderAll();});
  $('#settingsSave').addEventListener('click',async()=>{const body={algorithm:$('#setAlgorithm').value,year_divide:$('#setYearDivide').value,horoscope_divide:$('#setHoroscopeDivide').value,age_divide:$('#setAgeDivide').value,day_divide:$('#setDayDivide').value};try{await api('settings',{method:'POST',body});state.settings={...state.settings,...body};applyEngineConfig();if(state.astro)regenerate();closeSettings();showToast('設定已保存','success');}catch(e){showToast(e.message,'error');}});
  window.addEventListener('resize',()=>requestAnimationFrame(drawSanhe));
}

(async function init(){
  fillHourSelectors();state.flowDate=new Date();syncFlowInputs();toggleLeap();bind();setupPwa();await loadSettings();await loadCases();
  if(!window.iztro?.astro){setStatus('排盤核心載入失敗：目前採固定 iztro 2.6.1 CDN。部署正式環境時建議下載到 assets/vendor 改成本機載入。');return;}
  regenerate();
})();
