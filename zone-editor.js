// Keep the existing backup format while editing zones as structured rows.
let zoneModel=null;
function readZoneRows(text,fixed){
 return text.split('\n').filter(line=>line.trim()).map(line=>{
  const split=line.lastIndexOf(':');
  const name=split<0?line.trim():line.slice(0,split).trim();
  const value=split<0?'':line.slice(split+1).trim();
  return fixed?{name,members:value.split(/[,\s]+/).filter(Boolean).map(Number)}:{name,count:Number(value)||0};
 });
}
function zoneCounts(){
 const fixed=zoneModel.fixed.flatMap(z=>z.members);
 const remaining=draft.clean.filter(n=>!fixed.includes(n)).length;
 const counts=zoneModel.variable.map((z,i)=>$('equal').checked?Math.floor(remaining/zoneModel.variable.length)+(i<remaining%zoneModel.variable.length?1:0):z.count);
 return {fixed,remaining,counts};
}
function updateZoneSummary(){
 if(!zoneModel)return;
 const {fixed,remaining,counts}=zoneCounts();
 $('zoneSummary').textContent=`전체 ${draft.clean.length}명 · 고정 ${new Set(fixed.filter(n=>draft.clean.includes(n))).size}명 · 무작위 배정 ${remaining}명 / 가변구역 정원 ${counts.reduce((a,b)=>a+b,0)}명`;
}
function renderZoneRows(){
 if(!zoneModel)return;
 const assigned=zoneModel.fixed.flatMap(z=>z.members);
 const available=draft.clean.filter(n=>!assigned.includes(n));
 const {counts}=zoneCounts();
 for(const kind of ['fixed','variable']){
  const fixed=kind==='fixed';
  $(fixed?'fixedRows':'variableRows').innerHTML=zoneModel[kind].map((z,i)=>`<fieldset class="zone-editor-row" data-kind="${kind}" data-index="${i}"><legend>${fixed?'고정':'가변'}구역 ${i+1}</legend><div class="zone-row-top"><label>구역 이름<input data-zone-name maxlength="60" value="${esc(z.name)}" placeholder="예: ${fixed?'분리수거':'교실'}" aria-label="${fixed?'고정':'가변'}구역 ${i+1} 이름"></label><button type="button" data-remove-zone aria-label="${fixed?'고정':'가변'}구역 ${i+1} 삭제">구역 삭제</button></div>${fixed?`<div class="assigned-students">${z.members.map(n=>`<button type="button" data-remove-member="${n}" class="member-token ${draft.clean.includes(n)?'':'missing-member'}" aria-label="${i+1}번 고정구역에서 ${n}번 삭제">${n}번 ×${draft.clean.includes(n)?'':' (명단 제외됨)'}</button>`).join('')||'<span>선택한 학생 없음</span>'}</div><div class="student-picker"><select data-member-picker aria-label="고정구역 ${i+1} 학생 번호"><option value="">학생 번호 선택</option>${available.map(n=>`<option value="${n}">${n}번</option>`).join('')}</select><button type="button" data-add-member${available.length?'':' disabled'}>학생 추가</button><span>${z.members.length}명 지정</span></div>`:`<label class="zone-count">배정 인원<input type="number" min="0" max="144" step="1" data-zone-count value="${counts[i]}" ${$('equal').checked?'disabled':''} aria-label="가변구역 ${i+1} 인원"><span>${$('equal').checked?'균등 배분으로 자동 계산':'명 (1명 또는 여러 명)'}</span></label>`}</fieldset>`).join('')||`<p class="zone-empty">등록한 ${fixed?'고정':'가변'}구역이 없습니다.</p>`;
 }
 updateZoneSummary();
}
function validateZoneRows(){
 const names=new Set();
 for(const [kind,rows] of Object.entries(zoneModel))for(const z of rows){
  const name=z.name.trim();
  if(!name)throw Error('모든 청소구역의 이름을 입력해 주세요.');
  if(/[\r\n]/.test(name))throw Error('구역 이름은 한 줄로 입력해 주세요.');
  if(names.has(name))throw Error('같은 이름의 청소구역이 있습니다. 이름을 구분해 주세요.');
  names.add(name);
  if(kind==='fixed'&&!z.members.length)throw Error(`${name}: 고정 담당 학생을 한 명 이상 추가해 주세요.`);
  if(kind==='variable'&&!$('equal').checked&&(!Number.isInteger(z.count)||z.count<0||z.count>144))throw Error(`${name}: 배정 인원을 0~144명의 정수로 입력해 주세요.`);
 }
 const {fixed,remaining,counts}=zoneCounts();
 if(fixed.some(n=>!draft.clean.includes(n)))throw Error('청소 명단에서 제외된 고정 담당자를 삭제하거나 명단에 복구해 주세요.');
 if(new Set(fixed).size!==fixed.length)throw Error('한 학생이 여러 고정구역에 지정되어 있습니다. 중복을 해제해 주세요.');
 if(remaining&&!zoneModel.variable.length)throw Error('남은 학생을 배정할 가변구역을 추가해 주세요.');
 if(counts.reduce((a,b)=>a+b,0)!==remaining)throw Error(`가변구역 인원 합계를 ${remaining}명에 맞추거나 균등 배분을 켜 주세요.`);
}
const openOriginalSettings=$('settings').onclick;
$('settings').onclick=()=>{
 zoneModel=null;openOriginalSettings();
 zoneModel={fixed:readZoneRows(draft.fixed,true),variable:readZoneRows(draft.zones,false)};
 renderZoneRows();
};
const originalChips=chips;
chips=function(){originalChips();if(zoneModel)renderZoneRows()};
for(const [id,kind] of [['addFixedZone','fixed'],['addVariableZone','variable']])$(id).onclick=()=>{
 zoneModel[kind].push(kind==='fixed'?{name:'',members:[]}:{name:'',count:1});renderZoneRows();
 $(kind==='fixed'?'fixedRows':'variableRows').querySelector('fieldset:last-child input').focus();
};
$('equal').onchange=renderZoneRows;
$('cleanSettings').oninput=e=>{
 const row=e.target.closest('[data-kind]');if(!row)return;
 const z=zoneModel[row.dataset.kind][Number(row.dataset.index)];
 if(e.target.hasAttribute('data-zone-name'))z.name=e.target.value;
 if(e.target.hasAttribute('data-zone-count'))z.count=e.target.value===''?NaN:Number(e.target.value);
 updateZoneSummary();
};
$('cleanSettings').onclick=e=>{
 const b=e.target.closest('button'),row=b?.closest('[data-kind]');if(!row)return;
 const kind=row.dataset.kind,index=Number(row.dataset.index),z=zoneModel[kind][index];
 if(b.hasAttribute('data-remove-zone'))zoneModel[kind].splice(index,1);
 else if(b.hasAttribute('data-remove-member'))z.members=z.members.filter(n=>n!==Number(b.dataset.removeMember));
 else if(b.hasAttribute('data-add-member')){
  const n=Number(row.querySelector('[data-member-picker]').value);
  if(!n){$('error').textContent='추가할 학생 번호를 선택해 주세요.';return}
  if(!draft.clean.includes(n)||zoneModel.fixed.some(v=>v.members.includes(n)))return;
  z.members.push(n);z.members.sort((a,b)=>a-b);
 }else return;
 $('error').textContent='';renderZoneRows();
};
const submitOriginalSettings=$('form').onsubmit;
$('form').onsubmit=e=>{
 if(tab==='clean'){
  e.preventDefault();
  try{validateZoneRows()}catch(error){$('error').textContent=error.message;return}
  $('fixed').value=zoneModel.fixed.map(z=>z.name.trim()+': '+z.members.join(', ')).join('\n');
  $('zones').value=zoneModel.variable.map((z,i)=>z.name.trim()+': '+zoneCounts().counts[i]).join('\n');
 }
 submitOriginalSettings(e);
};
