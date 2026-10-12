/* Static portfolio checks. Run with: node scripts/site-check.js */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const domain='https://kailania.vercel.app';
const projectDir=path.join(root,'projects');
const htmlFiles=['index.html','resume.html',
  ...fs.readdirSync(projectDir).filter(name=>name.endsWith('.html')).map(name=>'projects/'+name)];
let checks=0,failed=0;
function check(condition,message){
  checks++;
  if(!condition){failed++;console.error('FAIL '+message)}
}
for(const file of htmlFiles){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  check(/<title>[\s\S]+?<\/title>/.test(html),file+' needs a document title');
  check(html.includes('portfolio-upgrade.css'),file+' missing responsive stylesheet');
  check(html.includes('portfolio-upgrade.js'),file+' missing behavior script');
  check(html.includes('<meta property="og:image"'),file+' missing preview image');
  check(html.includes(domain),file+' missing canonical domain');
  check(!html.includes('https://kalarcon775.github.io'),file+' references old canonical host');
  for(const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)){
    const url=match[1].trim();
    if(!url || /^(?:#|[a-z]+:|\/\/)/i.test(url))continue;
    const local=url.split(/[?#]/)[0];
    if(!local)continue;
    const target=path.resolve(root,path.dirname(file),local);
    check(target.startsWith(root+path.sep)||target===root,file+': path escapes repository: '+local);
    check(fs.existsSync(target),file+': missing asset or page '+local);
  }
  const seen=new Set();
  for(const match of html.matchAll(/\sid=["']([^"']+)["']/g)){
    check(!seen.has(match[1]),file+': duplicate id '+match[1]);
    seen.add(match[1]);
  }
}
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const directory=fs.readFileSync(path.join(projectDir,'index.html'),'utf8');

// Five repository planets remain visible, separated, and independently selectable.
const orbitCss=fs.readFileSync(path.join(root,'repo-orbit.css'),'utf8');
const repoJs=fs.readFileSync(path.join(root,'script.js'),'utf8');
check((home.match(/class="repo-planet"/g)||[]).length===5,
  'Five distinct repository planet buttons required');
check((home.match(/class="repo-card"/g)||[]).length===5,
  'All five original source cards must remain as a no-JS fallback');
check(home.includes('id="repo-featured"') && home.includes('id="repo-featured-link"'),
  'The featured project detail panel and its link must be present');
check(home.includes('id="repo-orbit-prev"')&&home.includes('id="repo-orbit-next"'),
  'Previous and next orbital controls required');
check(home.includes('id="repo-planetarium"')&&home.includes('repo-orbit.css'),
  'Solar-system stage and stylesheet required');
check(home.includes('<details class="repo-demos"'),
  'Video demos should remain collapsible');

const demoFigures=[...home.matchAll(/<figure class="video-demo"[^>]*>/g)].map(match=>match[0]);
check(demoFigures.length===2 && demoFigures.every(tag=>!/\shidden\b/.test(tag)),
  'Available demo video cards must not depend on metadata events to become visible');
check(['assets/huemotion-demo.mp4','assets/lighting-demo.mp4'].every(filename=>
  fs.existsSync(path.join(root,filename))),
  'Both displayed demonstration videos must exist');
check(!repoJs.includes("addEventListener('loadedmetadata'"),
  'Repository videos must remain visible before metadata loading');

check(repoJs.includes('function renderRepoOrbit()')&&repoJs.includes('function rotateRepo(direction)') &&
  repoJs.includes('function planetSlotStyle('),
  'Carousel must have stable positioning and navigation logic');
check(repoJs.includes('repoPlanetarium')===false && repoJs.includes("const repoOrbitStage"),
  'Ensure carousel uses the same stage reference throughout');
check(repoJs.includes("repoPlanets.forEach(planet=>planet.addEventListener('click'") &&
  repoJs.includes("function filterRepos()"),
  'Planet selection and search filtering must remain functional');
check(repoJs.includes("repoOrbitStage.addEventListener('keydown'") &&
  repoJs.includes("repoOrbitStage.addEventListener('touchend'"),
  'Carousel must support keyboard and touch input');
check(orbitCss.includes('prefers-reduced-motion:reduce') &&
  orbitCss.includes('.repo-planet{') &&
  orbitCss.includes('.repo-featured{'),
  'Planets must move with accessible, reduced-motion-aware styles');

check(orbitCss.includes('transition:none;') &&
  orbitCss.includes('.repo-orbit-shell.is-orbit-animated .repo-planet') &&
  repoJs.includes("repoOrbitShell.classList.add('is-orbit-animated')"),
  'Planets must not animate from a shared center during initial load');

let repositoryScriptParses=true;
try{new (require('node:vm').Script)(repoJs,{filename:'script.js'})}
catch(error){repositoryScriptParses=false;console.error(error.message)}
check(repositoryScriptParses,'Repository JavaScript must parse');
// Validate the visible planet positions against actual stage dimensions.
// Do not merely check bounding boxes: earlier planets overlapped each other/the sun.
for(const width of [280,284,320,375,390,550,700,701,820,980]){
  const mobile=width<=700;
  const stageHeight=mobile?368:430;
  const xSide=Math.min(335,width*(mobile?0.295:0.345));
  const xRear=Math.min(205,width*(mobile?0.235:0.215));
  const sizes=mobile?{
    front:Math.min(142,Math.max(108,width*.38)),
    right:Math.min(86,Math.max(66,width*.23)),
    left:Math.min(86,Math.max(66,width*.23)),
    'back-right':Math.min(70,Math.max(56,width*.18)),
    'back-left':Math.min(70,Math.max(56,width*.18))
  }:{front:154,right:108,left:108,'back-right':92,'back-left':92};
  const planets=[
    {slot:'front',x:0,y:mobile?80:106},
    {slot:'right',x:xSide,y:mobile?28:55},
    {slot:'back-right',x:xRear,y:mobile?-88:-96},
    {slot:'back-left',x:-xRear,y:mobile?-88:-96},
    {slot:'left',x:-xSide,y:mobile?28:55}
  ].map(p=>({...p,r:sizes[p.slot]/2}));
  const sun={x:0,y:mobile?65+32-stageHeight/2:52+52-stageHeight/2,r:mobile?32:52};
  planets.forEach((p,i)=>{
    check(Math.abs(p.x)+p.r<=width/2&&Math.abs(p.y)+p.r<=stageHeight/2,
      p.slot+' clipped at width '+width);
    check(p.slot!=='front'||p.y+p.r+24 <= stageHeight/2,
      'Featured planet label clipped at width '+width);
    check(Math.hypot(p.x-sun.x,p.y-sun.y)>=p.r+sun.r+5,
      p.slot+' overlaps sun at width '+width);
    planets.slice(i+1).forEach(q=>check(Math.hypot(p.x-q.x,p.y-q.y)>=p.r+q.r+5,
      p.slot+' overlaps '+q.slot+' at width '+width));
  });
}

/* Interactive engineering-case-study explorer: linked to the existing dossiers. */
const caseExplorerJS=fs.readFileSync(path.join(root,'case-explorer.js'),'utf8');
const caseExplorerCSS=fs.readFileSync(path.join(root,'case-explorer.css'),'utf8');
check(home.includes('id="case-explorer"') &&
  home.includes('case-explorer.css') && home.includes('case-explorer.js'),
  'Engineering case studies need their interactive explorer and assets');
check((home.match(/data-case-select="/g)||[]).length===3,
  'Case explorer must offer NASA, IVerify and instrumentation views');
check((home.match(/data-case-step="/g)||[]).length===4,
  'Each interactive case workflow needs four selectable stages');
check(['case-nasa','case-iverify','case-controls'].every(id=>home.includes('id="'+id+'"')),
  'All three original long-form case studies must remain accessible');
check(home.indexOf('id="case-explorer"') < home.indexOf('id="case-nasa"'),
  'Interactive explorer should introduce the longer case studies');
check(caseExplorerJS.includes("const caseData = {") &&
  ['nasa','iverify','controls'].every(key=>caseExplorerJS.includes(key+': {')),
  'Interactive case explorer source-derived case content missing');
check(caseExplorerJS.includes("setAttribute('aria-selected'") &&
  caseExplorerJS.includes("setAttribute('aria-pressed'"),
  'Interactive case controls must expose their selected state');
check(caseExplorerCSS.includes('prefers-reduced-motion:reduce'),
  'Case explorer must respect reduced-motion settings');
let explorerSyntaxValid=true;
try{new (require('node:vm').Script)(caseExplorerJS,{filename:'case-explorer.js'})}
catch(error){explorerSyntaxValid=false;console.error(error.message)}
check(explorerSyntaxValid,'Case explorer JavaScript must parse');

check(home.includes('id="robot-3d-canvas"'),'3D viewer missing');
check(home.includes('id="theme-toggle"'),'Theme toggle missing');
check(home.includes('data-robot-view="3d"'),'Robot view picker missing');
check((directory.match(/data-gallery-category=/g)||[]).length===16,'16 categorized gallery cards required');
check(fs.readFileSync(path.join(root,'robots.txt'),'utf8').includes(domain),'robots.txt wrong host');
check(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').includes(domain),'sitemap.xml wrong host');

/* Additional accessibility and fragment-link checks. */
const cachedIds=new Map();
function getIds(absolutePath){
  if(!cachedIds.has(absolutePath)){
    const html=fs.readFileSync(absolutePath,'utf8');
    cachedIds.set(absolutePath,new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m=>m[1])));
  }
  return cachedIds.get(absolutePath);
}
for(const file of htmlFiles){
  const absolute=path.join(root,file);
  const markup=fs.readFileSync(absolute,'utf8');
  if(file.startsWith('projects/')){
    check(!/<style\b[^>]*>/i.test(markup),file+' has duplicated inline project styles');
  }
  for(const match of markup.matchAll(/<img\b[^>]*>/g)){
    check(/\balt\s*=/.test(match[0]),file+' image missing alternative text');
  }
  for(const match of markup.matchAll(/\bhref=["']([^"']+)["']/g)){
    const url=match[1];
    if(!url.includes('#')||/^(https?:|\/\/|mailto:|tel:)/i.test(url))continue;
    const [targetRef,rawFragment]=url.split('#');
    if(!rawFragment)continue;
    const target=targetRef?path.resolve(root,path.dirname(file),targetRef.split('?')[0]):absolute;
    if(!target.startsWith(root+path.sep)||!target.endsWith('.html')||!fs.existsSync(target))continue;
    let fragment=rawFragment;
    try{fragment=decodeURIComponent(rawFragment)}catch{/* Test the unmodified anchor name. */}
    check(getIds(target).has(fragment),file+' references missing section '+url);
  }
}
check(home.includes('id="robot-2d-controls" aria-label="2D motion controls" hidden'),
  '2D panel should start hidden while 3D view is selected');

/* The 2D/3D robot simulator shares one dock beneath one viewer. */
const robotDockCss=fs.readFileSync(path.join(root,'robot-control-dock.css'),'utf8');
const robotViewJs=fs.readFileSync(path.join(root,'portfolio-upgrade.js'),'utf8');
const robot3dJs=fs.readFileSync(path.join(root,'robot-3d.js'),'utf8');
const robotSection=home.slice(home.indexOf('<section class="section robot-section"'),
  home.indexOf('<section class="section experience-section"'));
const dock=robotSection.indexOf('class="robot-controls-dock"');
check(home.includes('robot-control-dock.css'),
  'Robot mode design should load the shared controls stylesheet');
check(dock>robotSection.indexOf('class="robot-viewport"')&&
  robotSection.indexOf('id="robot-2d-controls" aria-label="2D motion controls" hidden')>dock&&
  robotSection.indexOf('id="robot-3d-controls" aria-label="3D chamber controls"')>dock,
  'Both robot control panels must be inside the same dock, below the viewer');
check((robotSection.match(/data-joint-control/g)||[]).length===3 &&
  (robotSection.match(/class="robot-3d-control"/g)||[]).length===6,
  'Retain three planar and six chamber joint controls');
check((robotSection.match(/class="robot-control-heading robot-control-heading--joints"/g)||[]).length===2 &&
  robotSection.includes('class="robot-action-row robot-control-presets"') &&
  robotSection.includes('class="robot-3d-tools robot-control-presets"'),
  'Both modes need matching preset and manual adjustment headings');
check(robotViewJs.includes("controls3d.hidden=chosen!=='3d'")&&
  robotViewJs.includes("controls.hidden=chosen!=='2d'")&&
  robotViewJs.includes("robot:view-change"),
  'Robot mode switching must update both panels and the active viewer');
check(robot3dJs.includes("robot:view-change")&&robot3dJs.includes("fit()"),
  '3D canvas must resize correctly when reactivated');
check(robotDockCss.includes('robot-control-sliders')&&
  robotDockCss.includes('robot-control-presets'),
  'Both panels need shared styling');

check(home.includes('data-robot-mode="3d"'),'3D view should start as the selected robot mode');


/* Content hierarchy and visual-first case-study invariants. */
const caseStudyFiles=htmlFiles.filter(file=>file.startsWith('projects/')&&file!=='projects/index.html');
for(const file of caseStudyFiles){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const overview=html.indexOf('id="project-overview"');
  const method=html.indexOf('id="project-method"');
  const findings=html.indexOf('id="project-results"');
  const evidence=html.indexOf('id="project-evidence"');
  check(overview>=0&&method>overview&&findings>method&&evidence>findings,
    file+' needs overview → methods → findings → evidence ordering');
  const visualIds=['dmx-visuals','hall-visuals','huemotion-visuals',
    'iverify-reconstruction','prodriver-visuals','thermal-visuals','vna-visuals'];
  for(const id of visualIds){
    const visual=html.indexOf('id="'+id+'"');
    if(visual>=0){
      check(visual>overview&&visual<method,
        file+' should introduce visuals after overview, before detailed analysis');
    }
  }
  check(!/<h2>Evidence and limitations<\/h2>/.test(html),
    file+' includes repeated evidence-limitations card');
  for(const title of ['Challenge','Approach','Tools']){
    check(html.includes('<h3>'+title+'</h3>'),
      file+' missing readable '+title+' subsection heading');
  }
  check((html.match(/<h1\b/g)||[]).length===1,
    file+' must contain exactly one page heading');

}
for(const group of ['robotics','embedded','measurement','software']){
  check(directory.includes('data-gallery-group="'+group+'"'),
    'Project directory missing discipline '+group);
}

console.log((failed?'FAIL':'PASS')+': '+(checks-failed)+'/'+checks+' static checks');
if(failed)process.exitCode=1;