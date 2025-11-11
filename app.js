// ======== CONFIG ========
// Put your YouTube Data API v3 key here. Get one from Google Cloud → APIs & Services → Credentials.
const API_KEY = "AIzaSyDAKdEZt7lJFtilFrEwOpHzPMQ4VmGUenU"; // ← REPLACE with your key
const CHANNEL_ID = "UCeGw4rSHuOlW0x2R52auMPg"; // <- paste your real Channel ID
const CHANNEL_QUERY = null;              // disable name search
  // handle or name to resolve the channel

// Fallback manual list (used if API key is missing/invalid)
const videosFallback = [
  { id: "dQw4w9WgXcQ", title: "Sample: Replace with your video", date: "2025-01-01", tags: ["sample"], description: "Add your own IDs or use API auto‑load." }
];

// ======== STATE / HELPERS ========
const perPage = 9;
let allVideos = [];
let activeTag = null;
let currentPage = 1;

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const store = {
  get theme(){ return localStorage.getItem("theme") || (matchMedia('(prefers-color-scheme: dark)').matches? 'dark':'light'); },
  set theme(v){ localStorage.setItem("theme", v); document.documentElement.classList.toggle('dark', v==='dark'); },
  get watchLater(){ try{return JSON.parse(localStorage.getItem('watchLater')||'[]')}catch{ return [] } },
  set watchLater(v){ localStorage.setItem('watchLater', JSON.stringify(v)); render(); }
};
document.documentElement.classList.toggle('dark', store.theme==='dark');

