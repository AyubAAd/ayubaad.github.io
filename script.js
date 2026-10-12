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

// Stable five-planet carousel. Dedicated buttons orbit; project text stays still.
const repoCards = [...document.querySelectorAll('#repo-grid .repo-card')];
const repoPlanets = [...document.querySelectorAll('[data-planet-select]')];
const repoFilters = [...document.querySelectorAll('.repo-filter')];
const repoSearch = document.getElementById('repo-search');
const repoResultCount = document.getElementById('repo-results');
const repoEmpty = document.getElementById('repo-empty');
const repoOrbitShell = document.getElementById('repo-orbit-shell');
const repoOrbitStage = document.getElementById('repo-planetarium');
const repoGrid = document.getElementById('repo-grid');
const repoOrbitControls = document.getElementById('repo-orbit-controls');
const repoOrbitHint = document.getElementById('repo-orbit-hint');
const repoOrbitReadout = document.getElementById('repo-orbit-readout');
const repoOrbitPrev = document.getElementById('repo-orbit-prev');
const repoOrbitNext = document.getElementById('repo-orbit-next');
const repoFeatured = document.getElementById('repo-featured');
const repoFeaturedTitle = document.getElementById('repo-featured-title');
const repoFeaturedDesc = document.getElementById('repo-featured-desc');
const repoFeaturedTags = document.getElementById('repo-featured-tags');
const repoFeaturedLink = document.getElementById('repo-featured-link');
const repoFeaturedCount = document.getElementById('repo-featured-count');
const repoByPlanet = new Map(repoCards.map(card => [card.dataset.planet, card]));
let repoCategory = 'all';
let featuredRepo = repoCards[0] || null;
const repoSlotSets = {
  1:['front'],
  2:['front','right'],
  3:['front','right','left'],
  4:['front','right','back-left','left'],
  5:['front','right','back-right','back-left','left']
};
const repoOrbitEnabled = !!(repoOrbitStage && repoGrid && repoOrbitShell &&
  repoFeatured && repoFeaturedTitle && repoFeaturedDesc &&
  repoFeaturedTags && repoFeaturedLink && repoFeaturedCount &&
  repoPlanets.length === 5 && repoCards.length === 5 &&
  repoPlanets.every(planet => repoByPlanet.has(planet.dataset.planetSelect)));
