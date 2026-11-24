(()=>{"use strict";
const $=id=>document.getElementById(id),cv=$("game"),ctx=cv.getContext("2d");
const COLORS=["#00E5FF","#FFD400","#B026FF","#FF2E7E"],TAU=Math.PI*2,HALF=Math.PI/2,G=1400,JUMP=420;
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mod=(a,n)=>((a%n)+n)%n,pick=a=>a[Math.floor(Math.random()*a.length)];
const store={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const MODES={classic:{lives:1,speed:1,gap:1},infinity:{lives:3,speed:.85,gap:1.1},hard:{lives:1,speed:1.35,gap:.8}};
const NOTES={classic:"One life. The pure neon climb.",infinity:"Three lives. A wrong color costs a life, not the run.",hard:"Faster spins and tighter gaps. One life."};
let w=0,h=0,dpr=1,last=0,clock=0,slow=false,pf={t:0,n:0};
let mode=store.get("oryvexMode","classic");if(!MODES[mode])mode="classic";
let state="start",score=0,runStars=0,lives=1,invuln=0,started=false,continueUsed=false,shake=0,camY=0,edge=0,lastType="",count=0;
let ball=null,obstacles=[],items=[],parts=[],waves=[],texts=[],bg=[];
let bank=+store.get("oryvexBank",0)||0,best={},reduce=store.get("oryvexReduce","false")==="true",fx=!reduce;
for(const m in MODES)best[m]=+store.get("oryvexBest_"+m,m==="classic"?store.get("oryvexBest",0):0)||0;
let soundOn=store.get("oryvexSound","true")!=="false",vibOn=store.get("oryvexVibration","true")!=="false",ac=null,toastT=0;

/* ---------- helpers: audio, haptics, ui ---------- */
function tone(f,d=.09,type="sine",v=.05,to){if(!soundOn)return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume();const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+d+.02)}catch(e){}}
const buzz=ms=>{if(vibOn&&navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}};
const today=()=>{const d=new Date();return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};
function toast(m){const el=$("toast");el.textContent=m;el.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove("show"),1800)}
function show(id){["startScreen","pauseScreen","gameOverScreen","settingsScreen","helpScreen"].forEach(s=>$(s).classList.toggle("hidden",s!==id))}
function setState(s){state=s;const p=s==="playing";$("hud").classList.toggle("hidden",!p);$("pauseBtn").classList.toggle("hidden",!p);$("tapHint").classList.toggle("hidden",!(p&&!started));show({start:"startScreen",paused:"pauseScreen",over:"gameOverScreen"}[s]||"")}
function updateHud(){const m=MODES[mode];$("hudScore").textContent=score;$("hudMode").textContent=mode.toUpperCase();$("hudLives").textContent=m.lives>1?"♥".repeat(Math.max(0,lives))+"♡".repeat(Math.max(0,m.lives-lives)):""}
function refreshHome(){$("homeBest").textContent=best[mode];$("bank").textContent=bank;$("modeNote").textContent=NOTES[mode];document.querySelectorAll(".mode").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));const c=store.get("oryvexDaily","")===today();$("dailyBtn").classList.toggle("done",c);$("dailyNote").textContent=c?"Daily reward claimed. Come back tomorrow.":"Daily reward ready: +10 ✦"}

/* ---------- layout ---------- */
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);w=window.innerWidth;h=window.innerHeight;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
 bg=[];for(let i=0;i<70;i++)bg.push({x:Math.random()*w,y:Math.random()*h,r:rand(.7,2),a:rand(.25,.85),l:[.08,.16,.3][i%3]});
 if(ball){ball.x=w/2;ball.hy=h*.7;for(const o of obstacles)o.x=w/2;camY=Math.min(camY,ball.y-h*.58)}else if(state==="start")menuDemo()}
function menuDemo(){obstacles=[];items=[];[[.1,.18,50],[.93,.46,64],[.08,.82,56],[.9,.1,34]].forEach(([fx_,fy,R],i)=>{const o=mk("ring",0);o.x=w*fx_;o.y=h*fy;o.R=R;o.ext=R+6;o.dir=i%2?1:-1;obstacles.push(o)});camY=0}

