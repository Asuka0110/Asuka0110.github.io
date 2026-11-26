import { markdown } from './markdown.js';
import { COPY_FIELDS } from './copy-fields.js';
const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = value => { try { const u = new URL(value, location.origin); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const imageUrl = value => { const u = safeUrl(value); return u ? esc(u) : '/assets/forest.svg'; };
let data, editable = false, editData, editorTab = 'profile', currentFilter = '全部';
const categories = ['学习笔记','随笔','日记'];
const copyValue = key => String(data?.copy?.[key] ?? '');
const c = key => esc(copyValue(key));
const optional = (tag,value,className='') => value ? `<${tag}${className?` class="${className}"`:''}>${esc(value)}</${tag}>` : '';
const sectionTitle = (title,eyebrow) => `<h2>${c(title)}${optional('small',copyValue(eyebrow))}</h2>`;
const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const pubPosts = () => data.posts.filter(p => p.status === 'published').sort((a,b)=>b.date.localeCompare(a.date));
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(()=>$('#toast').classList.remove('show'),3200); }
function empty(title,body,symbol='✧'){if(!title&&!body)return '';return '<div class="empty"><span class="empty-icon" aria-hidden="true">'+symbol+'</span>'+optional('h3',title)+(body!==title?optional('p',body):'')+'</div>';}
function entry(p) { return `<button class="entry" data-post="${esc(p.id)}"><span class="meta"><span>${esc(p.category)}</span><time>${esc(p.date)}</time><span>${Math.max(1,Math.ceil(p.body.length/500))} 分钟阅读</span></span><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><div class="entry-tags">${(p.tags||[]).map(t=>'# '+esc(t)).join('　')}</div></button>`; }
function galleryCard(g){
  const alt=g.alt||g.title||g.artist||'画廊图片';
  return '<button class="gallery-item" data-image="'+esc(g.id)+'" aria-label="'+esc(alt)+'"><img src="'+imageUrl(g.src)+'" alt="'+esc(alt)+'" loading="lazy">'+optional('p',g.title)+optional('small',g.artist)+(g.date?optional('small',g.date):'')+'</button>';
}
function galleryItems(limit){return data.gallery.slice(0,limit||data.gallery.length).map(galleryCard).join('');}
function galleryEmpty(){return empty(copyValue('galleryEmptyTitle'),'');}
function pageHead(en,title,desc){return '<div class="page-head">'+optional('p',en,'eyebrow')+optional('h1',title)+optional('p',desc)+'</div>';}
function renderHome(){
  const p=data.profile,posts=pubPosts().slice(0,3);
  return '<section class="hero"><div class="hero-copy">'+optional('p',p.subtitle,'eyebrow')+'<h1>'+esc(p.heading)+'</h1>'+optional('p',p.intro)+'<div class="hero-buttons"><a class="button" href="#notes">'+c('notesButton')+'</a><a class="button secondary" href="#about">'+c('aboutButton')+'</a></div><div class="small-tags">'+p.tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div></div><div class="hero-art"><div class="art-frame"><img src="'+imageUrl(p.heroImage)+'" alt="首页配图"><div class="art-overlay"></div>'+((copyValue('windowEyebrow')||copyValue('windowCaption'))?'<div class="art-caption">'+optional('small',copyValue('windowEyebrow'))+optional('p',copyValue('windowCaption'))+'</div>':'')+'</div>'+(p.avatar?'<div class="portrait-badge"><img src="'+imageUrl(p.avatar)+'" alt="绿发自设肖像">'+optional('span',copyValue('portraitCaption'))+'</div>':'')+optional('span',copyValue('verticalCaption'),'art-side')+((p.signature||copyValue('signatureLabel'))?'<div class="art-note">'+optional('p',p.signature)+optional('span',copyValue('signatureLabel'))+'</div>':'')+'</div></section>'+
  '<section class="shelf"><div class="section-top">'+sectionTitle('recentTitle','recentEyebrow')+'<a class="text-link" href="#notes">'+c('recentLink')+'</a></div><div class="home-grid"><div>'+(posts.length?posts.map(entry).join(''):empty(copyValue('recentEmptyTitle'),copyValue('recentEmptyIntro'),'⌁'))+'</div><aside class="path-card">'+optional('p',copyValue('aiEyebrow'),'eyebrow')+optional('h3',copyValue('aiTitle'))+optional('p',copyValue('aiIntro'))+'<a href="#notes?tag=AI%20Infra">'+c('aiLink')+'</a></aside></div></section>'+
  '<section class="shelf"><div class="section-top">'+sectionTitle('gallerySectionTitle','gallerySectionEyebrow')+'<a class="text-link" href="#gallery">'+c('galleryLink')+'</a></div><div class="gallery-strip">'+(data.gallery.length?galleryItems(3):galleryEmpty())+'</div>'+(!data.gallery.length?optional('p',copyValue('homeGalleryEmptyIntro'),'note-line'):'')+'</section>'+
  '<section class="shelf"><div class="section-top">'+sectionTitle('projectSectionTitle','projectSectionEyebrow')+'<a class="text-link" href="#projects">'+c('projectsLink')+'</a></div>'+(data.projects.length?projectCards(data.projects.slice(0,3)):empty(copyValue('homeProjectsEmptyTitle'),copyValue('homeProjectsEmptyIntro'),'⌘'))+'</section>';
}
function renderNotes(isJournal=false){
  const query=new URLSearchParams(location.hash.split('?')[1]||''),tag=query.get('tag');
  let posts=pubPosts().filter(p=>isJournal?['随笔','日记'].includes(p.category):p.category==='学习笔记');
  const tags=[...new Set(posts.flatMap(p=>p.tags||[]))];if(tag)currentFilter=tag;
  if(currentFilter!=='全部')posts=posts.filter(p=>(p.tags||[]).includes(currentFilter)||p.category===currentFilter);
  const filters=isJournal?['全部','随笔','日记']:['全部',...new Set(['AI Infra',...tags])];
  return pageHead(copyValue(isJournal?'journalEyebrow':'notesEyebrow'),copyValue(isJournal?'journalTitle':'notesTitle'),copyValue(isJournal?'journalIntro':'notesIntro'))+'<section class="page-main"><div class="filters">'+filters.map(t=>'<button class="filter '+(currentFilter===t?'active':'')+'" data-filter="'+esc(t)+'">'+esc(t)+'</button>').join('')+'</div><div class="long-list">'+(posts.length?posts.map(entry).join(''):empty(copyValue(currentFilter==='全部'?'notesEmptyTitle':'filterEmptyTitle'),copyValue(isJournal?'journalEmptyIntro':'notesEmptyIntro')))+'</div></section>';
}
function projectCards(projects) { return projects.map(p=>`<div class="project-card"><p class="eyebrow">${esc(p.kind||'项目')} ${esc(p.period||'')}</p><h2>${esc(p.title)}</h2><p>${esc(p.summary)}</p><div class="small-tags">${(p.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div><button class="text-link" data-project="${esc(p.id)}">阅读项目详情</button></div>`).join(''); }
function renderProjects(){
  let projects=data.projects;if(currentFilter!=='全部')projects=projects.filter(p=>p.kind===currentFilter);
  return pageHead(copyValue('projectsEyebrow'),copyValue('projectsTitle'),copyValue('projectsIntro'))+'<section class="page-main"><div class="filters">'+['全部','科研与竞赛','个人项目','实习经历'].map(t=>'<button class="filter '+(currentFilter===t?'active':'')+'" data-filter="'+t+'">'+t+'</button>').join('')+'</div>'+(projects.length?projectCards(projects):empty(copyValue('projectsEmptyTitle'),copyValue('projectsEmptyIntro')))+'</section>';
}
function renderGallery(){
  const items=currentFilter==='全部'?data.gallery:data.gallery.filter(g=>(g.collection||'自设与约稿')===currentFilter);
  return pageHead(copyValue('galleryEyebrow'),copyValue('galleryTitle'),copyValue('galleryIntro'))+'<section class="page-main"><div class="filters">'+['全部','自设与约稿','喜欢的画面'].map(t=>'<button class="filter '+(currentFilter===t?'active':'')+'" data-filter="'+t+'">'+t+'</button>').join('')+'</div><div class="gallery-strip">'+(items.length?items.map(galleryCard).join(''):galleryEmpty())+'</div>'+optional('p',copyValue('galleryFooter'),'note-line')+'</section>';
}
function renderAbout(){
  const p=data.profile;
  return pageHead(copyValue('aboutEyebrow'),copyValue('aboutTitle'),copyValue('aboutIntro'))+'<section class="page-main about-grid"><div class="prose">'+optional('h2',copyValue('aboutBodyTitle'))+markdown(p.about)+optional('h2',copyValue('futureTitle'))+optional('p',copyValue('futureIntro'))+(p.github&&safeUrl(p.github)?'<a href="'+esc(safeUrl(p.github))+'" target="_blank" rel="noopener noreferrer">'+c('githubLink')+'</a>':'')+'</div><aside class="about-side">'+optional('h3',copyValue('stackTitle'))+(p.stack.length?'<div class="small-tags">'+p.stack.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div>':'')+'<h3 style="margin-top:30px">'+c('tagsTitle')+'</h3><div class="small-tags">'+p.tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div></aside></section>';
}
function route() {
  if(!data)return;
  const part=location.hash.slice(1).split('?')[0]||'home';
  document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===part);if(a.dataset.nav===part)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  const views={home:renderHome,notes:()=>renderNotes(false),journal:()=>renderNotes(true),projects:renderProjects,gallery:renderGallery,about:renderAbout};
  $('#main').innerHTML=`<div class="fade-in">${(views[part]||renderHome)()}</div>`;
  const siteTitle=copyValue('siteTitle')||data.profile.name;
  document.title=part==='home'?siteTitle+(copyValue('homeTitle')?' · '+copyValue('homeTitle'):''):
    ({notes:copyValue('notesTitle'),journal:copyValue('journalTitle'),projects:copyValue('projectsTitle'),gallery:copyValue('galleryTitle'),about:'关于我'}[part]||'首页')+' · '+siteTitle;
  document.querySelector('meta[name="description"]').content=copyValue('description');
  for(const element of document.querySelectorAll('[data-copy]')){const value=copyValue(element.dataset.copy);element.textContent=value;element.hidden=!value;}
  $('#footerSuffix').textContent=copyValue('footerSuffix')?' · '+copyValue('footerSuffix'):'';
  $('#brandName').textContent=data.profile.name;if(data.profile.avatar){$('.brand img').src=imageUrl(data.profile.avatar);$('.brand img').classList.add('brand-avatar');}$('#footerName').textContent=data.profile.name;
  $('nav').classList.remove('open');$('.mobile-menu').setAttribute('aria-expanded','false');
}
function openReader(item,project=false) {
  const metrics=project&&item.metrics?.length?`<dl class="case-metrics">${item.metrics.map(m=>`<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd><p>${esc(m.note)}</p></div>`).join('')}</dl>`:'';
  const flow=project&&item.flow?`<section class="case-flow"><h2>${esc(item.flow.title)}</h2><div>${item.flow.stages.map(s=>`<section><p class="flow-label">${esc(s.label)}</p><h3>${esc(s.title)}</h3><p>${esc(s.detail)}</p></section>`).join('')}</div><p class="flow-caption">${esc(item.flow.caption)}</p></section>`:'';
  $('#readerBody').innerHTML=`<p class="eyebrow">${esc(project?item.kind:item.category)}</p><h1>${esc(item.title)}</h1><p class="meta">${esc(item.date||item.period||'')} ${(item.tags||[]).map(t=>' · '+esc(t)).join('')}</p>${project?`<p class="case-lead">${esc(item.summary)}</p>${item.status?`<p class="case-status">${esc(item.status)}</p>`:''}`:''}${metrics}${flow}<nav class="reader-toc" aria-label="详情章节"></nav><div class="prose">${markdown(item.body)}</div>`;
  const toc=$('#readerBody .reader-toc');
  const headings=[...$('#readerBody .prose').querySelectorAll('h2')];
  if(headings.length>2){toc.innerHTML='<p>章节目录</p>'+headings.map((h,i)=>{h.id='reader-section-'+i;return `<button data-reader-section="${i}">${esc(h.textContent)}</button>`;}).join('');}else toc.remove();
  $('#reader').showModal();$('#reader').scrollTop=0;
}
document.addEventListener('click',e=>{
  const section=e.target.closest('[data-reader-section]');if(section){$('#reader-section-'+section.dataset.readerSection)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  const post=e.target.closest('[data-post]'),project=e.target.closest('[data-project]'),image=e.target.closest('[data-image]'),filter=e.target.closest('[data-filter]');
  if(post){const p=pubPosts().find(p=>p.id===post.dataset.post);if(p){if($('#searchDialog').open)$('#searchDialog').close();openReader(p);}}
  if(project){const p=data.projects.find(p=>p.id===project.dataset.project);if(p){if($('#searchDialog').open)$('#searchDialog').close();openReader(p,true);}}
  if(image){const g=data.gallery.find(g=>g.id===image.dataset.image);if(g){$('#lightboxImage').src=imageUrl(g.src);$('#lightboxImage').alt=g.alt||g.title||g.artist||'画廊图片';$('#lightboxCaption').textContent=[g.title,g.artist,g.description].filter(Boolean).join(' · ');$('#lightboxCaption').hidden=!$('#lightboxCaption').textContent;$('#lightbox').showModal();}}
  if(filter){currentFilter=filter.dataset.filter;const hash=location.hash.split('?')[0];if(location.hash.includes('?'))history.replaceState(null,'',hash);route();}
  if(e.target.closest('dialog .close'))e.target.closest('dialog').close();
});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();}));
$('.mobile-menu').addEventListener('click',()=>{const open=$('nav').classList.toggle('open');$('.mobile-menu').setAttribute('aria-expanded',String(open));});
window.addEventListener('hashchange',()=>{currentFilter='全部';route();window.scrollTo(0,0);});
$('#year').textContent=new Intl.DateTimeFormat('en',{timeZone:'Asia/Shanghai',year:'numeric'}).format(new Date());
$('#searchButton').onclick=()=>{$('#searchDialog').showModal();$('#searchInput').focus();search();};
$('#searchInput').addEventListener('input',search);
function search(){const q=$('#searchInput').value.trim().toLowerCase();if(!q){$('#searchResults').innerHTML='<p class="note-line">输入关键词，搜索已经公开的文章与项目。</p>';return;}const matches=pubPosts().filter(p=>[p.title,p.body,...(p.tags||[])].join(' ').toLowerCase().includes(q));const projects=data.projects.filter(p=>[p.title,p.body,...(p.tags||[])].join(' ').toLowerCase().includes(q));$('#searchResults').innerHTML=matches.map(entry).join('')+projectCards(projects)||'<p class="note-line">暂时没有找到，换个关键词试试。</p>';}
$('#editButton').onclick=async()=>{try{const r=await fetch('/api/editor');if(!r.ok)throw Error();const result=await r.json();if(!result.editable)throw Error();editable=true;editData=result.data;editorTab='profile';renderEditor();}catch{editable=false;$('#editorBody').innerHTML=optional('p',copyValue('editorEyebrow'),'eyebrow')+optional('h2',copyValue('editorTitle'))+'<div class="editor-note">当前是已发布的阅读版。本机编辑器可以修改首页、整理文章、添加项目和画稿；保存后由我帮你同步发布。</div><div class="prose"><p>在电脑上双击项目里的「启动博客.cmd」，再点击页脚的「内容管理」，即可使用编辑表单。</p><p>也可以直接在聊天里给我 Word、PDF、画稿或口述内容。我会整理好文章与署名，并更新博客。</p><p>本机草稿保存在电脑中，不会进入发布包。当前还没有跨设备的在线后台。</p></div>'; }$('#editor').showModal();};
function field(id,label,value='',type='text'){return `<label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value)}">`;}
function area(id,label,value=''){return `<label for="${id}">${label}</label><textarea id="${id}">${esc(value)}</textarea>`;}
function renderEditor(){
  const tabs={profile:'首页与关于',copy:'栏目文案',posts:'笔记与随笔',projects:'项目与实习',gallery:'自设画廊'};
  $('#editorBody').innerHTML=`${optional('p',copyValue('editorEyebrow'),'eyebrow')}${optional('h2',copyValue('editorTitle'))}<p class="editor-note">保存到这台电脑的项目文件。公开内容需由我同步部署后才会更新线上版本；草稿只留在本机。请保留项目文件夹作为备份。</p><div class="editor-tabs">${Object.entries(tabs).map(([k,v])=>`<button data-tab="${k}" class="${k===editorTab?'active':''}">${v}</button>`).join('')}</div><div id="editorPanel"></div>`;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{editorTab=b.dataset.tab;renderEditor();});
  if(editorTab==='profile')profileForm();else if(editorTab==='copy')copyForm();else listEditor();
}
function copyForm(){
  let group='';
  $('#editorPanel').innerHTML='<form id="copyForm"><p class="editor-note">留空的小字与题注不显示。首页大标题、简介、签名与关于正文在「首页与关于」中修改。</p>'+COPY_FIELDS.map(([key,label,nextGroup])=>{let heading='';if(group!==nextGroup){group=nextGroup;heading='<h3 class="copy-group">'+esc(group)+'</h3>';}return heading+(/Intro$|description/.test(key)?area('copy-'+key,label,editData.copy?.[key]||''):field('copy-'+key,label,editData.copy?.[key]||''));}).join('')+'<div class="editor-actions"><button type="submit" class="button">保存栏目文案</button></div></form>';
  $('#copyForm').onsubmit=async e=>{e.preventDefault();editData.copy={...editData.copy};for(const [key] of COPY_FIELDS)editData.copy[key]=$('#copy-'+key).value.trim();try{await saveEditor();renderEditor();}catch(error){toast(error.message);}};
}
function profileForm(){const p=editData.profile;$('#editorPanel').innerHTML=`<form id="profileForm">${field('profileName','博客名字',p.name)}${field('profileSubtitle','首页英文小标题',p.subtitle)}${area('profileHeading','首页大标题（支持换行）',p.heading)}${area('profileIntro','首页简介',p.intro)}${field('profileSignature','留给自己的话',p.signature)}${field('profileTags','首页关键词（用逗号分隔）',p.tags.join(', '))}${area('profileAbout','关于我（支持基础 Markdown）',p.about)}${field('profileStack','实际使用过的技术栈（用逗号分隔）',p.stack.join(', '))}${field('profileGithub','GitHub 主页链接',p.github,'url')}<label for="heroSelect">首页配图</label><select id="heroSelect"><option value="">默认雾林插画</option>${editData.gallery.map(g=>`<option value="${esc(g.src)}" ${p.heroImage===g.src?'selected':''}>${esc(g.title||g.artist||g.alt||'画廊图片')}</option>`).join('')}</select><div class="editor-actions"><button class="button" type="submit">保存首页</button></div></form>`;$('#profileForm').onsubmit=async e=>{e.preventDefault();for(const key of ['name','subtitle','heading','intro','signature','about','github'])p[key]=$('#profile'+key[0].toUpperCase()+key.slice(1)).value.trim();p.tags=splitTags($('#profileTags').value);p.stack=splitTags($('#profileStack').value);p.heroImage=$('#heroSelect').value;try{await saveEditor();}catch(error){toast(error.message);}};}
const splitTags = value => value.split(/[,，]/).map(x=>x.trim()).filter(Boolean);
function listEditor(){const key=editorTab;const items=editData[key];$('#editorPanel').innerHTML=`<button class="button secondary" id="newItem">${{posts:'写一篇新文章',projects:'添加一段经历',gallery:'收藏一张画稿'}[key]}</button><div style="margin-top:18px">${items.map(i=>`<div class="editor-list-item"><div>${esc(i.title||i.artist||i.alt||'未命名画稿')} <small>${i.status==='draft'?'本机草稿':key==='posts'?'待同步的公开内容':''}</small></div><div><button data-change="${esc(i.id)}">编辑</button><button class="danger" data-delete="${esc(i.id)}">删除</button></div></div>`).join('')||'<p class="note-line">这里还空着，从第一条记录开始。</p>'}</div><div id="itemForm"></div>`;$('#newItem').onclick=()=>itemForm();document.querySelectorAll('[data-change]').forEach(b=>b.onclick=()=>itemForm(items.find(i=>i.id===b.dataset.change)));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('删除这条内容？保存后会从本机内容列表移除。'))return;editData[key]=items.filter(i=>i.id!==b.dataset.delete);await saveEditor();listEditor();});}
function itemForm(existing){
  const key=editorTab,item=existing||{},isPost=key==='posts',isProject=key==='projects';
  $('#itemForm').innerHTML=`<form id="itemEditor">${field('itemTitle',isProject?'项目 / 实习名称':key==='gallery'?'标题（可留空）':'标题',item.title)}${isPost?`<div class="field-row"><div><label for="itemCategory">归档</label><select id="itemCategory">${categories.map(c=>`<option ${item.category===c?'selected':''}>${c}</option>`).join('')}</select></div><div><label for="itemStatus">可见性</label><select id="itemStatus"><option value="draft" ${item.status!=='published'?'selected':''}>本机草稿 · 不发布</option><option value="published" ${item.status==='published'?'selected':''}>公开内容 · 等待同步部署</option></select></div></div>${field('itemDate','日期',item.date||today(),'date')}`:''}${isProject?`<label for="itemKind">类型</label><select id="itemKind"><option ${item.kind==='科研与竞赛'?'selected':''}>科研与竞赛</option><option ${item.kind==='个人项目'?'selected':''}>个人项目</option><option ${item.kind==='实习经历'?'selected':''}>实习经历</option></select>${field('itemPeriod','时间段',item.period||'')}`:''}${key==='gallery'?`<label for="itemCollection">收藏分类</label><select id="itemCollection"><option ${item.collection!=='喜欢的画面'?'selected':''}>自设与约稿</option><option ${item.collection==='喜欢的画面'?'selected':''}>喜欢的画面</option></select>${field('itemArtist','画师署名',item.artist||'')}${field('itemAlt','图片说明（用于读屏）',item.alt||'')}${field('itemDate','日期',item.date||today(),'date')}${area('itemDescription','画稿说明',item.description||'')}<label for="imageFile">上传画稿（JPEG / PNG / WebP / GIF，最多 8 MB）</label><input type="file" id="imageFile" accept="image/jpeg,image/png,image/webp,image/gif">${item.src?'<p class="note-line">已有关联画稿，不选新文件即可保留。</p>':''}`:`${area('itemSummary','简短摘要',item.summary||'')}${field('itemTags','标签（逗号分隔）',(item.tags||[]).join(', '))}<label for="textFile">从 TXT / Markdown 导入正文</label><input type="file" id="textFile" accept=".txt,.md,text/plain,text/markdown"><p class="note-line">Word / PDF 可以在聊天里交给我整理后加入。</p>${area('postBody',isProject?'详情（推荐：背景、职责、方案、结果）':'正文（基础 Markdown，支持标题、代码块、列表）',item.body||'')}<button type="button" id="previewPost" class="text-link">预览正文</button><div id="markdownPreview" class="prose"></div>`}<div class="editor-actions"><button class="button" type="submit">保存到本机</button><button class="button secondary" type="button" id="cancelItem">收起</button></div><p class="error" id="formError" role="alert"></p></form>`;
  $('#itemTitle').required=key!=='gallery';$('#itemForm').scrollIntoView({behavior:'smooth',block:'start'});$('#cancelItem').onclick=()=>$('#itemForm').innerHTML='';
  if($('#textFile'))$('#textFile').onchange=async e=>{const f=e.target.files[0];if(f){if(f.size>2e6){toast('文字文件请小于 2 MB');return;}$('#postBody').value=await f.text();}};
  if($('#previewPost'))$('#previewPost').onclick=()=>$('#markdownPreview').innerHTML=markdown($('#postBody').value);
  $('#itemEditor').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const next={...item,id:item.id||crypto.randomUUID(),title:$('#itemTitle').value.trim()};if(key!=='gallery'&&!next.title)throw Error('请填写标题');if(isPost){Object.assign(next,{category:$('#itemCategory').value,status:$('#itemStatus').value,date:$('#itemDate').value});}if(isProject)Object.assign(next,{kind:$('#itemKind').value,period:$('#itemPeriod').value.trim()});if(key==='gallery'){const f=$('#imageFile').files[0];if(f){if(f.size>8*1024*1024)throw Error('图片不能大于 8 MB');const encoded=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});const r=await fetch('/api/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:encoded})});const result=await r.json();if(!r.ok)throw Error(result.error||'上传失败');next.src=result.src;}if(!next.src)throw Error('请先选择一张画稿');Object.assign(next,{alt:$('#itemAlt').value.trim()||next.title||'画廊图片',collection:$('#itemCollection').value,artist:$('#itemArtist').value.trim(),date:$('#itemDate').value,description:$('#itemDescription').value.trim()});}else Object.assign(next,{summary:$('#itemSummary').value.trim(),tags:splitTags($('#itemTags').value),body:$('#postBody').value});const index=editData[key].findIndex(i=>i.id===next.id);if(index<0)editData[key].unshift(next);else editData[key][index]=next;await saveEditor();listEditor();}catch(err){$('#formError').textContent=err.message;}finally{button.disabled=false;}};
}
async function saveEditor(){const r=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editData)});const result=await r.json();if(!r.ok)throw Error(result.error||'保存失败');data=result.public;route();toast('已保存到本机。线上版本等待同步发布。');}
async function init(){try{const r=await fetch('/site.json',{cache:'no-store'});if(!r.ok)throw Error('内容加载失败');data=await r.json();route();}catch(err){$('#main').innerHTML=`<div class="loading"><h1>这页暂时没有展开</h1><p>${esc(err.message)}，请刷新页面重试。</p></div>`;}}
init();