function visibleRepos(){
  return repoCards.filter(card => !card.hidden);
}
function planetSlotStyle(slot, width){
  const mobile = width <= 700;
  const xSide = Math.min(335,width * (mobile ? .295 : .345));
  const xRear = Math.min(205,width * (mobile ? .235 : .215));
  if(mobile){
    const sizes = {
      front:Math.min(142,Math.max(108,width*.38)),
      right:Math.min(86,Math.max(66,width*.23)),
      left:Math.min(86,Math.max(66,width*.23)),
      'back-right':Math.min(70,Math.max(56,width*.18)),
      'back-left':Math.min(70,Math.max(56,width*.18))
    };
    return {
      front:[0,80,sizes.front],
      right:[xSide,48,sizes.right],
      left:[-xSide,48,sizes.left],
      'back-right':[xRear,-88,sizes['back-right']],
      'back-left':[-xRear,-88,sizes['back-left']]
    }[slot];
  }
  return {
    front:[0,106,154],
    right:[xSide,55,108],
    left:[-xSide,55,108],
    'back-right':[xRear,-96,92],
    'back-left':[-xRear,-96,92]
  }[slot];
}
function paintRepoOrbit(){
  if(!repoOrbitEnabled)return;
  const width = repoOrbitStage.clientWidth || 980;
  repoPlanets.forEach(planet=>{
    if(planet.hidden)return;
    const slot = planet.dataset.slot;
    const coords = planetSlotStyle(slot,width);
    if(!coords)return;
    const [x,y,size] = coords;
    planet.style.setProperty('--x',x.toFixed(1)+'px');
    planet.style.setProperty('--y',y.toFixed(1)+'px');
    planet.style.setProperty('--size',size.toFixed(1)+'px');
    planet.style.zIndex = slot === 'front' ? '6' :
      slot === 'left' || slot === 'right' ? '5' : '3';
  });
}
function renderRepoOrbit(){
  if(!repoOrbitEnabled)return;
  const available = visibleRepos();
  if(repoOrbitShell)repoOrbitShell.hidden = available.length === 0;
  if(repoOrbitControls)repoOrbitControls.hidden = available.length === 0;
  if(!available.length)return;
  if(!available.includes(featuredRepo))featuredRepo = available[0];
  const focusedIndex = available.indexOf(featuredRepo);
  const slots = repoSlotSets[available.length];
  repoPlanets.forEach(planet=>{
    const card = repoByPlanet.get(planet.dataset.planetSelect);
    const index = available.indexOf(card);
    const isAvailable = index !== -1;
    planet.hidden = !isAvailable;
    if(!isAvailable){
      planet.setAttribute('aria-pressed','false');
      return;
    }
    const offset = (index-focusedIndex+available.length)%available.length;
    const slot = slots[offset];
    planet.dataset.slot = slot;
    planet.setAttribute('aria-pressed',String(slot === 'front'));
  });
  const title = featuredRepo.querySelector('h3')?.textContent?.trim() || 'Repository';
  repoFeaturedTitle.textContent = title;
  repoFeaturedDesc.textContent = featuredRepo.querySelector('p')?.textContent?.trim() || '';
  const source = featuredRepo.querySelector('.repo-link');
  if(source){
    repoFeaturedLink.href = source.href;
    repoFeaturedLink.setAttribute('aria-label','Open '+title+' on GitHub');
  }
  repoFeaturedTags.replaceChildren(...[...featuredRepo.querySelectorAll('.repo-meta span')].map(tag=>{
    const copy = document.createElement('span');
    copy.textContent = tag.textContent;
    return copy;
  }));
  repoFeaturedCount.textContent = (focusedIndex+1)+' / '+available.length;
  if(repoOrbitReadout)repoOrbitReadout.textContent = (focusedIndex+1)+' of '+available.length+' · '+title;
  if(repoOrbitPrev)repoOrbitPrev.disabled = available.length < 2;
  if(repoOrbitNext)repoOrbitNext.disabled = available.length < 2;
  paintRepoOrbit();
}
function chooseRepo(card){
  if(card && !card.hidden){
    featuredRepo = card;
    renderRepoOrbit();
  }
}
function rotateRepo(direction){
  const available = visibleRepos();
  if(available.length < 2)return;
  const i = Math.max(0,available.indexOf(featuredRepo));
  chooseRepo(available[(i+direction+available.length)%available.length]);
}
function filterRepos(){
  const query = (repoSearch?.value || '').trim().toLowerCase();
  let count = 0;
  repoCards.forEach(card=>{
    const types = (card.dataset.category || '').split(' ');
    const haystack = [
      card.querySelector('h3')?.textContent,
      card.querySelector('p')?.textContent,
      card.dataset.keywords
    ].join(' ').toLowerCase();
    const shown = (repoCategory==='all' || types.includes(repoCategory))
      && (!query || haystack.includes(query));
    card.hidden = !shown;
    if(shown)count++;
  });
  if(repoResultCount)repoResultCount.textContent='Showing '+count+' of '+repoCards.length+' projects';
  if(repoEmpty)repoEmpty.hidden = count !== 0;
  if(repoOrbitEnabled)renderRepoOrbit();
}
repoFilters.forEach(button=>button.addEventListener('click',()=>{
  repoCategory=button.dataset.filter;
  repoFilters.forEach(filter=>{
    const active=filter===button;
    filter.classList.toggle('active',active);
    filter.setAttribute('aria-pressed',String(active));
  });
  filterRepos();
}));
repoSearch?.addEventListener('input',filterRepos);
document.getElementById('reset-repos')?.addEventListener('click',()=>{
  if(repoSearch)repoSearch.value='';
  repoFilters.find(filter=>filter.dataset.filter==='all')?.click();
  repoSearch?.focus();
});
if(repoOrbitEnabled){
  // The normal five-card list is the fallback if any carousel script fails.
  repoOrbitStage.hidden=false;
  repoFeatured.hidden=false;
  repoOrbitShell.classList.add('is-orbit-ready');
  if(repoOrbitHint)repoOrbitHint.hidden=false;
  repoOrbitPrev?.addEventListener('click',()=>rotateRepo(-1));
  repoOrbitNext?.addEventListener('click',()=>rotateRepo(1));
  repoPlanets.forEach(planet=>planet.addEventListener('click',()=>{
    chooseRepo(repoByPlanet.get(planet.dataset.planetSelect));
  }));
  repoOrbitStage.addEventListener('keydown',event=>{
    if(event.key!=='ArrowRight' && event.key!=='ArrowLeft')return;
    event.preventDefault();
    rotateRepo(event.key==='ArrowRight'?1:-1);
  });
  let touchStart=null;
  repoOrbitStage.addEventListener('touchstart',event=>{
    if(event.touches.length===1){
      touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
    }
  },{passive:true});
  repoOrbitStage.addEventListener('touchend',event=>{
    if(!touchStart || event.changedTouches.length!==1)return;
    const dx=event.changedTouches[0].clientX-touchStart.x;
    const dy=event.changedTouches[0].clientY-touchStart.y;
    touchStart=null;
    if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.4)rotateRepo(dx<0?1:-1);
  },{passive:true});
  if('ResizeObserver' in window){
    new ResizeObserver(paintRepoOrbit).observe(repoOrbitStage);
  }else{
    window.addEventListener('resize',paintRepoOrbit,{passive:true});
  }
}
filterRepos();
// Let the browser paint the initial non-overlapping layout before enabling motion.
// This prevents all five planets flying out of the middle when the page loads.
if(repoOrbitEnabled && typeof requestAnimationFrame === 'function'){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    repoOrbitShell.classList.add('is-orbit-animated');
  }));
}

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