/* ---------- obstacles ---------- */
function mk(type,level){const R=clamp(w*.19,54,78),m=MODES[mode];
 const o={type,x:w/2,y:0,R,th:14,rot:rand(0,TAU),dir:Math.random()<.5?-1:1,off:Math.floor(rand(0,4)),spd:(.85+Math.min(level,14)*.045)*m.speed,scroll:rand(0,500),passed:false};
 if(type==="bars")o.th=16;
 o.ext={ring:R+6,double:R*1.05+6,windmill:R*1.1+6,square:R*1.05+6,triangle:R*1.15+6,bars:12}[type];return o}
function spawn(){const n=count++,level=Math.floor(n/2);
 const types=n<2?["ring"]:n<4?["ring","double"]:n<7?["ring","double","windmill"]:n<10?["ring","double","windmill","bars"]:["ring","double","windmill","bars","square","triangle"];
 let type=pick(types);if(type===lastType&&types.length>1)type=pick(types);lastType=type;
 const o=mk(type,level),gap=(n===0?60:rand(130,170))*MODES[mode].gap*clamp(1-level*.012,.8,1),prevEdge=edge;
 o.y=edge-gap-o.ext;edge=o.y-o.ext;obstacles.push(o);
 items.push({type:"star",x:w/2,y:type==="bars"?o.y-44:o.y,r:9,taken:false});
 if(n>=2&&Math.random()<.35)items.push({type:"orb",x:w/2,y:(prevEdge+o.y+o.ext)/2,r:11,taken:false})}
function ringsOf(o){if(o.type==="double"){const r=o.R*1.05;return[{r,rot:o.rot,off:o.off},{r:r*.62,rot:-o.rot+Math.PI/4,off:o.off+2}]}return[{r:o.R,rot:o.rot,off:o.off}]}
function segsOf(o){const s=[],x=o.x,y=o.y,R=o.R;
 if(o.type==="windmill")for(let i=0;i<4;i++){const a=o.rot+i*HALF,L=R*1.1;s.push({x1:x,y1:y,x2:x+Math.cos(a)*L,y2:y+Math.sin(a)*L,c:mod(i+o.off,4)})}
 else if(o.type==="square"||o.type==="triangle"){const n=o.type==="square"?4:3,rr=o.type==="square"?R*1.05:R*1.15,p=[];for(let i=0;i<n;i++){const a=o.rot+i*TAU/n-HALF;p.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr])}for(let i=0;i<n;i++){const q=p[(i+1)%n];s.push({x1:p[i][0],y1:p[i][1],x2:q[0],y2:q[1],c:mod(i+o.off,4)})}}
 return s}
const colorAt=(a,off)=>mod(Math.floor(mod(a,TAU)/HALF)+off,4);
const colorAtX=(o,x)=>mod(Math.floor((x-o.scroll)/(w*.3))+o.off,4);
function distSeg(px,py,s){const dx=s.x2-s.x1,dy=s.y2-s.y1,l=dx*dx+dy*dy,t=l?clamp(((px-s.x1)*dx+(py-s.y1)*dy)/l,0,1):0;return Math.hypot(px-(s.x1+t*dx),py-(s.y1+t*dy))}
function hits(o){const br=ball.r*.8,dx=ball.x-o.x,dy=ball.y-o.y;
 if(o.type==="bars")return Math.abs(dy)<o.th/2+br-1&&colorAtX(o,ball.x)!==ball.color;
 if(o.type==="ring"||o.type==="double"){const d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);for(const r of ringsOf(o))if(Math.abs(d-r.r)<o.th/2+br&&colorAt(a-r.rot,r.off)!==ball.color)return true;return false}
 for(const s of segsOf(o))if(s.c!==ball.color&&distSeg(ball.x,ball.y,s)<o.th/2+br)return true;return false}

/* ---------- effects ---------- */
function burst(x,y,c,n=22){if(!fx)n=Math.ceil(n/2);for(let i=0;i<n&&parts.length<260;i++){const a=rand(0,TAU),v=rand(70,320);parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.4,.85),max:.85,r:rand(1.8,4),c})}}
const wave=(x,y,c)=>{if(waves.length<12)waves.push({x,y,r:6,life:.45,c})};
const pop=(t,x,y,c)=>{if(texts.length<8)texts.push({t,x,y,life:.8,c})};
function fxUpdate(dt){for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.life-=dt}parts=parts.filter(p=>p.life>0);
 for(const a of waves){a.r+=170*dt;a.life-=dt}waves=waves.filter(a=>a.life>0);
 for(const t of texts){t.y-=40*dt;t.life-=dt}texts=texts.filter(t=>t.life>0);
 shake=Math.max(0,shake-dt*30);
 if(ball&&state==="playing"){ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>12)ball.trail.shift()}}

