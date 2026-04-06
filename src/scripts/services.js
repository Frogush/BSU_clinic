import "../styles/services.css"

const burger = document.querySelector('.header__burger');
const sidebar = document.querySelector('.header__sidebar');
const sidebarOverlay = document.querySelector('.header__overlay');
const sidebarClose = document.querySelector('.header__sidebar-close');
const page = document.querySelector('.page');

function openMenu() {
  sidebar.classList.add('header__sidebar_opened');
  sidebarOverlay.classList.add('header__overlay_active');
  page.style.overflow = 'hidden';
}

function closeMenu() {
  sidebar.classList.remove('header__sidebar_opened');
  sidebarOverlay.classList.remove('header__overlay_active');
  page.style.overflow = '';
}

burger.addEventListener('click', openMenu);
sidebarClose.addEventListener('click', closeMenu);
sidebarOverlay.addEventListener('click', closeMenu);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
  }
});