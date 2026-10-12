/* Independent, illustrative 3D chamber viewer. This is a browser-side
 * kinematic visualization, not a hardware interface or a collision solver. */
(() => {
  'use strict';
  const canvas = document.querySelector('#robot-3d-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const controls = ['yaw', 'shoulder', 'elbow', 'wrist', 'twist', 'grip'];
  const ranges = Object.fromEntries(controls.map(name => [name, document.getElementById('r3d-' + name)]));
  const status = document.getElementById('robot-3d-status');
  const presets = Array.from(document.querySelectorAll('[data-3d-pose]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const configurations = {
    home:    {yaw:45, shoulder:0, elbow:85, wrist:-60, twist:0, grip:35},
    floor:   {yaw:45, shoulder:0, elbow:72, wrist:-60, twist:0, grip:10},
    inspect: {yaw:-45,shoulder:-10,elbow:110,wrist:-60,twist:20,grip:65},
    park:    {yaw:45, shoulder:0, elbow:110, wrist:-60,twist:0, grip:30}
  };
  const pose = {...configurations.home};
  let azimuth=-43, elevation=23, width=600, height=460, animation=null;
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const radians=d=>d*Math.PI/180;
  const vec=(x,y,z)=>({x,y,z});
  const interpolate=(a,b,t)=>vec(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);
  const cssColor=(name)=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const length1=18.5,length2=18.5,toolLength=8.5,baseHeight=3,chamber=36;
  function fit(){
    const bounds=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    width=Math.max(220,bounds.width||540);height=Math.max(220,bounds.height||420);
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h}
    ctx.setTransform(dpr,0,0,dpr,0,0);
    render();
  }
  function project(v){
    const a=radians(azimuth),e=radians(elevation);
    const centered=vec(v.x,v.y,v.z-chamber/2);
    const right=vec(Math.cos(a),-Math.sin(a),0);
    const up=vec(Math.sin(a)*Math.sin(e),Math.cos(a)*Math.sin(e),Math.cos(e));
    const forward=vec(Math.sin(a)*Math.cos(e),Math.cos(a)*Math.cos(e),-Math.sin(e));
    const px=centered.x*right.x+centered.y*right.y;
    const py=centered.x*up.x+centered.y*up.y+centered.z*up.z;
    const depth=centered.x*forward.x+centered.y*forward.y+centered.z*forward.z;
    const scale=Math.min(width/74,height/66)*70/(70-depth*.35);
    return {x:width/2+px*scale,y:height/2-py*scale,depth};
  }
  function segment(a,b,color,lineWidth=1,dash=[]){
    const p=project(a),q=project(b);ctx.beginPath();ctx.setLineDash(dash);
    ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
    ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();ctx.setLineDash([]);
  }
  function circle(p,r,fill,stroke){
    const q=project(p);
    ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);
    ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}
  }
  function label(p,text,color='#e5dbe8'){
    const q=project(p);ctx.fillStyle=color;ctx.font='600 11px system-ui, sans-serif';
    ctx.fillText(text,q.x+9,q.y-8);
  }
  function pointAt(start,pitch,len,yaw){
    const plane=radians(pitch),rotation=radians(yaw);
    return vec(start.x+len*Math.sin(plane)*Math.cos(rotation),
      start.y+len*Math.sin(plane)*Math.sin(rotation),
      start.z-len*Math.cos(plane));
  }
  function getJoints(){
    const ceiling=vec(0,0,chamber),shoulder=vec(0,0,chamber-baseHeight);
    const elbow=pointAt(shoulder,pose.shoulder,length1,pose.yaw);
    const wrist=pointAt(elbow,pose.shoulder+pose.elbow,length2,pose.yaw);
    const tip=pointAt(wrist,pose.shoulder+pose.elbow+pose.wrist,toolLength,pose.yaw);
    return [ceiling,shoulder,elbow,wrist,tip];
  }
  function isInside(p){
    const eps=.0001;
    return Math.abs(p.x)<=chamber/2+eps && Math.abs(p.y)<=chamber/2+eps
      && p.z>=-eps && p.z<=chamber+eps;
  }
  function render(){
    if(!width||!height) return;
    ctx.clearRect(0,0,width,height);
    const corners=[];
    for(const z of [0,chamber])for(const y of [-18,18])for(const x of [-18,18])corners.push(vec(x,y,z));
    const floorA=vec(-18,-18,0),floorB=vec(18,-18,0),floorC=vec(18,18,0),floorD=vec(-18,18,0);
    const floor=[floorA,floorB,floorC,floorD].map(project);
    ctx.beginPath();ctx.moveTo(floor[0].x,floor[0].y);
    floor.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle='rgba(145,110,157,.15)';ctx.fill();
    for(let n=-12;n<=12;n+=6){
      segment(vec(n,-18,0),vec(n,18,0),'rgba(202,183,219,.14)');
      segment(vec(-18,n,0),vec(18,n,0),'rgba(202,183,219,.14)');
    }
    for(const x of [-18,18])for(const y of [-18,18])
      segment(vec(x,y,0),vec(x,y,36),'rgba(195,188,224,.46)',1.25,[5,4]);
    for(const z of [0,36]){
      segment(vec(-18,-18,z),vec(18,-18,z),'rgba(226,198,228,.6)',1.6);
      segment(vec(18,-18,z),vec(18,18,z),'rgba(226,198,228,.6)',1.6);
      segment(vec(18,18,z),vec(-18,18,z),'rgba(226,198,228,.6)',1.6);
      segment(vec(-18,18,z),vec(-18,-18,z),'rgba(226,198,228,.6)',1.6);
    }
    const joints=getJoints(),inside=joints.every(isInside);
    const color=inside?'#e9a9c8':'#ffc0a3';
    segment(joints[0],joints[1],'#b4b7c8',11);
    segment(joints[1],joints[2],color,13);
    segment(joints[2],joints[3],'#b6dbe4',11);
    segment(joints[3],joints[4],'#eecf8f',8);
    joints.slice(1,4).forEach((joint,i)=>circle(joint,8-i,'#fff1f6','#784d75'));
    circle(joints[4],6,'#f5edfe','#372640');
    const tip=joints[4],gripSpread=pose.grip/60;
    const axis=radians(pose.yaw+90+pose.twist), fingerLen=2.6;
    const gap=.45+gripSpread*1.15;
    const lateral=vec(Math.cos(axis),Math.sin(axis),0);
    const left=vec(tip.x-gap*lateral.x,tip.y-gap*lateral.y,tip.z);
    const right=vec(tip.x+gap*lateral.x,tip.y+gap*lateral.y,tip.z);
    const fingerPitch=radians(pose.shoulder+pose.elbow+pose.wrist);
    const tilt=vec(-Math.sin(fingerPitch)*Math.cos(radians(pose.yaw)),
      -Math.sin(fingerPitch)*Math.sin(radians(pose.yaw)),Math.cos(fingerPitch));
    segment(left,vec(left.x-tilt.x*fingerLen,left.y-tilt.y*fingerLen,left.z-tilt.z*fingerLen),'#f4d9aa',3);
    segment(right,vec(right.x-tilt.x*fingerLen,right.y-tilt.y*fingerLen,right.z-tilt.z*fingerLen),'#f4d9aa',3);
    label(vec(-18,-18,36),'CEILING', '#d2c1e0');
    label(vec(-18,-18,0),'FLOOR', '#d2c1e0');
    label(tip,'TIP','#ffffff');
    if(status){
      const floorContact=inside && tip.z<=.55;
      const desc=floorContact?'Tip at floor approach height (illustrative).':
        inside?'Arm centerline within chamber bounds.':
        'Arm centerline extends outside chamber bounds.';
      status.textContent=desc+' Tip z: '+tip.z.toFixed(1)+' in.';
      status.dataset.warning=String(!inside);
    }
  }
  function sync(){
    controls.forEach(name=>{
      if(!ranges[name])return;
      ranges[name].value=String(Math.round(pose[name]));
      const min=Number(ranges[name].min),max=Number(ranges[name].max);
      const progress=max>min?100*(Number(ranges[name].value)-min)/(max-min):0;
      ranges[name].style.setProperty('--range-progress',clamp(progress,0,100).toFixed(2)+'%');
      const output=document.getElementById('r3d-'+name+'-value');
      if(output)output.textContent=Math.round(pose[name])+(name==='grip'?'%':'°');
    });
    render();
  }
  function selectPreset(name){
    const target=configurations[name];if(!target)return;
    if(animation!==null)cancelAnimationFrame(animation);
    presets.forEach(el=>el.setAttribute('aria-pressed',String(el.dataset['3dPose']===name)));
    const from={...pose},start=performance.now(),duration=reduced.matches?0:520;
    const frame=now=>{
      const t=duration===0?1:clamp((now-start)/duration,0,1),ease=t*t*(3-2*t);
      controls.forEach(key=>pose[key]=from[key]+(target[key]-from[key])*ease);
      sync();
      if(t<1)animation=requestAnimationFrame(frame);else animation=null;
    };
    animation=requestAnimationFrame(frame);
  }
  presets.forEach(button=>button.addEventListener('click',()=>selectPreset(button.dataset['3dPose'])));
  controls.forEach(name=>ranges[name]?.addEventListener('input',()=>{
    if(animation!==null){cancelAnimationFrame(animation);animation=null}
    presets.forEach(b=>b.setAttribute('aria-pressed','false'));
    pose[name]=Number(ranges[name].value);sync();
  }));
  document.getElementById('r3d-view-left')?.addEventListener('click',()=>{azimuth-=20;render()});
  document.getElementById('r3d-view-right')?.addEventListener('click',()=>{azimuth+=20;render()});
  document.getElementById('r3d-view-reset')?.addEventListener('click',()=>{azimuth=-43;elevation=23;render()});
  let drag=null;
  canvas.addEventListener('pointerdown',event=>{
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,az:azimuth,el:elevation};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    azimuth=drag.az+(event.clientX-drag.x)*.45;
    elevation=clamp(drag.el+(event.clientY-drag.y)*.3,-65,75);
    render();
  });
  const release=()=>{drag=null};
  canvas.addEventListener('pointerup',release);
  canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='ArrowLeft')azimuth-=10;
    if(event.key==='ArrowRight')azimuth+=10;
    if(event.key==='ArrowUp')elevation=clamp(elevation-10,-65,75);
    if(event.key==='ArrowDown')elevation=clamp(elevation+10,-65,75);
    render();
  });
  if('ResizeObserver'in window)new ResizeObserver(fit).observe(canvas);
  else window.addEventListener('resize',fit,{passive:true});
  // Refit after a hidden 3D viewport becomes visible again in the shared dock.
  document.addEventListener('robot:view-change',event=>{
    if(event.detail?.mode==='3d')fit();
  });
  sync();fit();
})();