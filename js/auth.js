export function initAuth({ password = 'andysplace' } = {}) {
  const body = document.body;
  const pwInput = document.getElementById('passwordInput');
  const pwSubmit = document.getElementById('passwordSubmit');
  const pwError = document.getElementById('passwordError');

  const unlock = () => {
    body.classList.add('unlocked');
    const gateEl = document.getElementById('passwordGate');
    const pageEl = document.getElementById('pageContent');
    if (gateEl) gateEl.style.display = 'none';
    if (pageEl) pageEl.style.display = 'block';
    localStorage.setItem('siteUnlocked', 'true');
  };

  const lock = () => {
    body.classList.remove('unlocked');
    const gateEl = document.getElementById('passwordGate');
    const pageEl = document.getElementById('pageContent');
    if (gateEl) gateEl.style.display = 'flex';
    if (pageEl) pageEl.style.display = 'none';
  };

  const showError = (msg) => {
    if (pwError) pwError.textContent = msg;
    if (pwInput) pwInput.focus();
  };

  const check = () => {
    if (!pwInput) return;
    if (pwInput.value === password) unlock();
    else showError('Incorrect password.');
  };

  if (localStorage.getItem('siteUnlocked') === 'true') unlock();
  else lock();

  if (pwSubmit) pwSubmit.addEventListener('click', check);
  if (pwInput) pwInput.addEventListener('keydown', (e) => e.key === 'Enter' && check());

  // Mark that auth was initialized (used by a non-module fallback detection)
  try {
    window.__authInitialized = true;
  } catch (e) {
    // ignore
  }

  return { unlock, lock };
}