/* ---------- game flow ---------- */
function startGame(){ball={x:w/2,y:h*.7,hy:h*.7,vy:0,r:10,color:Math.floor(Math.random()*4),trail:[]};
 camY=0;obstacles=[];items=[];parts=[];waves=[];texts=[];score=0;runStars=0;lives=MODES[mode].lives;invuln=0;started=false;continueUsed=false;lastType="";count=0;edge=ball.y-130;
 updateHud();setState("playing");last=performance.now()}
function goHome(){ball=null;menuDemo();setState("start");refreshHome()}
function jump(){if(state!=="playing")return;if(!started){started=true;$("tapHint").classList.add("hidden")}ball.vy=-JUMP;tone(520,.07,"triangle",.04,700)}
function endRun(){const nb=score>best[mode];if(nb){best[mode]=score;store.set("oryvexBest_"+mode,score)}
 $("finalScore").textContent=score;$("bestScore").textContent=best[mode];$("newBest").classList.toggle("hidden",!(nb&&score>0));$("earned").textContent="+"+runStars+" ✦ earned · "+bank+" ✦ saved";
 const cb=$("continueBtn");cb.disabled=continueUsed||bank<5;cb.textContent=continueUsed?"CONTINUE USED":bank<5?"CONTINUE · NEED 5 ✦":"CONTINUE · 5 ✦";
 setState("over")}
function hurt(){if(state!=="playing")return;if(invuln>0)return;lives--;burst(ball.x,ball.y,COLORS[ball.color],28);shake=10;buzz(90);tone(180,.35,"sawtooth",.07,50);updateHud();
 if(lives<=0){endRun();return}invuln=1.5;ball.vy=-JUMP*.9}
function fell(){invuln=0;hurt();if(state==="playing"){ball.y=camY+h*.65;ball.vy=-JUMP}}
function switchColor(c){let n=Math.floor(Math.random()*3);if(n>=ball.color)n++;ball.color=n;burst(c.x,c.y,COLORS[n],18);wave(c.x,c.y,COLORS[n]);tone(660,.16,"sine",.05,1100);buzz(12);toast("COLOR SHIFT")}
function collect(){for(const c of items){if(c.taken)continue;if(Math.hypot(ball.x-c.x,ball.y-c.y)<ball.r+c.r+4){c.taken=true;
  if(c.type==="star"){score++;runStars++;bank++;store.set("oryvexBank",bank);burst(c.x,c.y,"#ffffff",10);wave(c.x,c.y,"#ffffff");pop("+1",c.x,c.y,"#fff");tone(980,.08,"sine",.04,1500);buzz(8)}else switchColor(c);updateHud()}}}
function phys(sd){for(const o of obstacles){o.rot+=o.dir*o.spd*sd;if(o.type==="bars")o.scroll=mod(o.scroll+o.dir*o.spd*70*sd,w*1.2)}
 if(!started){ball.y=ball.hy+Math.sin(clock*3)*4;return}
 ball.vy=Math.min(ball.vy+G*sd,1000);ball.y+=ball.vy*sd;
 const tg=ball.y-h*.58;if(tg<camY)camY+=(tg-camY)*Math.min(1,sd*14);
 if(ball.y-camY>h+ball.r*2){fell();return}
 invuln=Math.max(0,invuln-sd);
 for(const o of obstacles){
  if(invuln<=0&&Math.abs(ball.y-o.y)<o.ext+ball.r+2&&hits(o)){hurt();if(state!=="playing")return}
  if(!o.passed&&ball.y<o.y-o.ext){o.passed=true;tone(420+Math.min(score,40)*8,.05,"triangle",.025)}}
 collect()}
function stepWorld(dt){const n=Math.min(6,Math.ceil(dt/.011));for(let i=0;i<n&&state==="playing";i++)phys(dt/n);
 if(state!=="playing")return;
 while(edge>camY-h*.6)spawn();
 obstacles=obstacles.filter(o=>o.y-camY<h+260);items=items.filter(c=>!c.taken&&c.y-camY<h+140)}
function pause(){if(state!=="playing")return;setState("paused")}
function resume(){if(state!=="paused")return;setState("playing");last=performance.now()}

