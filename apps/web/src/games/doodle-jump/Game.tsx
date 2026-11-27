import { useCallback, useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

const BEST_KEY="wargo:doodle-best";
const W=420,H=620;
type Platform={x:number;y:number;w:number;kind:"normal"|"spring"};
type World={x:number;y:number;vy:number;camera:number;platforms:Platform[];score:number;last:number;raf:number;over:boolean};
function readBest(){try{return Math.max(0,Number(localStorage.getItem(BEST_KEY))||0)}catch{return 0}}
function makeWorld():World{
 const platforms:Platform[]=[{x:160,y:555,w:100,kind:"normal"}];
 for(let i=0;i<9;i++)platforms.push({x:Math.random()*330,y:490-i*66,w:68+Math.random()*24,kind:i===5?"spring":"normal"});
 return{x:190,y:510,vy:-520,camera:0,platforms,score:0,last:0,raf:0,over:false};
}
export default function DoodleJump({onExit}:{onExit:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),world=useRef<World>(makeWorld()),keys=useRef({left:false,right:false});
 const [running,setRunning]=useState(false),[score,setScore]=useState(0),[best,setBest]=useState(readBest),[over,setOver]=useState(false);
 const reportedScore=useRef(0);
 const start=useCallback(()=>{world.current=makeWorld();keys.current={left:false,right:false};reportedScore.current=0;setScore(0);setOver(false);setRunning(true)},[]);
 const setDirection=(side:"left"|"right",value:boolean)=>{keys.current[side]=value};
 useEffect(()=>{
  const c=canvas.current,ctx=c?.getContext("2d");if(!c||!ctx)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);c.width=W*dpr;c.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  const frame=(t:number)=>{
   const g=world.current,dt=Math.min((t-(g.last||t))/1000,.032);g.last=t;
   if(running&&!g.over){
    const dir=(keys.current.right?1:0)-(keys.current.left?1:0);g.x+=dir*300*dt;if(g.x<-18)g.x=W+18;if(g.x>W+18)g.x=-18;
    const oldY=g.y;g.vy+=1250*dt;g.y+=g.vy*dt;
    if(g.y< H*.42&&g.vy<0){const shift=H*.42-g.y;g.y=H*.42;g.camera+=shift;g.score=Math.max(g.score,Math.floor(g.camera/10));}
    if(g.vy>0){for(const p of g.platforms){const screenY=p.y-g.camera;if(oldY+20<=screenY&&g.y+20>=screenY&&g.x+17>p.x&&g.x-17<p.x+p.w){g.y=screenY-20;g.vy=p.kind==="spring"?-900:-650;break;}}}
    for(const p of g.platforms){if(p.y-g.camera<-30){p.y+=660+Math.random()*45;p.x=12+Math.random()*(W-p.w-24);p.kind=Math.random()<.12?"spring":"normal";}}
    if(g.score>reportedScore.current){reportedScore.current=g.score;setScore(g.score);setBest(b=>{if(g.score>b){try{localStorage.setItem(BEST_KEY,String(g.score))}catch{/* Optional storage. */}return g.score;}return b;});}
    if(g.y>H+35){g.over=true;setRunning(false);setOver(true);}
   }
   const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#102846");bg.addColorStop(1,"#142039");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
   // Soft clouds and stars
   for(let i=0;i<7;i++){const x=(i*79+25)%W,y=(i*113+30-(g.camera*.16)%700+700)%700;ctx.fillStyle="rgba(164,218,255,.08)";ctx.beginPath();ctx.ellipse(x,y,34,10,0,0,Math.PI*2);ctx.fill();}
   for(const p of g.platforms){const y=p.y-g.camera;if(y<-20||y>H+20)continue;ctx.fillStyle=p.kind==="spring"?"#f6c65b":"#65d6a2";ctx.shadowColor=p.kind==="spring"?"rgba(246,198,91,.35)":"rgba(101,214,162,.25)";ctx.shadowBlur=12;ctx.beginPath();ctx.roundRect(p.x,y,p.w,12,6);ctx.fill();ctx.shadowBlur=0;if(p.kind==="spring"){ctx.strokeStyle="#fff0b0";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x+p.w/2,y);ctx.lineTo(p.x+p.w/2-5,y-10);ctx.lineTo(p.x+p.w/2+5,y-16);ctx.lineTo(p.x+p.w/2,y-22);ctx.stroke();}}
   // Character
   const py=g.y,px=g.x;ctx.save();ctx.translate(px,py);
   ctx.shadowColor="rgba(89,224,255,.45)";ctx.shadowBlur=15;ctx.fillStyle="#79e3ff";ctx.beginPath();ctx.roundRect(-17,-18,34,37,11);ctx.fill();ctx.shadowBlur=0;
   ctx.fillStyle="#102039";ctx.beginPath();ctx.arc(-6,-5,3,0,Math.PI*2);ctx.arc(7,-5,3,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle="#102039";ctx.lineWidth=2;ctx.beginPath();ctx.arc(1,3,6,.2,Math.PI-.2);ctx.stroke();
   ctx.fillStyle="#f3b77b";ctx.fillRect(-22,12,10,6);ctx.fillRect(12,12,10,6);ctx.restore();
   ctx.fillStyle="#eaf5ff";ctx.font="800 18px sans-serif";ctx.textAlign="left";ctx.fillText(String(g.score).padStart(5,"0"),18,30);
   if(running)g.raf=requestAnimationFrame(frame);
  };
  world.current.raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(world.current.raf);
 },[running]);
 useEffect(()=>()=>cancelAnimationFrame(world.current.raf),[]);
 useEffect(()=>{
  const down=(e:KeyboardEvent)=>{if(e.code==="ArrowLeft"||e.code==="KeyA"){keys.current.left=true;e.preventDefault()}if(e.code==="ArrowRight"||e.code==="KeyD"){keys.current.right=true;e.preventDefault()}};
  const up=(e:KeyboardEvent)=>{if(e.code==="ArrowLeft"||e.code==="KeyA")keys.current.left=false;if(e.code==="ArrowRight"||e.code==="KeyD")keys.current.right=false};
  window.addEventListener("keydown",down);window.addEventListener("keyup",up);return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)};
 },[]);
 return <GameFrame title="پرش بی‌پایان" onExit={onExit}>
  <div className="game-stats"><span>ارتفاع <b>{score}</b></span><span>رکورد <b>{best}</b></span></div>
  <div className="doodle-stage" onPointerDown={e=>{const r=e.currentTarget.getBoundingClientRect();setDirection(e.clientX<r.left+r.width/2?"left":"right",true)}} onPointerUp={()=>{setDirection("left",false);setDirection("right",false)}} onPointerCancel={()=>{setDirection("left",false);setDirection("right",false)}} onPointerLeave={()=>{setDirection("left",false);setDirection("right",false)}}>
   <canvas ref={canvas} aria-label="بازی پرش بی‌پایان"/>
   <div className="doodle-touch-hints" aria-hidden="true"><span>◀</span><span>▶</span></div>
  </div>
  <GameStartOverlay visible={!running} title={over?"از سکو افتادی!":"بپر و بالاتر برو"} description={over?`ارتفاع ثبت‌شده: ${score}. یک بار دیگر رکوردت را بهتر کن.`:"روی نیمه چپ یا راست صفحه نگه دار تا حرکت کنی؛ روی سکوها فرود بیا."} buttonLabel={over?"تلاش دوباره":"شروع بازی"} onStart={start}/>
  <p className="game-help">موبایل: نیمه چپ یا راست میدان را نگه دار · رایانه: کلیدهای ← و → یا A و D</p>
 </GameFrame>;
}
