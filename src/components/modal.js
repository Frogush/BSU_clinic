export function initModal() {
  const modalOpenBtn = document.querySelector('#open-modal');
  const modal = document.querySelector('#modal-corporate');
  const modalOverlay = document.querySelector('.modal__overlay');
  const modalClose = document.querySelector('.modal__close');
  const sidebar = document.querySelector('.header__sidebar');
  const page = document.querySelector('.page');

  if (!modal || !modalOpenBtn) return;

  function openModal() {
    modal.classList.add('modal_opened');
    if (page) page.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('modal_opened');
    
    const isSidebarOpened = sidebar?.classList.contains('header__sidebar_opened');
    if (page && !isSidebarOpened) {
      page.style.overflow = '';
    }
  }

  modalOpenBtn.addEventListener('click', openModal);

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', closeModal);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('modal_opened')) {
      closeModal();
    }
  });
}