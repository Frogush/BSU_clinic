import "../styles/index.css"

const burger = document.querySelector('.header__burger');
const sidebar = document.querySelector('.header__sidebar');
const sidebarOverlay = document.querySelector('.header__overlay');
const sidebarClose = document.querySelector('.header__sidebar-close');
const page = document.querySelector('.page');

const modalOpenBtn = document.querySelector('#open-modal');
const modal = document.querySelector('#modal-corporate');
const modalOverlay = document.querySelector('.modal__overlay');
const modalClose = document.querySelector('.modal__close');

function openMenu() {
  sidebar.classList.add('header__sidebar_opened');
  sidebarOverlay.classList.add('header__overlay_active');
  page.style.overflow = 'hidden';
}

function closeMenu() {
  sidebar.classList.remove('header__sidebar_opened');
  sidebarOverlay.classList.remove('header__overlay_active');
  if (!modal.classList.contains('modal_opened')) {
    page.style.overflow = '';
  }
}

function openModal() {
  modal.classList.add('modal_opened');
  page.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('modal_opened');
  if (!sidebar.classList.contains('header__sidebar_opened')) {
    page.style.overflow = '';
  }
}

burger.addEventListener('click', openMenu);
sidebarClose.addEventListener('click', closeMenu);
sidebarOverlay.addEventListener('click', closeMenu);

modalOpenBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
    closeModal();
  }
});