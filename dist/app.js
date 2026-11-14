'use strict';
const $ = s => document.querySelector(s);
const colors = ['#31883c', '#8aa650', '#788b95'];
const short = ['Tas carrier', 'Tenda camping', 'Sepatu hiking'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (v,n=1) => Number(v).toLocaleString('en-US',{minimumFractionDigits:n,maximumFractionDigits:n});
const date = s => new Date(s+'T00:00:00Z');
const labelDate = s => date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const tinyDate = s => date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const svg = (w,h,body,label) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-label="${esc(label)}">${body}</svg>`;
const text = (x,y,t,opt='') => `<text x="${x}" y="${y}" fill="#899182" font-size="9" ${opt}>${esc(t)}</text>`;
const path = pts => pts.filter(p=>p!==null).map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
let report, active = new Set([0,1,2]);
const tip = $('#chart-tip');
function showTip(html,x,y){
 tip.innerHTML=html;tip.hidden=false;
 const box=tip.getBoundingClientRect();
 tip.style.left=Math.max(12,Math.min(innerWidth-box.width-12,x+14))+'px';
 tip.style.top=Math.max(12,Math.min(innerHeight-box.height-12,y-box.height-12))+'px';
}
function hideTip(){tip.hidden=true;}
function chartInteraction(element, count, formatter, l, r, width){
 let selected=count-1;
 element.tabIndex=0;
 element.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Escape');
 const point=(i,event)=>{
  selected=Math.max(0,Math.min(count-1,i));const box=element.getBoundingClientRect();
  const x=event?.clientX ?? box.left+(l+(width-l-r)*selected/Math.max(1,count-1))*box.width/width;
  const y=event?.clientY ?? box.top+box.height*.6;
  showTip(formatter(selected),x,y);
 };
 element.onpointermove=e=>{const box=element.getBoundingClientRect();const x=(e.clientX-box.left)*width/box.width;point(Math.round((x-l)/(width-l-r)*(count-1)),e);};
 element.onpointerdown=element.onpointermove;
 element.onpointerleave=()=>{if(document.activeElement!==element)hideTip();};element.onblur=hideTip;
 element.onfocus=()=>point(selected);
 element.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();point(selected+(e.key==='ArrowRight'?1:-1));}if(e.key==='Escape')hideTip();};
}
function size(id){return Math.max(280,Math.round($(id).clientWidth));}
function axes(w,h,max,labels,ticks=4){
 const l=w<430?32:43,r=14,t=18,b=36,pw=w-l-r,ph=h-t-b;
 let body='';
 for(let i=0;i<=ticks;i++){const v=max*i/ticks,y=t+ph-ph*i/ticks;body+=`<line x1="${l}" y1="${y}" x2="${w-r}" y2="${y}" stroke="#edf0e8"/>`+text(l-7,y+3,num(v,max>10?0:1),'text-anchor="end"');}
 for(const [i,lab] of labels)body+=text(l+pw*i,t+ph+21,lab,'text-anchor="middle"');
 return {l,r,t,b,pw,ph,body,x:i=>l+pw*i,y:v=>t+ph-v/max*ph};
}
function renderMarket(){
 const el=$('#market-chart'),w=size('#market-chart'),h=285,m=report.market;
 const a=axes(w,h,2000,[],4);const bw=a.pw/8*.64;
 let body=`<defs><pattern id="forecast-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ecf4e5"/><line x1="0" x2="0" y2="6" stroke="#a5c891" stroke-width="2"/></pattern></defs>`+a.body;
 m.years.forEach((yr,i)=>{const v=m.usdMillions[i],x=a.l+a.pw*(i+.5)/8,y=a.y(v),f=yr>=m.forecastFrom;
  body+=`<rect x="${x-bw/2}" y="${y}" width="${bw}" height="${a.y(0)-y}" rx="1" fill="${f?'url(#forecast-hatch)':'#31883c'}" ${f?'stroke="#a2bf91" stroke-width=".5"':''}/>`;
  body+=text(x,y-8,w<450?num(v/1000,2):num(v,0),'text-anchor="middle" fill="#44723d" font-size="9"');
  body+=text(x,a.y(0)+20,yr+(f?'F':''),'text-anchor="middle"');
 });
 if(w<450)body+=text(a.l,9,'Bar labels in US$bn','text-anchor="start" font-size="8"');
 el.innerHTML=svg(w,h,body,'Outdoor market estimates with published forecasts');
 chartInteraction(el,8,i=>`<strong>${m.years[i]}${i>=5?' · published forecast':' · historical estimate'}</strong><div>US$${num(m.usdMillions[i],1)} million</div><div>Frost & Sullivan · 2023 publication</div>`,a.l,a.r,w);
}
function renderMetrics(){
 $('#signal-metrics').innerHTML=report.series.map((s,i)=>`<article class="signal-metric"><h3>${esc(s.name)}</h3><strong class="change ${s.change>=0?'up':'down'}">${s.change>=0?'+':'−'}${num(Math.abs(s.change))}%</strong><p>Jan–Oct 2026 vs 2025<br><strong>${num(s.ytd2026,2)}</strong> vs ${num(s.ytd2025,2)} index</p></article>`).join('');
 $('#shoe-change').textContent=num(report.series[2].change)+'%';$('#carrier-change').textContent=num(Math.abs(report.series[0].change))+'%';$('#tent-change').textContent=num(Math.abs(report.series[1].change))+'%';
 $('#trend-legend').innerHTML=short.map((s,i)=>`<button type="button" data-series="${i}" aria-pressed="${active.has(i)}"><i style="--color:${colors[i]}"></i>${esc(s)}</button>`).join('');
 $('#trend-legend').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.series);active.has(i)?active.delete(i):active.add(i);b.setAttribute('aria-pressed',String(active.has(i)));renderTrend();}));
}
function renderTrend(){
 const el=$('#trend-chart'),w=size('#trend-chart'),h=w<450?240:295;
 const rows=report.weekly.filter(r=>r.date<report.excludedWeekStart),n=rows.length,smooth=$('#smooth').checked;
 const values=rows.map((r,i)=>r.values.map((v,c)=>smooth?(i<3?null:rows.slice(i-3,i+1).reduce((s,a)=>s+a.values[c],0)/4):v));
 const labels=rows.flatMap((r,i)=>date(r.date).getUTCMonth()===0&&(i===0||date(rows[i-1].date).getUTCMonth()!==0)?[[i/(n-1),date(r.date).getUTCFullYear()]]:[]);
 const a=axes(w,h,100,labels,4);let body=a.body;
 for(const c of active){const pts=values.map((v,i)=>v[c]===null?null:[a.x(i/(n-1)),a.y(v[c])]);body+=`<path d="${path(pts)}" fill="none" stroke="${colors[c]}" stroke-width="${c===0?2:1.8}" stroke-linejoin="round"/>`;}
 if(!active.size)body+=text(w/2,h/2,'Select a product search above.','text-anchor="middle"');
 el.innerHTML=svg(w,h,body,'Search-interest comparison, 0 to 100 relative index');
 chartInteraction(el,n,i=>`<strong>Week of ${labelDate(rows[i].date)}</strong>${[...active].map(c=>`<div class="tip-row"><span>${short[c]}</span><b>${values[i][c]===null?'—':num(values[i][c],1)}</b></div>`).join('')}<small>${smooth?'4-week mean':'Weekly index'}</small>`,a.l,a.r,w);
}
function renderSeasonality(){
 $('#season-table').innerHTML='<thead><tr><th scope="col">Search term</th>'+months.map(m=>`<th scope="col">${m}</th>`).join('')+'</tr></thead><tbody>'+report.series.map(s=>'<tr><th scope="row">'+esc(s.name)+'</th>'+s.seasonality.map((v,m)=>{const t=Math.max(0,Math.min(1,(v-60)/65));const light=96-t*57;return `<td style="background:hsl(114 31% ${light}%)" class="${light<52?'strong':''}" title="${esc(s.name)}, ${months[m]}: ${num(v,1)} relative to a yearly average of 100">${num(v,0)}</td>`;}).join('')+'</tr>').join('')+'</tbody>';
 $('#december-index').textContent=num(report.series[1].seasonality[11],0);
}
function renderForecast(){
 const c=report.series.findIndex(s=>s.key===$('#forecast-category').value),s=report.series[c],el=$('#forecast-chart'),w=size('#forecast-chart'),h=w<450?245:290;
 const history=report.weekly.filter(r=>r.date<report.excludedWeekStart).slice(-52),n=64;
 const max=Math.ceil(Math.max(...history.map(r=>r.values[c]),...s.upper)/10)*10;
 const ds=[...history.map(r=>r.date),...report.forecastDates];
 const tickIndices=w<450?[0,20,40,63]:[0,13,26,39,51,63];
 const a=axes(w,h,max,tickIndices.map(i=>[i/(n-1),tinyDate(ds[i])]),4);
 let body=a.body;const x=i=>a.x(i/(n-1));
 const lower=s.lower.map((v,i)=>[x(52+i),a.y(v)]),upper=s.upper.map((v,i)=>[x(52+i),a.y(v)]);
 body+=`<path d="${path(upper)} ${lower.slice().reverse().map(p=>'L'+p.join(',')).join(' ')} Z" fill="#dcecd6" opacity=".9"/>`;
 body+=`<line x1="${x(51)}" y1="${a.t}" x2="${x(51)}" y2="${a.y(0)}" stroke="#a5baa0" stroke-dasharray="3 4"/>`;
 body+=`<path d="${path(history.map((r,i)=>[x(i),a.y(r.values[c])]))}" stroke="#788a7e" stroke-width="1.8" fill="none"/>`;
 body+=`<path d="${path([[x(51),a.y(history[51].values[c])],...s.forecast.map((v,i)=>[x(52+i),a.y(v)])])}" stroke="#31883c" stroke-width="2.2" stroke-dasharray="5 3" fill="none"/>`;
 body+=text(x(51)-6,a.t+9,'Outlook','text-anchor="end" font-size="8" fill="#31883c"');
 el.innerHTML=svg(w,h,body,s.name+' observed search interest and outlook');
 chartInteraction(el,n,i=>`<strong>Week of ${labelDate(ds[i])}</strong>`+(i<52?`<div class="tip-row"><span>Observed index</span><b>${num(history[i].values[c])}</b></div>`:`<div class="tip-row"><span>Forecast index</span><b>${num(s.forecast[i-52])}</b></div><div class="tip-row"><span>Error range</span><b>${num(s.lower[i-52])}–${num(s.upper[i-52])}</b></div><small>Empirical development-error range</small>`),a.l,a.r,w);
 $('#forecast-title').textContent=s.name+' · 12-week outlook';$('#model-label').textContent='Selected: '+s.selected;
 $('#test-mae').textContent=num(s.testMae,2);$('#baseline-mae').textContent=num(s.seasonalBaselineTestMae,2);$('#test-coverage').textContent=num(s.testRangeCoverage*100,0)+'%';$('#coverage-count').textContent=Math.round(s.testRangeCoverage*12)+' of 12 held-out observations';
 const improvement=(1-s.testMae/s.seasonalBaselineTestMae)*100;
 $('#forecast-reading').textContent=s.selected.startsWith('Seasonal')?'The seasonal baseline was selected during development. A more complex model did not earn its place. Treat its repeated prior-year pattern as a starting point for planning; the error range covered only '+Math.round(s.testRangeCoverage*12)+' of 12 held-out observations.':`The selected model’s locked-holdout MAE was ${num(improvement,1)}% lower than the seasonal baseline. Its error range covered ${Math.round(s.testRangeCoverage*12)} of 12 held-out observations, so the shaded band should not be treated as a reliable probability guarantee.`;
 $('#model-table').innerHTML='<thead><tr><th>Candidate method</th><th>Development MAE</th><th>Selection</th></tr></thead><tbody>'+Object.entries(s.developmentMae).map(([m,v])=>`<tr><td>${esc(m)}</td><td>${num(v,2)}</td><td>${m===s.selected?'Selected':'—'}</td></tr>`).join('')+'</tbody>';
}
function renderAll(){renderMarket();renderTrend();renderSeasonality();renderForecast();}
const contents=$('#contents'),contentsButton=$('#contents-button');
function closeContents(){contents.hidden=true;contentsButton.setAttribute('aria-expanded','false');}
contentsButton.addEventListener('click',()=>{const open=contents.hidden;contents.hidden=!open;contentsButton.setAttribute('aria-expanded',String(open));});
contents.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeContents));
document.addEventListener('click',e=>{if(!contents.contains(e.target)&&!contentsButton.contains(e.target))closeContents();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeContents();hideTip();}});
$('#print-button').addEventListener('click',()=>window.print());
function progress(){const max=document.documentElement.scrollHeight-innerHeight;$('#reading-progress').style.width=(max>0?scrollY/max*100:0)+'%';}
addEventListener('scroll',()=>{progress();if(!document.activeElement?.classList.contains('chart'))hideTip();},{passive:true});
const chapterObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)document.querySelectorAll('.chapter-rail a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));},{rootMargin:'-15% 0px -60% 0px'});
document.querySelectorAll('.report-section').forEach(s=>chapterObserver.observe(s));
fetch('data/analysis.json').then(r=>{if(!r.ok)throw Error('Report data unavailable');return r.json();}).then(data=>{
 report=data;renderMetrics();renderAll();progress();
 $('#smooth').addEventListener('change',renderTrend);$('#forecast-category').addEventListener('change',()=>{hideTip();renderForecast();});
 let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>{renderAll();progress();},100);});
 document.fonts.ready.then(renderAll);
}).catch(e=>{console.error('Report could not load',e);$('#load-error').hidden=false;});
