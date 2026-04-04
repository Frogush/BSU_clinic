import "../styles/index.css"

const burger = document.querySelector('.header__burger');
const sidebar = document.querySelector('.header__sidebar');
const overlay = document.querySelector('.header__overlay');
const closeBtn = document.querySelector('.header__sidebar-close');
const page = document.querySelector('.page');

function openMenu() {
  sidebar.classList.add('header__sidebar_opened');
  overlay.classList.add('header__overlay_active');
  page.style.overflow = 'hidden';
}

function closeMenu() {
  sidebar.classList.remove('header__sidebar_opened');
  overlay.classList.remove('header__overlay_active');
  page.style.overflow = '';
}

burger.addEventListener('click', openMenu);
closeBtn.addEventListener('click', closeMenu);
overlay.addEventListener('click', closeMenu);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
  }
});