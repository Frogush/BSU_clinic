import "../styles/specialists.css"

import { specialistsData } from '../components/data.js';
import { initSidebar } from "../components/sidebar.js";
import { initScrollTop } from "../components/scroll-top.js";

initSidebar();

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
initScrollTop();