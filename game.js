(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
const COLORS=["#00E5FF","#FFD400","#B026FF","#FF2E7E"];
const W=()=>innerWidth,H=()=>innerHeight;
let dpr=1,w=0,h=0,last=0,raf=0;
let state="start",mode="classic",score=0,best=+(localStorage.getItem("oryvexBest")||0),cameraY=0,worldTop=0;
let ball,obstacles=[],collectibles=[],particles=[],starsBg=[],spawnY=0,continueUsed=false;
let soundOn=localStorage.getItem("oryvexSound")!=="false",vibrationOn=localStorage.getItem("oryvexVibration")!=="false";
let audioCtx=null,toastTimer=0,runStart=0, dailyKey=localStorage.getItem("oryvexDaily")||"";
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function resize(){dpr=Math.min(devicePixelRatio||1,2);w=W();h=H();canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);starsBg=Array.from({length:65},()=>({x:Math.random()*w,y:Math.random()*h,r:rand(.5,1.8),a:rand(.15,.7)}));}
addEventListener("resize",resize);resize();
function show(id){["startScreen","pauseScreen","gameOverScreen","settingsScreen","helpScreen"].forEach(s=>$(s).classList.toggle("hidden",s!==id));}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),1700);}
function audio(freq=440,dur=.09,type="sine",vol=.045){if(!soundOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);}catch(e){}}
function vibrate(ms=20){if(vibrationOn&&navigator.vibrate)navigator.vibrate(ms);}
function updateHud(){$("hudScore").textContent=score;$("hudMode").textContent=mode.toUpperCase();}
function setState(s){state=s;const playing=s==="playing";$("hud").classList.toggle("hidden",!playing);$("pauseBtn").classList.toggle("hidden",!playing);if(s==="start")show("startScreen");}
function makeBall(){return {x:w/2,y:h*.72,vy:0,r:10,color:0,trail:[]};}
function startGame(){score=0;continueUsed=false;cameraY=0;worldTop=0;ball=makeBall();obstacles=[];collectibles=[];particles=[];spawnY=ball.y-170;for(let i=0;i<7;i++){spawnObstacle(spawnY);spawnY-=rand(190,235);}runStart=performance.now();updateHud();setState("playing");show("");jump();}
function jump(){if(state!=="playing")return;ball.vy=-Math.max(420,h*.72);audio(520,.055,"triangle",.035);}
function obstacleType(){let n=Math.floor(score/5);let pool=["ring","double","cross","bars","square","dots","triangle"];if(n<2)pool=["ring","cross","bars"];if(n<5)pool=["ring","double","cross","bars","square"];return pool[Math.floor(Math.random()*pool.length)];}
function spawnObstacle(y){let type=obstacleType(),o={type,x:w/2,y,r:rand(49,64),th:11,rot:rand(0,Math.PI*2),speed:rand(.55,1.0)*(Math.random()<.5?-1:1)*(1+Math.min(score,35)*.012),phase:rand(0,6),colorOffset:Math.floor(Math.random()*4),passed:false};obstacles.push(o);
 if(Math.random()<.83)collectibles.push({type:"star",x:w/2+rand(-22,22),y:y-rand(65,90),r:8,taken:false});
 if(Math.random()<.28)collectibles.push({type:"orb",x:w/2+rand(-25,25),y:y-rand(105,140),r:11,taken:false});
}
function segments(o,t){const seg=[];const add=(a,b,c)=>seg.push({a,b,c});
 if(o.type==="ring"||o.type==="dots"||o.type==="double"){const radii=o.type==="double"?[o.r,o.r*.66]:[o.r];for(let layer=0;layer<radii.length;layer++){let rr=radii[layer],rot=o.rot*(layer===0?1:-1)+ (layer?Math.PI/4:0);for(let i=0;i<4;i++){let a=rot+i*Math.PI/2+.09,b=a+Math.PI/2-.18;add({x:o.x+Math.cos(a)*rr,y:o.y+Math.sin(a)*rr},{x:o.x+Math.cos(b)*rr,y:o.y+Math.sin(b)*rr},(i+o.colorOffset+layer*2)%4);}}}
 else if(o.type==="cross"){for(let i=0;i<4;i++){let a=o.rot+i*Math.PI/2;add({x:o.x-Math.cos(a)*o.r,y:o.y-Math.sin(a)*o.r},{x:o.x+Math.cos(a)*o.r,y:o.y+Math.sin(a)*o.r},(i+o.colorOffset)%4);}}
 else if(o.type==="square"){let pts=[[-o.r,-o.r],[o.r,-o.r],[o.r,o.r],[-o.r,o.r],[-o.r,-o.r]].map(([x,y])=>rotate(x,y,o.rot));for(let i=0;i<4;i++)add({x:o.x+pts[i][0],y:o.y+pts[i][1]},{x:o.x+pts[i+1][0],y:o.y+pts[i+1][1]},(i+o.colorOffset)%4);}
 else if(o.type==="triangle"){let pts=[];for(let i=0;i<3;i++){let a=o.rot+i*2*Math.PI/3-Math.PI/2;pts.push({x:o.x+Math.cos(a)*o.r,y:o.y+Math.sin(a)*o.r});}for(let i=0;i<3;i++)add(pts[i],pts[(i+1)%3],(i+o.colorOffset)%4);}
 else if(o.type==="bars"){let shift=Math.sin(t*1.2+o.phase)*w*.16;let left=w*.12+shift,right=w*.88+shift,mid=(left+right)/2;for(let i=0;i<4;i++){let x1=left+(right-left)*i/4,x2=left+(right-left)*(i+1)/4;add({x:x1,y:o.y},{x:x2,y:o.y},(i+o.colorOffset)%4);}}
 return seg;
}
function rotate(x,y,a){return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];}
function distSeg(p,a,b){let dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));}
function hitTest(o,t){let p={x:ball.x,y:ball.y};for(const s of segments(o,t)){if(distSeg(p,s.a,s.b)<ball.r+o.th*.55){if(s.c!==ball.color)return true;}}
 if(o.type==="dots"){for(let i=0;i<4;i++){let a=o.rot+t*o.speed+i*Math.PI/2,dx=p.x-(o.x+Math.cos(a)*o.r),dy=p.y-(o.y+Math.sin(a)*o.r);if(Math.hypot(dx,dy)<ball.r+7&&((i+o.colorOffset)%4)!==ball.color)return true;}}
 return false;}
