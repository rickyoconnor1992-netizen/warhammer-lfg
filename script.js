import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ----- CONFIG ----- */
const ADMIN_PASSCODE = "Iamziu9072!";
const firebaseConfig = {
  apiKey: "AIzaSyAYiFXk_K-SiEmR_GwHcOBXL7grS7A6BrQ",
  authDomain: "warehammer-3-lfg.firebaseapp.com",
  databaseURL: "https://warehammer-3-lfg-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "warehammer-3-lfg",
  storageBucket: "warehammer-3-lfg.firebasestorage.app",
  messagingSenderId: "159491210338",
  appId: "1:159491210338:web:7d2a3a214ec0c3b301253b",
  measurementId: "G-LKEHRBBWLX"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ----- DOM ----- */
const postsList = document.getElementById('postsList');
const postForm = document.getElementById('postForm');
const statusEl = document.getElementById('status');
const filterMode = document.getElementById('filterMode');
const filterFaction = document.getElementById('filterFaction');
const filterTZ = document.getElementById('filterTZ');
const searchText = document.getElementById('searchText');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');

const adminToggle = document.getElementById('adminToggle');
const adminCard = document.getElementById('adminCard');
const adminPass = document.getElementById('adminPass');
const authenticate = document.getElementById('authenticate');
const clearExpiredBtn = document.getElementById('clearExpired');
const clearAllBtn = document.getElementById('clearAll');

let isAdmin = false;

/* Helper */
function escapeHtml(s){ return s? s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) : ''; }
function timeAgo(date){
  const s = Math.floor((Date.now() - date)/1000);
  if(s<60) return `${s}s ago`;
  const m = Math.floor(s/60); if(m<60) return `${m}m ago`;
  const h = Math.floor(m/60); if(h<24) return `${h}h ago`;
  const d = Math.floor(h/24); return `${d}d ago`;
}

/* Render post */
function renderPost(id,data){
  const posted = data.createdAt || Date.now();
  const el = document.createElement('div');
  el.className = 'post-card';
  el.setAttribute('data-id', id);
  el.innerHTML = `
    <div class="meta">
      <div class="title">${escapeHtml(data.username)}</div>
      <div class="meta-right">${timeAgo(posted)}</div>
    </div>
    <div class="faction">
      ${escapeHtml(data.mode)} • ${escapeHtml(data.faction)} • ${escapeHtml(data.experience||'')}
    </div>
    <div style="margin-top:8px;color:#ddd">${escapeHtml(data.message||'')}</div>
    <div class="meta" style="margin-top:10px">
      <div style="font-size:13px;color:var(--muted)">${escapeHtml(data.timezone||'')}</div>
      <div style="font-size:13px"><a href="${escapeHtml(data.contact)}" target="_blank" style="color:#ffd">${escapeHtml(data.contact)}</a></div>
    </div>
    ${isAdmin? `<div style="margin-top:10px;display:flex;gap:8px">
      <button class="btn small ghost deleteBtn" data-id="${id}">Delete</button>
    </div>` : ''}
  `;
  return el;
}

/* Firebase */
const postsRef = ref(db,'lfg_posts');
function startListener(filters={}){
  postsList.innerHTML = '';
  statusEl.textContent = 'Loading...';
  onValue(postsRef, snapshot=>{
    postsList.innerHTML = '';
    const data = snapshot.val();
    if(!data){ statusEl.textContent='No posts'; return; }
    const keys = Object.keys(data).reverse();
    let count = 0;
    keys.forEach(k=>{
      const post = data[k];
      let show=true;
      if(filters.mode && post.mode!==filters.mode) show=false;
      if(filters.faction && post.faction!==filters.faction) show=false;
      if(filters.tz && !post.timezone.toLowerCase().includes(filters.tz.toLowerCase())) show=false;
      if(filters.search && !post.message.toLowerCase().includes(filters.search.toLowerCase()) && !post.username.toLowerCase().includes(filters.search.toLowerCase())) show=false;
      if(show){
        postsList.appendChild(renderPost(k,post));
        count++;
      }
    });
    statusEl.textContent = count===0?'No matching posts':'';    
    document.querySelectorAll('.deleteBtn').forEach(btn=>{
      btn.addEventListener('click', e=>{ remove(ref(db,'lfg_posts/'+btn.dataset.id)); });
    });
  });
}

/* Post form */
postForm.addEventListener('submit', e=>{
  e.preventDefault();
  const data = {
    username: postForm.username.value,
    contact: postForm.contact.value,
    mode: postForm.mode.value,
    faction: postForm.faction.value,
    experience: postForm.experience.value,
    timezone: postForm.timezone.value,
    message: postForm.message.value,
    createdAt: Date.now()
  };
  push(postsRef,data);
  postForm.reset();
});

/* Filters */
applyFilters.addEventListener('click',()=>{
  startListener({
    mode: filterMode.value,
    faction: filterFaction.value,
    tz: filterTZ.value,
    search: searchText.value
  });
});
clearFilters.addEventListener('click',()=>{
  filterMode.value=''; filterFaction.value=''; filterTZ.value=''; searchText.value='';
  startListener();
});

/* Admin */
adminToggle.addEventListener('click', ()=>adminCard.style.display=adminCard.style.display==='none'?'block':'none');
authenticate.addEventListener('click', ()=>{
  if(adminPass.value===ADMIN_PASSCODE){ isAdmin=true; alert('Admin enabled'); startListener(); } else alert('Wrong pass');
});
clearExpiredBtn.addEventListener('click', ()=>{
  onValue(postsRef, snapshot=>{
    const data=snapshot.val();
    if(!data) return;
    const now=Date.now();
    Object.keys(data).forEach(k=>{
      const post=data[k];
      const days=post.expiryDays||1;
      if(post.createdAt && (now-post.createdAt)>(days*86400000)) remove(ref(db,'lfg_posts/'+k));
    });
  });
});
clearAllBtn.addEventListener('click', ()=>{
  if(confirm('Clear all posts?')) remove(postsRef);
});

/* Start */
startListener();
