import "../styles/specialists.css"

import { specialistsData } from '../components/news_data.js';

let activeId = specialistsData[0].id;

const gridContainer = document.getElementById('specialists-grid');
const detailSection = document.getElementById('specialist-view');

function updateDetail(id) {
  const data = specialistsData.find(s => s.id === id);
  const index = specialistsData.indexOf(data) + 1;
  
  detailSection.querySelector('.detailed-card__image').src = data.image;
  detailSection.querySelector('#current-num').textContent = index;
  detailSection.querySelector('#total-num').textContent = specialistsData.length;
  detailSection.querySelector('.detailed-card__name').textContent = data.name;
  detailSection.querySelector('.detailed-card__titles').textContent = data.titles;
  detailSection.querySelector('#spec-exp').textContent = data.experience;
  detailSection.querySelector('#spec-cat').textContent = data.category;
  
  const eduList = detailSection.querySelector('.detailed-card__edu-list');
  eduList.innerHTML = data.education.map(item => `<li>${item}</li>`).join('');
  
  activeId = id;
  renderGrid();
}

function renderGrid() {
  gridContainer.innerHTML = '';
  specialistsData.forEach(item => {
    const card = document.createElement('article');
    card.className = `grid-card ${item.id === activeId ? 'grid-card_active' : ''}`;
    card.innerHTML = `
      <img class="grid-card__img" src="${item.image}" alt="${item.name}">
      <div class="grid-card__info">
        <h4 class="grid-card__name">${item.name}</h4>
        <p class="grid-card__titles">${item.titles}</p>
      </div>
    `;
    card.onclick = () => {
      updateDetail(item.id);
      window.scrollTo({ top: detailSection.offsetTop - 50, behavior: 'smooth' });
    };
    gridContainer.appendChild(card);
  });
}

document.querySelector('.detailed-card__arrow_next').onclick = () => {
  const currIdx = specialistsData.findIndex(s => s.id === activeId);
  const nextIdx = (currIdx + 1) % specialistsData.length;
  updateDetail(specialistsData[nextIdx].id);
};

document.querySelector('.detailed-card__arrow_prev').onclick = () => {
  const currIdx = specialistsData.findIndex(s => s.id === activeId);
  const prevIdx = (currIdx - 1 + specialistsData.length) % specialistsData.length;
  updateDetail(specialistsData[prevIdx].id);
};

updateDetail(activeId);

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