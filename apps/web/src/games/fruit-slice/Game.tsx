import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

const W = 420, H = 560, BEST_KEY = "wargo:fruit-slice-best";
type Item = { x:number; y:number; vx:number; vy:number; r:number; kind:"fruit"|"bomb"; hue:number; hit:boolean };
type World = { items:Item[]; score:number; lives:number; spawn:number; last:number; raf:number; over:boolean; trail:{x:number;y:number;life:number}[] };
function readBest(){try{return Math.max(0,Number(localStorage.getItem(BEST_KEY))||0)}catch{return 0}}
function makeWorld():World{return{items:[],score:0,lives:3,spawn:0,last:0,raf:0,over:false,trail:[]}}
export default function FruitSlice({onExit}:{onExit:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),world=useRef<World>(makeWorld()),pointer=useRef<{down:boolean;x:number;y:number}>({down:false,x:0,y:0});
 const [running,setRunning]=useState(false),[score,setScore]=useState(0),[best,setBest]=useState(readBest),[lives,setLives]=useState(3),[over,setOver]=useState(false);
 const start=useCallback(()=>{world.current=makeWorld();pointer.current.down=false;setScore(0);setLives(3);setOver(false);setRunning(true)},[]);
 const point=(event:PointerEvent<HTMLDivElement>)=>{const rect=event.currentTarget.getBoundingClientRect();return{x:(event.clientX-rect.left)*W/rect.width,y:(event.clientY-rect.top)*H/rect.height}};
 const sliceAt=useCallback((x:number,y:number)=>{
  const g=world.current;g.trail.push({x,y,life:.22});
  for(const item of g.items){if(item.hit)continue;const dx=item.x-x,dy=item.y-y;if(dx*dx+dy*dy<(item.r+16)*(item.r+16)){item.hit=true;if(item.kind==="bomb"){g.over=true;setRunning(false);setOver(true)}else{g.score+=1;setScore(g.score);if(g.score>readBest()){try{localStorage.setItem(BEST_KEY,String(g.score))}catch{/* Optional storage. */}setBest(g.score)}}}}
 },[]);
 useEffect(()=>{
  const el=canvas.current,ctx=el?.getContext("2d");if(!el||!ctx)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);el.width=W*dpr;el.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  const frame=(time:number)=>{
   const g=world.current,dt=Math.min((time-(g.last||time))/1000,.032);g.last=time;
   if(running&&!g.over){
    g.spawn-=dt;
    if(g.spawn<=0){const count=Math.random()<.22?3:2;for(let i=0;i<count;i++){const kind=Math.random()<.13?"bomb":"fruit";g.items.push({x:65+Math.random()*(W-130),y:H+35+i*22,vx:(Math.random()-.5)*150,vy:-650-Math.random()*130,r:kind==="bomb"?23:22+Math.random()*5,kind,hue:Math.floor(Math.random()*360),hit:false})}g.spawn=.68+Math.random()*.38}
    for(const item of g.items){item.x+=item.vx*dt;item.y+=item.vy*dt;item.vy+=850*dt}
    const missed=g.items.filter(item=>!item.hit&&item.kind==="fruit"&&item.y>H+item.r);
    if(missed.length){g.lives=Math.max(0,g.lives-missed.length);setLives(g.lives);g.items=g.items.filter(item=>!missed.includes(item));if(g.lives===0){g.over=true;setRunning(false);setOver(true)}}
    g.items=g.items.filter(item=>item.y<H+80&&!item.hit);
    g.trail=g.trail.filter(t=>{t.life-=dt;return t.life>0});
   }
   const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#172b4c");bg.addColorStop(1,"#10172d");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
   for(let i=0;i<32;i++){ctx.fillStyle="rgba(255,255,255,.12)";ctx.beginPath();ctx.arc((i*97)%W,(i*137)%H,1.3,0,Math.PI*2);ctx.fill()}
   for(const item of g.items){ctx.save();ctx.translate(item.x,item.y);if(item.kind==="bomb"){ctx.fillStyle="#20242e";ctx.beginPath();ctx.arc(0,0,item.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#f5a65b";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(7,-item.r+3);ctx.quadraticCurveTo(23,-item.r-15,17,-item.r-21);ctx.stroke();ctx.fillStyle="#ffcf70";ctx.beginPath();ctx.arc(17,-item.r-21,4,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle=`hsl(${item.hue} 82% 56%)`;ctx.beginPath();ctx.arc(0,0,item.r,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(255,255,255,.35)";ctx.beginPath();ctx.ellipse(-7,-8,6,10,-.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#8bd17c";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-item.r+2);ctx.lineTo(4,-item.r-7);ctx.stroke()}ctx.restore()}
   for(const t of g.trail){ctx.strokeStyle=`rgba(170,245,255,${Math.min(1,t.life*5)})`;ctx.lineWidth=5*t.life/.22;ctx.lineCap="round";ctx.beginPath();ctx.arc(t.x,t.y,2,0,Math.PI*2);ctx.stroke()}
   ctx.fillStyle="#fff";ctx.font="800 18px sans-serif";ctx.textAlign="left";ctx.fillText(`SCORE  ${g.score}`,18,32);ctx.textAlign="right";ctx.fillStyle="#ffb5bd";ctx.fillText("♥ ".repeat(g.lives),W-18,32);
   if(running)g.raf=requestAnimationFrame(frame);
  };
  world.current.raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(world.current.raf);
 },[running]);
 useEffect(()=>()=>cancelAnimationFrame(world.current.raf),[]);
 return <GameFrame title="Fruit Slice" onExit={onExit}>
  <div className="game-stats"><span>امتیاز <b>{score}</b></span><span>رکورد <b>{best}</b></span><span>جان <b>{lives}</b></span></div>
  <div className="fruit-slice-stage" onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);pointer.current.down=true;const p=point(event);pointer.current.x=p.x;pointer.current.y=p.y;sliceAt(p.x,p.y)}} onPointerMove={event=>{if(!pointer.current.down)return;const p=point(event);const dx=p.x-pointer.current.x,dy=p.y-pointer.current.y;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/9));for(let i=1;i<=steps;i++)sliceAt(pointer.current.x+dx*i/steps,pointer.current.y+dy*i/steps);pointer.current.x=p.x;pointer.current.y=p.y}} onPointerUp={()=>{pointer.current.down=false}} onPointerCancel={()=>{pointer.current.down=false}}>
   <canvas ref={canvas} aria-label="میدان بازی برش میوه"/>
  </div>
  <GameStartOverlay visible={!running} title={over?"بازی تمام شد!":"میوه‌ها را برش بزن"} description={over?`امتیازت ${score} بود. بمب یا از دست دادن سه میوه بازی را تمام می‌کند.`:"با کشیدن انگشت روی میوه‌ها امتیاز بگیر؛ به بمب‌ها دست نزن و میوه‌ها را از دست نده."} buttonLabel={over?"تلاش دوباره":"شروع بازی"} onStart={start}/>
  <p className="game-help">انگشتت را روی صفحه بکش تا میوه‌ها را ببری. برخورد با بمب فوراً بازی را تمام می‌کند.</p>
 </GameFrame>;
}
