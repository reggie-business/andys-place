export function initUI() {
  const headshotEl = document.querySelector('.headshot');
  const piggyBankEl = document.getElementById('piggyBank');
  let isDragging = false;
  let placedInBank = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  const homePosition = { top: 32, left: 32 };

  function updateHeadshotOpacity() {
    if (!headshotEl || placedInBank) return;
    const maxScroll = 320;
    const progress = Math.min(window.scrollY / maxScroll, 1);
    if (headshotEl) headshotEl.style.opacity = (0.24 + progress * 0.26).toFixed(2);
  }

  function snapHeadshotHome() {
    if (!headshotEl) return;
    headshotEl.classList.remove('dragging');
    headshotEl.style.transition = 'left 0.35s ease, top 0.35s ease, opacity 0.2s ease';
    headshotEl.style.left = `${homePosition.left}px`;
    headshotEl.style.top = `${homePosition.top}px`;
  }

  function isOverPiggyBank(x, y) {
    if (!piggyBankEl) return false;
    const rect = piggyBankEl.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function setPiggyHighlight(active) {
    if (!piggyBankEl) return;
    piggyBankEl.classList.toggle('highlight', active);
  }

  function handlePointerDown(event) {
    if (!headshotEl || event.target !== headshotEl) return;
    isDragging = true;
    headshotEl.classList.add('dragging');
    headshotEl.style.transition = 'none';
    const headshotRect = headshotEl.getBoundingClientRect();
    dragOffsetX = event.clientX - headshotRect.left;
    dragOffsetY = event.clientY - headshotRect.top;
    setPiggyHighlight(false);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!isDragging || !headshotEl) return;
    const x = event.clientX - dragOffsetX;
    const y = event.clientY - dragOffsetY;
    headshotEl.style.left = `${x}px`;
    headshotEl.style.top = `${y}px`;
    setPiggyHighlight(isOverPiggyBank(event.clientX, event.clientY));
  }

  function handlePointerUp(event) {
    if (!isDragging || !headshotEl) return;
    isDragging = false;
    headshotEl.classList.remove('dragging');

    if (isOverPiggyBank(event.clientX, event.clientY)) {
      const bankRect = piggyBankEl.getBoundingClientRect();
      headshotEl.style.left = `${bankRect.left + bankRect.width / 2 - headshotEl.offsetWidth / 2}px`;
      headshotEl.style.top = `${bankRect.top + bankRect.height / 2 - headshotEl.offsetHeight / 2}px`;
      headshotEl.style.opacity = '0.5';
      placedInBank = true;
    } else {
      placedInBank = false;
      snapHeadshotHome();
    }

    setPiggyHighlight(false);
  }

  if (headshotEl) {
    headshotEl.addEventListener('pointerdown', handlePointerDown);
  }

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('scroll', updateHeadshotOpacity, { passive: true });
  updateHeadshotOpacity();
}
