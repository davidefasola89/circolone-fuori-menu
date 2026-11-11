const $ = s => document.querySelector(s);
const groups = [{id:'primi',name:'Primi',count:2},{id:'secondi',name:'Secondi',count:2},{id:'burger',name:'Burger',count:1}];
const key='circolone-menu-v2', oldKey='circolone-menu-v1';
const emptyDish=()=>({name:'',price:'',desc:''});
const today=new Date(),monday=new Date(today);monday.setDate(today.getDate()-(today.getDay()+6)%7);
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);
function defaults(){return {start:iso(monday),end:iso(sunday),sections:Object.fromEntries(groups.map(g=>[g.id,Array.from({length:g.count},emptyDish)]))}}
const isDish=x=>x&&['name','price','desc'].every(k=>typeof x[k]==='string');
function restore(current,legacy){
 if(current&&typeof current.start==='string'&&typeof current.end==='string'&&current.sections&&groups.every(g=>Array.isArray(current.sections[g.id])&&current.sections[g.id].every(isDish)))return {start:current.start,end:current.end,sections:Object.fromEntries(groups.map(g=>[g.id,current.sections[g.id]]))};
 if(legacy&&typeof legacy.start==='string'&&typeof legacy.end==='string'&&Array.isArray(legacy.items)&&legacy.items.length===7&&legacy.items.every(isDish))return {start:legacy.start,end:legacy.end,sections:{primi:legacy.items.slice(0,2),secondi:legacy.items.slice(2,4),burger:legacy.items.slice(4,5)}};
 return defaults();
}
function stored(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
let data=restore(stored(key),stored(oldKey));
$('#start').value=data.start;$('#end').value=data.end;
const extraStyle=document.createElement('style');extraStyle.textContent=`textarea{display:block;width:100%;font:15px Arial;color:#292929;border:1px solid #ddd9d3;border-radius:5px;background:#fff;padding:11px;margin-top:6px;resize:vertical;line-height:1.5}textarea:focus{outline:2px solid #a96c72;outline-offset:1px}.dish-actions{display:flex;justify-content:flex-end;margin-top:10px}.remove-dish{background:transparent;color:#802330;padding:6px 0;font-size:12px}.add-dish{margin:4px 0 10px}.menu-notice{font-size:13px;line-height:1.5;border-radius:6px;padding:12px;background:#ede8df;color:#594e45;margin:0 0 14px}.menu-notice.error{background:#f7e5e5;color:#8a202c}.empty-section{font-size:12px;color:#777}`;document.head.append(extraStyle);
const notice=document.createElement('p');notice.className='menu-notice';notice.setAttribute('role','status');$('#preview').before(notice);
function renderFields(){
 $('#fields').replaceChildren();
 for(const g of groups){
  const section=document.createElement('section'),heading=document.createElement('h2'),badge=document.createElement('span');
  heading.textContent=g.name+' ';badge.textContent=data.sections[g.id].length;heading.append(badge);section.append(heading);
  data.sections[g.id].forEach((item,i)=>{
   const card=document.createElement('div');card.className='dish';
   card.innerHTML=`<div class="row"><label>Piatto ${i+1}<input data-group="${g.id}" data-i="${i}" data-k="name" maxlength="65" placeholder="Nome del piatto"></label><label>Prezzo €<input data-group="${g.id}" data-i="${i}" data-k="price" type="number" min="0" max="999" step="0.01" placeholder="0,00"></label></div><label class="desc">Descrizione · facoltativa${g.id==='burger'?`<textarea data-group="${g.id}" data-i="${i}" data-k="desc" maxlength="300" rows="3" placeholder="Ingredienti del burger · puoi andare a capo"></textarea><span class="hint">Fino a 300 caratteri. A capo automatico nel menu.</span>`:`<input data-group="${g.id}" data-i="${i}" data-k="desc" maxlength="110" placeholder="Ingredienti o accompagnamento">`}</label><div class="dish-actions"><button type="button" class="remove-dish" data-remove="${g.id}" data-i="${i}" aria-label="Elimina piatto ${i+1} da ${g.name}">Elimina piatto</button></div>`;
   card.querySelectorAll('[data-k]').forEach(el=>el.value=item[el.dataset.k]);section.append(card);
  });
  if(!data.sections[g.id].length){const p=document.createElement('p');p.className='empty-section';p.textContent='Sezione vuota: non comparirà nel PDF.';section.append(p)}
  const add=document.createElement('button');add.type='button';add.className='secondary add-dish';add.dataset.add=g.id;add.textContent='+ Aggiungi piatto';add.setAttribute('aria-label','Aggiungi piatto a '+g.name);section.append(add);$('#fields').append(section);
 }
}
renderFields();
const canvas=$('#preview'),ctx=canvas.getContext('2d'),W=1480,H=2100;canvas.width=W;canvas.height=H;
const logo=new Image();logo.onload=draw;logo.onerror=draw;logo.src='logo.png';let valid=false;
function wrap(s,max,font){ctx.font=font;const lines=[];for(const paragraph of s.split(/\r?\n/)){let line='';for(const word of paragraph.trim().split(/\s+/)){if(!word)continue;const next=line?line+' '+word:word;if(ctx.measureText(next).width>max&&line){lines.push(line);line=''}if(ctx.measureText(word).width>max){for(const char of word){if(ctx.measureText(line+char).width>max&&line){lines.push(line);line=''}line+=char}}else line=line?line+' '+word:word}lines.push(line)}return lines}
function text(s,x,y,size=36,color='#272727',weight='normal',align='left'){ctx.fillStyle=color;ctx.font=`${weight} ${size}px Arial`;ctx.textAlign=align;ctx.fillText(s,x,y)}
// Text sizes stay fixed: only whitespace is compressed to fit the single A5 page.
function layout(compact){
 const headingGap=75-15*compact,dishGap=35-23*compact,sectionGap=50-30*compact;
 let y=540;const blocks=[];
 for(const g of groups){if(!data.sections[g.id].length)continue;
  blocks.push({kind:'heading',label:g.name.toUpperCase(),y});y+=headingGap;
  for(const item of data.sections[g.id]){const titles=wrap(item.name.trim()||'Nome del piatto',1040,'normal 38px Arial');const descriptions=item.desc.trim()?wrap(item.desc.trim(),1220,'normal 28px Arial'):[];
   blocks.push({kind:'dish',item,titles,descriptions,y});y+=titles.length*45+descriptions.length*34+dishGap;
  }y+=sectionGap;
 }
 return {blocks,end:y};
}
function chooseLayout(){let plan;for(let step=0;step<=10;step++){plan=layout(step/10);if(plan.end<=1900)return {...plan,compact:step>0,fits:true}}return {...plan,compact:true,fits:false}}
function dateValid(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return Number.isFinite(d.getTime())&&iso(d)===s}
function draw(){
 const plan=chooseLayout(),all=groups.flatMap(g=>data.sections[g.id]);
 ctx.fillStyle='#faf5e9';ctx.fillRect(0,0,W,H);
 if(logo.complete&&logo.naturalWidth)ctx.drawImage(logo,420,110,640,640*logo.naturalHeight/logo.naturalWidth);
 text('MENU DELLA SETTIMANA',W/2,370,49,'#272727','bold','center');
 const goodDates=dateValid(data.start)&&dateValid(data.end),fmt=s=>new Date(s+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
 text(goodDates?`${fmt(data.start)} — ${fmt(data.end)}`:'Seleziona le date della settimana',W/2,427,27,'#555','normal','center');
 ctx.save();ctx.beginPath();ctx.rect(80,490,1320,1420);ctx.clip();
 for(const block of plan.blocks){
  if(block.kind==='heading'){text(block.label,100,block.y,36,'#802330','bold');const tw=ctx.measureText(block.label).width;ctx.strokeStyle='#802330';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(125+tw,block.y-12);ctx.lineTo(1380,block.y-12);ctx.stroke();continue}
  let y=block.y;for(const line of block.titles){text(line,100,y,38,block.item.name.trim()?'#272727':'#aaa298');y+=45}
  if(block.item.price!==''&&Number.isFinite(Number(block.item.price)))text('€ '+Number(block.item.price).toLocaleString('it-IT',{maximumFractionDigits:2}),1380,block.y,38,'#272727','normal','right');
  for(const line of block.descriptions){text(line,100,y,28,'#555');y+=34}
 }
 ctx.restore();ctx.strokeStyle='#802330';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(100,1950);ctx.lineTo(1380,1950);ctx.stroke();text('Per informazioni sugli allergeni chiedi al personale.',740,2005,25,'#555','normal','center');
 const filled=all.every(x=>x.name.trim()&&x.price.trim()!==''&&Number.isFinite(Number(x.price))&&Number(x.price)>=0&&Number(x.price)<=999);
 valid=!!(all.length&&goodDates&&data.end>=data.start&&filled&&plan.fits&&logo.complete&&logo.naturalWidth);
 let message='';
 if(!plan.fits)message='Troppi contenuti per una pagina A5. Elimina un piatto o abbrevia le descrizioni: il PDF è bloccato per evitare tagli e testi troppo piccoli.';
 else if(!all.length)message='Aggiungi almeno un piatto per creare il menu.';
 else if(!goodDates)message='Seleziona le date della settimana.';
 else if(data.end<data.start)message='La data finale deve essere successiva o uguale a quella iniziale.';
 else if(!filled)message='Completa nomi e prezzi oppure elimina i piatti che non servono.';
 else if(!(logo.complete&&logo.naturalWidth))message='Attendi il caricamento del logo. Se non compare, ricarica la pagina.';
 else message=plan.compact?'Menu pronto: spazi adattati per una sola pagina A5.':'Menu pronto: una sola pagina A5.';
 $('#download').disabled=!valid;$('#status').textContent=message;notice.textContent=message;notice.classList.toggle('error',!plan.fits);
}
function save(){try{localStorage.setItem(key,JSON.stringify(data))}catch(e){$('#status').textContent+=' Salvataggio non disponibile in questo browser.'}}
$('#fields').addEventListener('input',e=>{const el=e.target;if(el.dataset.k){data.sections[el.dataset.group][Number(el.dataset.i)][el.dataset.k]=el.value;draw();save()}});
$('#fields').addEventListener('click',e=>{const add=e.target.closest('[data-add]'),remove=e.target.closest('[data-remove]');
 if(add){const id=add.dataset.add;data.sections[id].push(emptyDish());renderFields();draw();save();const inputs=$('#fields').querySelectorAll(`input[data-group="${id}"][data-k="name"]`);inputs[inputs.length-1].focus()}
 if(remove){const id=remove.dataset.remove,i=Number(remove.dataset.i),item=data.sections[id][i];if((item.name||item.price||item.desc)&&!confirm('Eliminare questo piatto dal menu?'))return;data.sections[id].splice(i,1);renderFields();draw();save()}
});
for(const k of ['start','end'])$('#'+k).addEventListener('input',e=>{data[k]=e.target.value;draw();save()});
$('#clear').onclick=()=>{if(confirm('Vuoi cancellare i nomi, i prezzi e le descrizioni di tutti i piatti?')){for(const g of groups)data.sections[g.id]=data.sections[g.id].map(emptyDish);renderFields();draw();save()}};
function pdfBlob(){const raw=atob(canvas.toDataURL('image/jpeg',.96).split(',')[1]),jpeg=Uint8Array.from(raw,c=>c.charCodeAt(0)),enc=new TextEncoder(),parts=[],offsets=[0];let len=0;const add=v=>{const b=typeof v==='string'?enc.encode(v):v;parts.push(b);len+=b.length};const obj=(id,s)=>{offsets[id]=len;add(`${id} 0 obj\n${s}\nendobj\n`)};add('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 419.527559 595.275591] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');offsets[4]=len;add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);add(jpeg);add('\nendstream\nendobj\n');const stream='q\n419.527559 0 0 595.275591 0 0 cm\n/Im0 Do\nQ\n';obj(5,`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream`);const pos=len;add('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)add(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF`);return new Blob(parts,{type:'application/pdf'})}
$('#download').onclick=()=>{if(!valid)return;const url=URL.createObjectURL(pdfBlob()),a=document.createElement('a');a.href=url;a.download=`Circolone-menu-${data.start}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)};draw();
