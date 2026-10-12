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
check(home.includes('id="robot-2d-controls" hidden'),'2D panel should start hidden while 3D view is selected');
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