function burst(x,y,color,count=24){for(let i=0;i<count;i++){let a=rand(0,Math.PI*2),v=rand(70,310);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.35,.8),max:.8,r:rand(2,4),color});}}
function die(){if(state!=="playing")return;burst(ball.x,ball.y,COLORS[ball.color],27);audio(120,.35,"sawtooth",.07);vibrate(100);best=Math.max(best,score);localStorage.setItem("oryvexBest",best);$("finalScore").textContent=score;$("bestScore").textContent=best;$("continueBtn").disabled=continueUsed||score<5;$("continueBtn").style.opacity=$("continueBtn").disabled?".4":"1";setState("over");show("gameOverScreen");}
function changeColor(){let old=ball.color;let n=Math.floor(Math.random()*3);if(n>=old)n++;ball.color=n;burst(ball.x,ball.y,COLORS[n],14);audio(760,.12,"sine",.05);toast("COLOR SHIFT!");}
function collect(){for(const c of collectibles){if(c.taken)continue;if(Math.hypot(ball.x-c.x,ball.y-c.y)<ball.r+c.r+3){c.taken=true;if(c.type==="star"){score++;audio(980,.07,"sine",.035);burst(c.x,c.y,"#ffffff",9);}else changeColor();updateHud();}}}
function update(dt,now){if(state!=="playing")return;let t=now/1000;ball.vy+=1250*dt;ball.y+=ball.vy*dt;
 const target=ball.y-h*.60;if(target<cameraY)cameraY=target;
 if(ball.y-cameraY>h+ball.r){die();return;}
 if(ball.y<worldTop)worldTop=ball.y;
 for(const o of obstacles){o.rot+=o.speed*dt*(1+Math.min(score,40)*.006);let sy=o.y-cameraY;if(!o.passed&&ball.y<o.y+o.r+ball.r&&ball.y>o.y-o.r-ball.r){if(hitTest({...o,y:o.y},t)) {die();return;}}
 if(!o.passed&&ball.y<o.y-o.r){o.passed=true;score++;updateHud();}}
 collect();
 while(spawnY>cameraY-h*.55){spawnObstacle(spawnY);spawnY-=Math.max(mode==="hard"?125:145,rand(190,235)-Math.min(score,50)*.7-(mode==="hard"?18:0));}
 obstacles=obstacles.filter(o=>o.y-cameraY<h+180);collectibles=collectibles.filter(c=>!c.taken&&c.y-cameraY<h+100);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=360*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
 ball.trail.push({x:ball.x,y:ball.y-cameraY});if(ball.trail.length>8)ball.trail.shift();
}
function draw(){ctx.clearRect(0,0,w,h);let g=ctx.createRadialGradient(w*.5,h*.35,10,w*.5,h*.45,Math.max(w,h)*.8);g.addColorStop(0,"#11183a");g.addColorStop(1,"#050718");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 for(const s of starsBg){ctx.globalAlpha=s.a;ctx.fillStyle="#a9c8ff";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 if(ball){for(const o of obstacles)drawObstacle(o);for(const c of collectibles)drawCollectible(c);drawBall();}drawParticles();}
function drawObstacle(o){let t=performance.now()/1000;ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=o.th;for(const s of segments(o,t)){ctx.shadowBlur=18;ctx.shadowColor=COLORS[s.c];ctx.strokeStyle=COLORS[s.c];ctx.beginPath();ctx.moveTo(s.a.x,s.a.y-cameraY);ctx.lineTo(s.b.x,s.b.y-cameraY);ctx.stroke();ctx.shadowBlur=4;ctx.lineWidth=2;ctx.strokeStyle="#ffffff88";ctx.beginPath();ctx.moveTo(s.a.x,s.a.y-cameraY);ctx.lineTo(s.b.x,s.b.y-cameraY);ctx.stroke();ctx.lineWidth=o.th;}
 if(o.type==="dots"){for(let i=0;i<4;i++){let a=o.rot+i*Math.PI/2,x=o.x+Math.cos(a)*o.r,y=o.y+Math.sin(a)*o.r-cameraY;ctx.fillStyle=COLORS[(i+o.colorOffset)%4];ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=15;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();}}
 ctx.restore();}
function drawCollectible(c){let y=c.y-cameraY;if(y<-30||y>h+30)return;ctx.save();ctx.translate(c.x,y);if(c.type==="star"){ctx.rotate(performance.now()/600);ctx.shadowColor="#fff";ctx.shadowBlur=18;ctx.fillStyle="#fff";ctx.beginPath();for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,r=i%2?c.r*.42:c.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}else{ctx.rotate(performance.now()/700);for(let i=0;i<4;i++){ctx.strokeStyle=COLORS[i];ctx.lineWidth=4;ctx.shadowColor=COLORS[i];ctx.shadowBlur=12;ctx.beginPath();ctx.arc(0,0,c.r,-Math.PI/2+i*Math.PI/2,-Math.PI/2+(i+1)*Math.PI/2-.08);ctx.stroke();}ctx.fillStyle="#fff";ctx.shadowBlur=8;ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();}ctx.restore();}
function drawBall(){let y=ball.y-cameraY;for(let i=0;i<ball.trail.length;i++){let p=ball.trail[i];ctx.globalAlpha=(i+1)/ball.trail.length*.16;ctx.fillStyle=COLORS[ball.color];ctx.beginPath();ctx.arc(p.x,p.y,ball.r*(i+1)/ball.trail.length,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 let grad=ctx.createRadialGradient(ball.x-4,y-5,1,ball.x,y,ball.r*1.5);grad.addColorStop(0,"#fff");grad.addColorStop(.25,COLORS[ball.color]);grad.addColorStop(1,"#3224a0");ctx.shadowColor=COLORS[ball.color];ctx.shadowBlur=25;ctx.fillStyle=grad;ctx.beginPath();ctx.arc(ball.x,y,ball.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#ffffffcc";ctx.beginPath();ctx.ellipse(ball.x-3,y-4,3,2, -.5,0,Math.PI*2);ctx.fill();}
function drawParticles(){for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y-cameraY,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.shadowBlur=0;}
function loop(now){let dt=Math.min((now-last)/1000||0,.033);last=now;update(dt,now);draw();raf=requestAnimationFrame(loop);}
function action(){if(state==="playing")jump();}
canvas.addEventListener("pointerdown",e=>{e.preventDefault();action();},{passive:false});
addEventListener("keydown",e=>{if(["Space","ArrowUp","KeyW"].includes(e.code)){e.preventDefault();if(state==="playing")jump();else if(state==="start")startGame();}if(e.code==="Escape"&&state==="playing")pause();});
function pause(){if(state!=="playing")return;setState("paused");show("pauseScreen");}
$("playBtn").onclick=startGame;$("pauseBtn").onclick=pause;$("resumeBtn").onclick=()=>{setState("playing");show("");last=performance.now();};
$("restartBtn").onclick=startGame;$("pauseHomeBtn").onclick=()=>{setState("start");show("startScreen");};$("gameOverHomeBtn").onclick=()=>{setState("start");show("startScreen");};
$("continueBtn").onclick=()=>{if(continueUsed||score<5)return;continueUsed=true;score=Math.max(0,score-5);ball.vy=-Math.max(420,h*.72);ball.y=Math.min(ball.y,cameraY+h*.72);setState("playing");show("");toast("5 STARS SPENT — KEEP GOING");last=performance.now();};
$("settingsBtn").onclick=()=>show("settingsScreen");$("helpBtn").onclick=()=>show("helpScreen");$("settingsBackBtn").onclick=()=>show("startScreen");$("helpBackBtn").onclick=()=>show("startScreen");
$("soundToggle").checked=soundOn;$("vibrationToggle").checked=vibrationOn;
$("soundToggle").onchange=e=>{soundOn=e.target.checked;localStorage.setItem("oryvexSound",soundOn);};$("vibrationToggle").onchange=e=>{vibrationOn=e.target.checked;localStorage.setItem("oryvexVibration",vibrationOn);};
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{document.querySelectorAll(".mode").forEach(x=>x.classList.remove("active"));b.classList.add("active");mode=b.dataset.mode;});
$("dailyBtn").onclick=()=>{let today=new Date().toISOString().slice(0,10);if(dailyKey===today){toast("DAILY REWARD ALREADY CLAIMED");return;}dailyKey=today;localStorage.setItem("oryvexDaily",today);best+=3;localStorage.setItem("oryvexBest",best);$("dailyNote").textContent="Daily reward claimed: +3 bonus best-score stars!";toast("DAILY REWARD CLAIMED");};
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state==="playing")pause();});
setState("start");show("startScreen");last=performance.now();raf=requestAnimationFrame(loop);
if("serviceWorker" in navigator&&location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));}
})();