/* ---------- drawing ---------- */
function drawObstacle(o){const y=o.y-camY;if(y+o.ext<0||y-o.ext>h)return;const gl=fx?16:0;ctx.save();ctx.lineWidth=o.th;ctx.lineCap="butt";
 if(o.type==="bars"){const sw=w*.3,k0=Math.floor(-o.scroll/sw)-1,k1=Math.ceil((w-o.scroll)/sw)+1;
  for(let k=k0;k<=k1;k++){const c=COLORS[mod(k+o.off,4)],x=k*sw+o.scroll;ctx.fillStyle=c;ctx.shadowColor=c;ctx.shadowBlur=gl;ctx.fillRect(x,y-o.th/2,sw+.5,o.th);ctx.shadowBlur=0;ctx.fillStyle="rgba(255,255,255,.28)";ctx.fillRect(x,y-o.th/2,sw+.5,2.5)}}
 else if(o.type==="ring"||o.type==="double"){
  for(const r of ringsOf(o))for(let i=0;i<4;i++){const a0=r.rot+i*HALF,a1=a0+HALF,c=COLORS[mod(i+r.off,4)];
   ctx.lineWidth=o.th;ctx.strokeStyle=c;ctx.shadowColor=c;ctx.shadowBlur=gl;ctx.beginPath();ctx.arc(o.x,y,r.r,a0,a1);ctx.stroke();
   ctx.shadowBlur=0;ctx.lineWidth=2.5;ctx.strokeStyle="rgba(255,255,255,.24)";ctx.beginPath();ctx.arc(o.x,y,r.r-o.th/2+2.5,a0+.03,a1-.03);ctx.stroke()}}
 else{ctx.lineCap="round";ctx.lineJoin="round";
  for(const s of segsOf(o)){const c=COLORS[s.c];ctx.lineWidth=o.th;ctx.strokeStyle=c;ctx.shadowColor=c;ctx.shadowBlur=gl;ctx.beginPath();ctx.moveTo(s.x1,s.y1-camY);ctx.lineTo(s.x2,s.y2-camY);ctx.stroke();
   ctx.shadowBlur=0;ctx.lineWidth=2.5;ctx.strokeStyle="rgba(255,255,255,.26)";ctx.stroke()}}
 ctx.restore()}
function drawItem(c){const y=c.y-camY;if(y<-30||y>h+30)return;ctx.save();ctx.translate(c.x,y);
 if(c.type==="star"){const s=1+.12*Math.sin(clock*5+c.y);ctx.scale(s,s);ctx.rotate(clock*1.6);ctx.shadowColor="#fff";ctx.shadowBlur=fx?18:0;ctx.fillStyle="#fff";ctx.beginPath();for(let i=0;i<10;i++){const a=-HALF+i*Math.PI/5,r=i%2?c.r*.42:c.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill()}
 else{ctx.rotate(clock*1.4);ctx.lineWidth=4.5;for(let i=0;i<4;i++){ctx.strokeStyle=COLORS[i];ctx.shadowColor=COLORS[i];ctx.shadowBlur=fx?12:0;ctx.beginPath();ctx.arc(0,0,c.r,-HALF+i*HALF,-HALF+(i+1)*HALF-.1);ctx.stroke()}ctx.fillStyle="#fff";ctx.shadowBlur=0;ctx.beginPath();ctx.arc(0,0,3,0,TAU);ctx.fill()}
 ctx.restore()}
function drawBall(){const y=ball.y-camY,c=COLORS[ball.color];

 ctx.globalAlpha=invuln>0&&Math.floor(clock*14)%2?.35:1;

 ctx.shadowColor=c;ctx.shadowBlur=fx?16:0;ctx.fillStyle=c;ctx.beginPath();ctx.arc(ball.x,y,ball.r,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1}
function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);
 const hue=(228+score*1.5)%360,g=ctx.createRadialGradient(w/2,h*.35,10,w/2,h*.5,Math.max(w,h)*.85);
 g.addColorStop(0,"hsl("+hue+",55%,13%)");g.addColorStop(1,"hsl("+((hue+30)%360)+",70%,3.5%)");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.fillStyle="#bcd4ff";for(const s of bg){ctx.globalAlpha=s.a*(.65+.35*Math.sin(clock*2+s.x));ctx.fillRect(s.x,mod(s.y-camY*s.l,h),s.r,s.r)}ctx.globalAlpha=1;
 if(ball&&fx){const y=ball.y-camY,rg=ctx.createRadialGradient(ball.x,y,0,ball.x,y,170);rg.addColorStop(0,COLORS[ball.color]+"33");rg.addColorStop(1,"transparent");ctx.fillStyle=rg;ctx.fillRect(0,0,w,h)}
 if(shake>.1)ctx.translate(rand(-shake,shake),rand(-shake,shake));
 if(!ball)ctx.globalAlpha=.35;
 for(const o of obstacles)drawObstacle(o);ctx.globalAlpha=1;
 if(ball){for(const c of items)drawItem(c);drawBall()}
 for(const a of waves){ctx.globalAlpha=clamp(a.life/.45,0,1);ctx.strokeStyle=a.c;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(a.x,a.y-camY,a.r,0,TAU);ctx.stroke()}
 for(const p of parts){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y-camY,p.r,0,TAU);ctx.fill()}
 ctx.globalAlpha=1;ctx.font="800 16px system-ui,sans-serif";ctx.textAlign="center";
 for(const t of texts){ctx.globalAlpha=clamp(t.life/.5,0,1);ctx.fillStyle=t.c;ctx.fillText(t.t,t.x,t.y-camY-14)}ctx.globalAlpha=1}
