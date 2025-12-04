// CollabSecure - client-side SPA logic
(function(){
  'use strict';

  // Example users (plaintext only here to generate hashes on init)
  const usersPlain = {
    alice: 'password123',
    bob: 'secret456'
  };

  const OFFENSIVE_WORDS = ['idiot','stupid','offensiveword'];

  // helpers
  function $(sel){ return document.querySelector(sel); }
  function showFlash(text, timeout=3000){
    const el = $('#flash'); el.textContent = text; el.style.display='block';
    setTimeout(()=> el.style.display='none', timeout);
  }

  async function sha256hex(msg){
    const enc = new TextEncoder();
    const buf = enc.encode(msg);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const arr = Array.from(new Uint8Array(hash));
    return arr.map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // Build hashed user store
  const usersHashed = {};
  async function initUsers(){
    for(const u of Object.keys(usersPlain)){
      usersHashed[u] = await sha256hex(usersPlain[u]);
    }
  }

  function isOffensive(text){
    const lower = text.toLowerCase();
    return OFFENSIVE_WORDS.some(w => lower.includes(w));
  }

  // Messages in localStorage under 'collab_messages'
  function loadMessages(){
    try{ return JSON.parse(localStorage.getItem('collab_messages')||'[]'); }catch(e){return[]}
  }
  function saveMessages(msgs){ localStorage.setItem('collab_messages', JSON.stringify(msgs)); }

  function renderMessages(){
    const container = $('#messages'); container.innerHTML='';
    const msgs = loadMessages();
    if(msgs.length===0){ container.innerHTML='<p>No hay mensajes aún.</p>'; return; }
    for(const m of msgs){
      const card = document.createElement('div'); card.className='card msg-card';
      const meta = document.createElement('div'); meta.className='meta';
      const left = document.createElement('div'); left.innerHTML = `<strong>${m.sender}</strong> → <em>${m.recipient}</em>`;
      const right = document.createElement('div'); right.className='ts'; right.textContent = m.ts;
      meta.appendChild(left); meta.appendChild(right);
      const content = document.createElement('div'); content.className='content'; content.textContent = m.content;
      card.appendChild(meta); card.appendChild(content);
      container.appendChild(card);
    }
  }

  // Session management
  function setSession(user){ sessionStorage.setItem('collab_user', user); }
  function clearSession(){ sessionStorage.removeItem('collab_user'); }
  function getSession(){ return sessionStorage.getItem('collab_user'); }

  function showAuthUI(){
    const user = getSession();
    if(user){
      $('#login-section').style.display='none';
      $('#board-section').style.display='block';
      $('#nav-logout').style.display='inline';
      $('#nav-user').textContent = `Usuario: ${user}`;
      $('#nav-logout').addEventListener('click', (e)=>{ e.preventDefault(); clearSession(); updateUI(); });
      renderMessages();
    } else {
      $('#login-section').style.display='block';
      $('#board-section').style.display='none';
      $('#nav-logout').style.display='none';
      $('#nav-user').textContent = '';
    }
  }

  async function handleLogin(ev){
    ev.preventDefault();
    const username = $('#username').value.trim();
    const password = $('#password').value;
    const accept = $('#accept-privacy').checked;
    if(!username || !password){ showFlash('Ingrese usuario y contraseña.'); return; }
    if(!accept){ showFlash('Debe aceptar la política de privacidad.'); return; }
    const h = await sha256hex(password);
    if(usersHashed[username] && usersHashed[username] === h){
      setSession(username); showFlash('Login exitoso.'); updateUI();
      $('#password').value='';
    } else {
      showFlash('Credenciales inválidas.');
    }
  }

  function handlePost(ev){
    ev.preventDefault();
    const sender = getSession(); if(!sender){ showFlash('No autenticado.'); return; }
    let recipient = $('#recipient').value.trim(); if(!recipient) recipient='Todos';
    const content = $('#content').value.trim();
    if(!content){ showFlash('El mensaje no puede estar vacío.'); return; }
    if(content.length>500){ showFlash('Mensaje demasiado largo (máx 500).'); return; }
    if(isOffensive(content)){ showFlash('El mensaje contiene palabras no permitidas.'); return; }

    const msgs = loadMessages();
    msgs.unshift({ sender, recipient, content, ts: new Date().toLocaleString() });
    saveMessages(msgs);
    $('#content').value=''; $('#recipient').value='';
    renderMessages(); showFlash('Mensaje enviado.');
  }

  function updateUI(){ showAuthUI(); }

  // init
  (async function(){ await initUsers();
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('post-form').addEventListener('submit', handlePost);
    updateUI();
  })();

})();
