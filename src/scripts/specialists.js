import "../styles/specialists.css";
import { initSidebar } from "../components/sidebar.js";
import { initScrollTop } from "../components/scroll-top.js";

initSidebar();

// Создаем пустую переменную для данных
let specialistsData = [];
let activeId = null;

const gridContainer = document.getElementById('specialists-grid');
const detailSection = document.getElementById('specialist-view');

// 1. Главная функция инициализации страницы
async function initSpecialistsPage() {
  try {
    const response = await fetch('/api/specialists');
    specialistsData = await response.json();

    if (specialistsData.length > 0) {
      activeId = specialistsData[0].id; // Берем первого из списка
      updateDetail(activeId);
      renderGrid();
    }
  } catch (error) {
    console.error("Ошибка загрузки специалистов:", error);
    gridContainer.innerHTML = '<p>Ошибка загрузки данных</p>';
  }
}

function updateDetail(id) {
  const data = specialistsData.find(s => s.id === id);
  if (!data) return;

  const index = specialistsData.indexOf(data) + 1;
  
  // ВАЖНО: используем image_url (как в базе), а не image
  detailSection.querySelector('.detailed-card__image').src = data.image_url;
  detailSection.querySelector('#current-num').textContent = index;
  detailSection.querySelector('#total-num').textContent = specialistsData.length;
  detailSection.querySelector('.detailed-card__name').textContent = data.name;
  detailSection.querySelector('.detailed-card__titles').textContent = data.titles;
  detailSection.querySelector('#spec-exp').textContent = data.experience;
  detailSection.querySelector('#spec-cat').textContent = data.category;
  
  const eduList = detailSection.querySelector('.detailed-card__edu-list');
  // education уже распарсен в массив на стороне сервера (в нашем index.js)
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
      <img class="grid-card__img" src="${item.image_url}" alt="${item.name}">
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

// Слушатели кнопок "Туда-Сюда"
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

// Запускаем процесс
initSpecialistsPage();
initScrollTop();