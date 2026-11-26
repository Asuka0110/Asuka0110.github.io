export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inline(value){
  const code=[];
  let text=String(value).replace(/`([^`]+)`/g,(_,v)=>`\u0001${code.push('<code>'+escapeHtml(v)+'</code>')-1}\u0002`);
  text=escapeHtml(text).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  return text.replace(/\u0001(\d+)\u0002/g,(_,i)=>code[Number(i)]||'');
}
const cells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(v=>v.trim());
export function markdown(source=''){
  const lines=source.replace(/\r/g,'').split('\n');let html='',inCode=false,buffer=[],list=false;
  const closeList=()=>{if(list){html+='</ul>';list=false;}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(line.startsWith('```')){closeList();if(inCode){html+='<pre><code>'+escapeHtml(buffer.join('\n'))+'</code></pre>';buffer=[];}inCode=!inCode;continue;}
    if(inCode){buffer.push(line);continue;}
    if(line.includes('|')&&i+1<lines.length&&cells(lines[i+1]).every(c=>/^:?-{3,}:?$/.test(c))){
      closeList();const header=cells(line);i++;html+='<div class="table-scroll" role="region" aria-label="项目数据表" tabindex="0"><table><thead><tr>'+header.map(c=>'<th scope="col">'+inline(c)+'</th>').join('')+'</tr></thead><tbody>';
      while(i+1<lines.length&&lines[i+1].trim().includes('|')){const row=cells(lines[++i]);html+='<tr>'+header.map((_,n)=>'<td>'+inline(row[n]||'')+'</td>').join('')+'</tr>';}
      html+='</tbody></table></div>';continue;
    }
    if(/^[-*] /.test(line)){if(!list){html+='<ul>';list=true;}html+='<li>'+inline(line.slice(2))+'</li>';continue;}
    closeList();const heading=line.match(/^(#{1,3}) (.+)$/);
    if(heading){const level=Math.max(2,heading[1].length);html+=`<h${level}>${inline(heading[2])}</h${level}>`;}
    else if(line.startsWith('> '))html+='<blockquote>'+inline(line.slice(2))+'</blockquote>';
    else if(line.trim())html+='<p>'+inline(line)+'</p>';
  }
  closeList();if(inCode)html+='<pre><code>'+escapeHtml(buffer.join('\n'))+'</code></pre>';return html;
}