function loop(now){const dt=Math.min((now-last)/1000||0,.05);last=now;clock+=dt;
 if(++pf.n>0)pf.t+=dt;if(pf.n===90){if(pf.t/90>.026)slow=true;pf.t=pf.n=0;fx=!reduce&&!slow}
 if(state==="playing")stepWorld(dt);else if(state==="start")for(const o of obstacles)o.rot+=o.dir*.4*dt;
 fxUpdate(dt);draw();requestAnimationFrame(loop)}

/* ---------- input & buttons ---------- */
cv.addEventListener("pointerdown",e=>{e.preventDefault();jump()},{passive:false});
addEventListener("keydown",e=>{
 if(["Space","ArrowUp","KeyW"].includes(e.code)){if(state==="playing"){e.preventDefault();jump()}else if(state==="start"&&!(document.activeElement&&document.activeElement.tagName==="BUTTON")&&!$("settingsScreen").offsetParent&&!$("helpScreen").offsetParent){e.preventDefault();startGame()}}
 if((e.code==="Escape"||e.code==="KeyP")&&state==="playing")pause();else if((e.code==="Escape"||e.code==="KeyP")&&state==="paused")resume()});
const on=(id,fn)=>$(id).addEventListener("click",fn);
on("playBtn",startGame);on("restartBtn",startGame);on("pauseRestartBtn",startGame);on("pauseBtn",pause);on("resumeBtn",resume);
on("pauseHomeBtn",goHome);on("gameOverHomeBtn",goHome);
on("continueBtn",()=>{if(state!=="over"||continueUsed||bank<5)return;bank-=5;store.set("oryvexBank",bank);continueUsed=true;
 const ty=camY+h*.62;obstacles=obstacles.filter(o=>Math.abs(o.y-ty)>o.ext+190);items=items.filter(c=>Math.abs(c.y-ty)>150);
 ball.y=ty;ball.vy=-JUMP;lives=Math.max(1,lives);invuln=1.4;started=true;updateHud();setState("playing");toast("5 ✦ SPENT. KEEP GOING");last=performance.now()});
on("settingsBtn",()=>show("settingsScreen"));on("helpBtn",()=>show("helpScreen"));on("settingsBackBtn",()=>show("startScreen"));on("helpBackBtn",()=>show("startScreen"));
$("soundToggle").checked=soundOn;$("vibrationToggle").checked=vibOn;$("reduceToggle").checked=reduce;
$("soundToggle").onchange=e=>{soundOn=e.target.checked;store.set("oryvexSound",soundOn)};
$("vibrationToggle").onchange=e=>{vibOn=e.target.checked;store.set("oryvexVibration",vibOn)};
$("reduceToggle").onchange=e=>{reduce=e.target.checked;fx=!reduce&&!slow;store.set("oryvexReduce",reduce)};
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;store.set("oryvexMode",mode);refreshHome()});
on("dailyBtn",()=>{if(store.get("oryvexDaily","")===today()){toast("ALREADY CLAIMED TODAY");return}store.set("oryvexDaily",today());bank+=10;store.set("oryvexBank",bank);refreshHome();toast("+10 ✦ DAILY REWARD")});
document.addEventListener("visibilitychange",()=>{if(document.hidden)pause()});addEventListener("blur",pause);
addEventListener("resize",resize);
resize();refreshHome();setState("start");last=performance.now();requestAnimationFrame(loop);
if("serviceWorker" in navigator&&location.protocol!=="file:")addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
})();
