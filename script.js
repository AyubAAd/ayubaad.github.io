'use strict';

// Small static-site interactions, no frameworks or accounts required.
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');
if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const open = !navLinks.classList.contains('open');
    navLinks.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
  }));
}
document.getElementById('year').textContent = new Date().getFullYear();

// Illustrative planar FK. The joints represent the shoulder, elbow and wrist
// in a simplified side-view model. NOT a motion planner or hardware interface.
const rad = deg => deg * Math.PI / 180;
const poses = {
  home:    {angles:[-48, 96, 0],   label:'✳ In home position'},
  hello:   {angles:[-18,111,-43], label:'✳ Robot says hello!'},
  reach:   {angles:[ 43,-80, 10], label:'✳ Reaching down'},
  inspect: {angles:[-56,120,-42], label:'✳ Inspecting the workspace'}
};
const arm = {
  bone1: document.getElementById('bone-1'), bone2:document.getElementById('bone-2'), bone3:document.getElementById('bone-3'),
  joint1:document.getElementById('joint-1'),joint2:document.getElementById('joint-2'),
  gripperLeft:document.getElementById('grip-left'),gripperRight:document.getElementById('grip-right'),
  tipGlow:document.getElementById('tip-glow'),tipDot:document.getElementById('tip-dot'),
  shoulder:document.getElementById('shoulder-readout'),elbow:document.getElementById('elbow-readout'),
  status:document.getElementById('pose-status')
};
let angles = poses.home.angles.slice();
let animationFrame = null;
let sequenceTimers = [];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const poseButtons = [...document.querySelectorAll('.pose-button')];
const sequenceButton = document.getElementById('animate-button');
function setXY(el, fields, x, y){ if(!el)return;el.setAttribute(fields[0],x.toFixed(2));el.setAttribute(fields[1],y.toFixed(2)); }
function putBone(el,p1,p2){setXY(el,['x1','y1'],p1.x,p1.y);setXY(el,['x2','y2'],p2.x,p2.y);}
function renderArm(a){
  const lengths=[144,144,55],origin={x:250,y:102},points=[origin];
  let x=origin.x,y=origin.y,theta=0;
  a.forEach((joint,i)=>{theta+=joint;x+=lengths[i]*Math.sin(rad(theta));y+=lengths[i]*Math.cos(rad(theta));points.push({x,y});});
  putBone(arm.bone1,points[0],points[1]);putBone(arm.bone2,points[1],points[2]);putBone(arm.bone3,points[2],points[3]);
  setXY(arm.joint1,['cx','cy'],points[1].x,points[1].y);setXY(arm.joint2,['cx','cy'],points[2].x,points[2].y);
  setXY(arm.tipGlow,['cx','cy'],points[3].x,points[3].y);setXY(arm.tipDot,['cx','cy'],points[3].x,points[3].y);
  const tipTheta=rad(a.reduce((s,v)=>s+v,0));
  const dx=Math.cos(tipTheta),dy=-Math.sin(tipTheta),tip=points[3];
  putBone(arm.gripperLeft,tip,{x:tip.x-13*dx+11*dy,y:tip.y-13*dy-11*dx});
  putBone(arm.gripperRight,tip,{x:tip.x+13*dx+11*dy,y:tip.y+13*dy-11*dx});
  if(arm.shoulder)arm.shoulder.textContent=`${Math.round(a[0])}°`;
  if(arm.elbow)arm.elbow.textContent=`${Math.round(a[1])}°`;
}
function cancelSequence(){sequenceTimers.forEach(clearTimeout);sequenceTimers=[];const stop=document.getElementById('stop-button');if(stop)stop.hidden=true;if(sequenceButton){sequenceButton.disabled=false;sequenceButton.textContent='✧ Run a mini motion sequence';}}
function choosePose(name, fromSequence=false){
  if(!poses[name])return;
  if(!fromSequence)cancelSequence();
  poseButtons.forEach(b=>{const active=b.dataset.pose===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  if(arm.status)arm.status.textContent=poses[name].label;
  if(animationFrame!==null)cancelAnimationFrame(animationFrame);
  const start=angles.slice(),end=poses[name].angles.slice();
  if(reduceMotion.matches){angles=end;renderArm(angles);return;}
  const startTime=performance.now(),duration=740;
  const animate=now=>{
    const t=Math.min(1,(now-startTime)/duration),ease=t*t*(3-2*t);
    angles=start.map((v,i)=>v+(end[i]-v)*ease);renderArm(angles);
    if(t<1)animationFrame=requestAnimationFrame(animate);else animationFrame=null;
  };
  animationFrame=requestAnimationFrame(animate);
}
poseButtons.forEach(button=>button.addEventListener('click',()=>choosePose(button.dataset.pose)));
if(sequenceButton)sequenceButton.addEventListener('click',()=>{
  cancelSequence();sequenceButton.disabled=true;sequenceButton.textContent='✧ A little dance in progress...';
  const names=['hello','inspect','reach','home'];
  names.forEach((name,i)=>sequenceTimers.push(setTimeout(()=>choosePose(name,true),i*1200)));
  sequenceTimers.push(setTimeout(()=>cancelSequence(),names.length*1200));
});
renderArm(angles);

// Repository discovery + solar-system carousel. No external services or accounts needed.
const repoCards = [...document.querySelectorAll('.repo-card')];
const repoFilters = [...document.querySelectorAll('.repo-filter')];
const repoSearch = document.getElementById('repo-search');
const repoResultCount = document.getElementById('repo-results');
const repoEmpty = document.getElementById('repo-empty');
const repoOrbitShell = document.getElementById('repo-orbit-shell');
const repoOrbitStage = document.getElementById('repo-grid');
const repoOrbitControls = document.getElementById('repo-orbit-controls');
const repoOrbitHint = document.getElementById('repo-orbit-hint');
const repoOrbitReadout = document.getElementById('repo-orbit-readout');
const repoOrbitPrev = document.getElementById('repo-orbit-prev');
const repoOrbitNext = document.getElementById('repo-orbit-next');
let repoCategory = 'all';
let featuredRepo = repoCards[0] || null;
const orbitReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const orbitLayouts = {
  1: ['front'],
  2: ['front', 'right'],
  3: ['front', 'right', 'left'],
  4: ['front', 'right', 'back', 'left'],
  5: ['front', 'right', 'back-right', 'back-left', 'left']
};
let orbitPhase = 0;
let orbitTargetPhase = 0;
let orbitFrame = 0;
const orbitCycle = 2 * Math.PI;

function visibleRepos(){
  return repoCards.filter(card => !card.hidden);
}

// Paint positions along an ellipse. Sine moves planets left/right while cosine
// moves them forward/back; scale and stacking order convey the changing depth.
// All five planets remain on-screen, including the two behind the orbit.
function paintRepoOrbit(){
  if(!repoOrbitShell || !repoOrbitStage || !repoCards.length)return;
  const available = visibleRepos();
  const count = available.length;
  if(!count)return;
  const width = repoOrbitStage.clientWidth || 980;
  const mobile = width <= 550;
  const radiusX = Math.min(335, width * (mobile ? 0.325 : 0.345));
  available.forEach((card, index) => {
    const angle = orbitCycle * index / count - orbitPhase;
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    const proximity = (1 + cosine) / 2;
    const x = radiusX * sine;
    const y = 105 * cosine - 30 * Math.abs(sine);
    const scale = mobile
      ? 0.32 + 0.60 * Math.pow(proximity, 3)
      : 0.48 + 0.47 * Math.pow(proximity, 2);
    card.style.setProperty('--x', x.toFixed(1) + 'px');
    card.style.setProperty('--y', y.toFixed(1) + 'px');
    card.style.setProperty('--scale', scale.toFixed(3));
    card.style.zIndex = String(Math.round(2 + 6 * proximity));
    card.style.opacity = (0.78 + 0.22 * proximity).toFixed(3);
  });
}
function renderRepoOrbit(){
  if(!repoOrbitShell || !repoOrbitStage || !repoCards.length)return;
  const available = visibleRepos();
  repoOrbitShell.hidden = available.length === 0;
  if(!available.length){
    if(repoOrbitControls)repoOrbitControls.hidden = true;
    return;
  }
  if(!available.includes(featuredRepo))featuredRepo = available[0];
  const activeIndex = available.indexOf(featuredRepo);
  const positions = orbitLayouts[available.length] || orbitLayouts[5];
  repoCards.forEach(card => {
    const offset = available.indexOf(card);
    const present = offset !== -1;
    const step = present ? (offset - activeIndex + available.length) % available.length : -1;
    const position = step === -1 ? 'hidden' : positions[step];
    const isFront = position === 'front';
    card.dataset.orbitPosition = position;
    card.setAttribute('aria-current', isFront ? 'true' : 'false');
    const link = card.querySelector('.repo-link');
    if(link)link.tabIndex = isFront ? 0 : -1;
    const select = card.querySelector('.repo-orbit-select');
    if(select){
      select.hidden = !present || isFront;
      select.disabled = !present || isFront;
      select.tabIndex = !present || isFront ? -1 : 0;
    }
  });
  if(repoOrbitControls){
    repoOrbitControls.hidden = false;
    if(repoOrbitPrev)repoOrbitPrev.disabled = available.length < 2;
    if(repoOrbitNext)repoOrbitNext.disabled = available.length < 2;
  }
  if(repoOrbitReadout){
    repoOrbitReadout.textContent = String(activeIndex + 1) + ' / ' + String(available.length);
    const name = document.createElement('strong');
    name.textContent = featuredRepo.querySelector('h3')?.textContent || 'Repository';
    repoOrbitReadout.appendChild(name);
  }
  paintRepoOrbit();
}
function animateRepoOrbit(){
  if(orbitFrame)cancelAnimationFrame(orbitFrame);
  orbitFrame = 0;
  if(orbitReducedMotion.matches || !repoOrbitShell){
    orbitPhase = orbitTargetPhase;
    repoOrbitShell?.classList.remove('is-orbit-animating');
    paintRepoOrbit();
    return;
  }
  const initialPhase = orbitPhase;
  const distance = orbitTargetPhase - initialPhase;
  const duration = Math.min(1220, 780 + 165 * Math.abs(distance) / (orbitCycle / Math.max(1, visibleRepos().length)));
  const started = performance.now();
  repoOrbitShell.classList.add('is-orbit-animating');
  function frame(now){
    const progress = Math.min(1, (now - started) / duration);
    const eased = (1 - Math.cos(Math.PI * progress)) / 2;
    orbitPhase = initialPhase + distance * eased;
    paintRepoOrbit();
    if(progress < 1){
      orbitFrame = requestAnimationFrame(frame);
    }else{
      orbitFrame = 0;
      orbitPhase = orbitTargetPhase;
      repoOrbitShell.classList.remove('is-orbit-animating');
      paintRepoOrbit();
    }
  }
  orbitFrame = requestAnimationFrame(frame);
}
function rotateRepo(direction){
  const available = visibleRepos();
  if(available.length < 2)return;
  const activeIndex = Math.max(0, available.indexOf(featuredRepo));
  featuredRepo = available[(activeIndex + direction + available.length) % available.length];
  orbitTargetPhase += direction * orbitCycle / available.length;
  renderRepoOrbit();
  animateRepoOrbit();
}
function selectRepoPlanet(card){
  const available = visibleRepos();
  const index = available.indexOf(card);
  if(index < 0 || card === featuredRepo)return;
  const desiredAngle = orbitCycle * index / available.length;
  // Shortest arc keeps the selected planet visibly on its way to the front.
  const delta = Math.atan2(
    Math.sin(desiredAngle - orbitTargetPhase),
    Math.cos(desiredAngle - orbitTargetPhase)
  );
  featuredRepo = card;
  orbitTargetPhase += delta;
  renderRepoOrbit();
  animateRepoOrbit();
  card.querySelector('.repo-link')?.focus({preventScroll:true});
}
function filterRepos(){
  const query = (repoSearch?.value || '').trim().toLowerCase();
  let count = 0;
  repoCards.forEach(card => {
    const categories = (card.dataset.category || '').split(' ');
    const haystack = [
      card.querySelector('h3')?.textContent,
      card.querySelector('p')?.textContent,
      card.dataset.keywords
    ].join(' ').toLowerCase();
    const shown = (repoCategory === 'all' || categories.includes(repoCategory))
      && (!query || haystack.includes(query));
    card.hidden = !shown;
    if(shown)count++;
  });
  if(repoResultCount)repoResultCount.textContent = 'Showing ' + count + ' of ' + repoCards.length + ' projects';
  if(repoEmpty)repoEmpty.hidden = count !== 0;
  if(orbitFrame)cancelAnimationFrame(orbitFrame);
  orbitFrame = 0;
  repoOrbitShell?.classList.remove('is-orbit-animating');
  const available = visibleRepos();
  if(available.length){
    if(!available.includes(featuredRepo))featuredRepo = available[0];
    orbitPhase = orbitTargetPhase = orbitCycle * available.indexOf(featuredRepo) / available.length;
  }
  renderRepoOrbit();
}
repoFilters.forEach(button => button.addEventListener('click', () => {
  repoCategory = button.dataset.filter;
  repoFilters.forEach(filter => {
    const active = filter === button;
    filter.classList.toggle('active', active);
    filter.setAttribute('aria-pressed', String(active));
  });
  filterRepos();
}));
repoSearch?.addEventListener('input', filterRepos);
document.getElementById('reset-repos')?.addEventListener('click', () => {
  if(repoSearch)repoSearch.value = '';
  repoFilters.find(filter => filter.dataset.filter === 'all')?.click();
  repoSearch?.focus();
});
if(repoOrbitShell && repoCards.length === 5){
  // Without JavaScript the original five repository cards remain readable.
  repoOrbitShell.classList.add('is-orbit-ready');
  if(repoOrbitHint)repoOrbitHint.hidden = false;
  repoOrbitPrev?.addEventListener('click', () => rotateRepo(-1));
  repoOrbitNext?.addEventListener('click', () => rotateRepo(1));
  repoCards.forEach(card => {
    card.querySelector('.repo-orbit-select')?.addEventListener('click', () => selectRepoPlanet(card));
  });
  repoOrbitStage?.addEventListener('keydown', event => {
    if(event.key === 'ArrowRight' || event.key === 'ArrowLeft'){
      event.preventDefault();
      rotateRepo(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  let touchOrigin = null;
  repoOrbitStage?.addEventListener('touchstart', event => {
    if(event.touches.length !== 1)return;
    touchOrigin = {x:event.touches[0].clientX, y:event.touches[0].clientY};
  }, {passive:true});
  repoOrbitStage?.addEventListener('touchend', event => {
    if(!touchOrigin || event.changedTouches.length !== 1)return;
    const dx = event.changedTouches[0].clientX - touchOrigin.x;
    const dy = event.changedTouches[0].clientY - touchOrigin.y;
    touchOrigin = null;
    if(Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4){
      rotateRepo(dx < 0 ? 1 : -1);
    }
  }, {passive:true});
  window.addEventListener('resize', paintRepoOrbit, {passive:true});
}
filterRepos();

// Navigation keyboard behavior and active section indicators.
function closeNav(){
  if(!navLinks || !menuToggle) return;
  navLinks.classList.remove('open');
  menuToggle.setAttribute('aria-expanded','false');
  menuToggle.setAttribute('aria-label','Open menu');
}
document.addEventListener('keydown', event => {
  if(event.key === 'Escape' && navLinks?.classList.contains('open')) {closeNav();menuToggle.focus();}
});
document.addEventListener('click', event => {
  if(navLinks?.classList.contains('open') && !navLinks.contains(event.target) && !menuToggle?.contains(event.target)) closeNav();
});
const sectionLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
if('IntersectionObserver' in window){
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible) return;
    sectionLinks.forEach(a => {
      if(a.getAttribute('href') === '#' + visible.target.id) a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    });
  }, {rootMargin:'-16% 0px -60% 0px',threshold:[0,0.1,0.3]});
  sectionLinks.forEach(a => {const el=document.querySelector(a.getAttribute('href'));if(el)observer.observe(el);});
}
const backTop = document.getElementById('back-top');
function updateBackTop(){backTop?.classList.toggle('is-visible',window.scrollY>720);}
window.addEventListener('scroll',updateBackTop,{passive:true});
updateBackTop();

// Make every on-page "Top" link reliably return to scroll position zero,
// including the floating control, footer link and site logo.
document.querySelectorAll('a[href="#top"]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:0,left:0,behavior:motionReduced?'auto':'smooth'});
  });
});

// Sequence cancellation works for pointer or keyboard use.
const stopButton=document.getElementById('stop-button');
if(stopButton){
  stopButton.addEventListener('click',()=>{
    cancelSequence();
    if(animationFrame!==null){cancelAnimationFrame(animationFrame);animationFrame=null;}
    if(arm.status)arm.status.textContent='✳ Sequence stopped';
    stopButton.hidden=true;
  });
  sequenceButton?.addEventListener('click',()=>{stopButton.hidden=false;});
  poseButtons.forEach(b=>b.addEventListener('click',()=>{stopButton.hidden=true;}));
}

// Show the optional video clips only after their user-uploaded MP4 files exist.
// This prevents broken video players while the assets folder is being populated.
document.querySelectorAll('[data-video-demo]').forEach(card => {
  const video = card.querySelector('video');
  if (!video) return;
  video.addEventListener('loadedmetadata', () => { card.hidden = false; }, { once: true });
  video.addEventListener('error', () => { card.hidden = true; });
  video.load();
});