function youtubeThumb(id){ return `https://img.youtube.com/vi/${id}/hqdefault.jpg`; }
function youtubeWatch(id){ return `https://www.youtube.com/watch?v=${id}`; }
function youtubeEmbed(id){ return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`; }

function uniqueTags(list){ const s = new Set(); list.forEach(v => (v.tags||[]).forEach(t=>s.add(t))); return [...s].sort((a,b)=>a.localeCompare(b)); }

function getFilteredSorted(){
  const q = $('#search').value.trim().toLowerCase();
  const wlOnly = $('#watchLaterToggle').checked;
  const wl = store.watchLater;
  let arr = allVideos.filter(v => {
    if (wlOnly && !wl.includes(v.id)) return false;
    let hit = !q || v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q) || (v.tags||[]).some(t=>t.toLowerCase().includes(q));
    if (activeTag) hit = hit && (v.tags||[]).includes(activeTag);
    return hit;
  });
  const sort = $('#sortSelect').value;
  arr.sort((a,b)=>{
    if (sort==='newest') return (b.date||'').localeCompare(a.date||'');
    if (sort==='oldest') return (a.date||'').localeCompare(b.date||'');
    if (sort==='az') return a.title.localeCompare(b.title);
    if (sort==='za') return b.title.localeCompare(a.title);
    return 0;
  });
  return arr;
}

function renderChips(){
  const row = $('#chipRow'); row.innerHTML = '';
  const mk = (label, tag=null) => {
    const b = document.createElement('button');
    b.className = `text-sm px-3 py-1.5 rounded-full border ${activeTag===tag? 'bg-sky-600 text-white border-sky-600' : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`;
    b.textContent = label; b.onclick = ()=>{ activeTag = tag; currentPage = 1; render(); };
    return b;
  };
  row.append(mk('All'));
  uniqueTags(allVideos).forEach(t => row.append(mk(t, t)));
}

function renderGrid(){
  const grid = $('#grid'); const empty = $('#emptyState'); const pager = $('#pager');
  const arr = getFilteredSorted();
  const total = arr.length; const pages = Math.max(1, Math.ceil(total / perPage));
  currentPage = Math.min(Math.max(1, currentPage), pages);
  const start = (currentPage-1)*perPage; const slice = arr.slice(start, start+perPage);

  grid.innerHTML = slice.map(v => `
    <article class="group border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white/70 dark:bg-zinc-900/70 shadow-sm hover:shadow transition">
      <div class="relative cursor-pointer" data-id="${v.id}" data-title="${(v.title||'').replace(/"/g,'&quot;')}">
        <img loading="lazy" class="w-full aspect-video object-cover" src="${youtubeThumb(v.id)}" alt="${v.title||''}">
        <div class="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40 text-white text-xl">▶</div>
      </div>
      <div class="p-4 flex flex-col gap-2">
        <h3 class="font-semibold leading-snug line-clamp-2">${v.title||''}</h3>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">${v.description||''}</p>
        <div class="flex flex-wrap gap-1">
          ${(v.tags||[]).map(t=>`<span class="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">${t}</span>`).join('')}
        </div>
        <div class="mt-1 flex items-center gap-2 text-xs text-zinc-500">
          <span>${v.date||''}</span>
          <button class="ms-auto px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 addLater" data-id="${v.id}">Watch later</button>
          <a class="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700" href="${youtubeWatch(v.id)}" target="_blank" rel="noopener">YouTube ↗</a>
        </div>
      </div>
    </article>
  `).join('');

  // events for thumbnails and watch-later
  grid.querySelectorAll('[data-id]').forEach(el => el.onclick = ()=> openModal(el.dataset.id, el.dataset.title));
  grid.querySelectorAll('.addLater').forEach(b => b.onclick = (e)=>{
    const id = e.currentTarget.dataset.id; const wl = store.watchLater;
    if (!wl.includes(id)) wl.push(id); store.watchLater = wl;
  });

  // empty / pager
  empty.classList.toggle('hidden', total>0);
  pager.innerHTML = '';
  if (pages>1){
    const mk = (label, p, dis=false) => {
      const btn = document.createElement('button'); btn.textContent = label;
      btn.className = `px-3 py-1.5 rounded-xl border text-sm ${dis? 'opacity-50 cursor-not-allowed':'hover:bg-zinc-100 dark:hover:bg-zinc-800'} border-zinc-300 dark:border-zinc-700`;
      btn.disabled = dis; btn.onclick = ()=>{ currentPage = p; render(); }; return btn;
    };
    pager.append(mk('‹ Prev', currentPage-1, currentPage===1));
    for(let p=1;p<=pages;p++){ pager.append(mk(String(p), p, p===currentPage)); }
    pager.append(mk('Next ›', currentPage+1, currentPage===pages));
  }
}

function render(){ renderChips(); renderGrid(); }

function openModal(id, title){
  $('#player').src = youtubeEmbed(id);
  $('#modalTitle').textContent = title||'';
  $('#openOnYT').href = youtubeWatch(id);
  $('#modal').classList.remove('hidden'); $('#modal').classList.add('flex');
}

function closeModal(){ $('#player').src = ''; $('#modal').classList.add('hidden'); $('#modal').classList.remove('flex'); }

// ======== YOUTUBE API LOAD ========
async function fetchJSON(url){ const r = await fetch(url); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }

async function resolveChannelId(query){
  const u = new URL('https://www.googleapis.com/youtube/v3/search');
  u.search = new URLSearchParams({ part:'snippet', type:'channel', q:query, maxResults:1, key:API_KEY }).toString();
  const d = await fetchJSON(u); const it = d.items?.[0]; if(!it) throw new Error('Channel not found');
  return it.snippet.channelId;
}

async function getUploadsPlaylistId(channelId){
  const u = new URL('https://www.googleapis.com/youtube/v3/channels');
  u.search = new URLSearchParams({ part:'contentDetails', id:channelId, key:API_KEY }).toString();
  const d = await fetchJSON(u); return d.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
}

async function fetchUploads(playlistId){
  const out = []; let next = '';
  do {
    const u = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    u.search = new URLSearchParams({ part:'snippet,contentDetails', maxResults:50, playlistId, key:API_KEY, pageToken:next }).toString();
    const d = await fetchJSON(u);
    for(const it of (d.items||[])){
      const s = it.snippet||{};
      out.push({ id: it.contentDetails?.videoId, title: s.title||'Untitled', date: (s.publishedAt||'').slice(0,10), tags: (s.tags||[]).slice(0,5), description: s.description||'' });
    }
    next = d.nextPageToken||'';
  } while(next);
  return out;
}

async function autoLoad(){
  if(!API_KEY || API_KEY==='YOUR_API_KEY'){ allVideos = videosFallback; return; }
  try{
    const ch = await resolveChannelId(CHANNEL_QUERY);
    const up = await getUploadsPlaylistId(ch);
    const list = await fetchUploads(up);
    allVideos = list.length? list : videosFallback;
  }catch(e){ console.warn('Auto-load failed:', e.message); allVideos = videosFallback; }
}

// ======== INIT / EVENTS ========
function init(){
  $('#year').textContent = String(new Date().getFullYear());
  $('#themeBtn').onclick = ()=> store.theme = (store.theme==='dark'?'light':'dark');
  $('#clearSearch').onclick = ()=>{ $('#search').value=''; render(); };
  $('#search').oninput = ()=>{ currentPage = 1; render(); };
  $('#sortSelect').onchange = ()=> render();
  $('#watchLaterToggle').onchange = ()=> render();
  $('#modal').addEventListener('click', (e)=>{ if(e.target===e.currentTarget) closeModal(); });
  $('#closeModal').onclick = closeModal;
  render();
}

document.addEventListener('DOMContentLoaded', async ()=>{ await autoLoad(); init(); });
