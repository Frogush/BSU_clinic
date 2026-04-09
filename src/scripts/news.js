import "../styles/news.css"

import { getUpdatedNewsData } from '../components/news_service.js'; 
import { initSidebar } from "../components/sidebar.js";
import { initScrollTop } from "../components/scroll-top.js";

initSidebar();

const newsGrid = document.querySelector('.news__grid');
const moreBtn = document.querySelector('.news__more-btn');
let currentIndex = 0;
const ITEMS_TO_SHOW = 12;

const newsData = getUpdatedNewsData(); 

function createCard(item) {
  const article = document.createElement('article');
  article.className = 'news-card';
  article.innerHTML = `
    <div class="news-card__image-box">
      <picture>
        <img class="news-card__image" src="${item.image}" alt="${item.title}">
      </picture>
    </div>
    <div class="news-card__body">
      <h3 class="news-card__card-title">${item.title}</h3>
      <p class="news-card__text">${item.description}</p>
      <div class="news-card__meta">
        <time class="news-card__date">${item.date}</time>
        <div class="news-card__views">
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 0.5C4.66667 0.5 1.81333 2.57333 0.666667 5.5C1.81333 8.42667 4.66667 10.5 8 10.5C11.3333 10.5 14.1867 8.42667 15.3333 5.5C14.1867 2.57333 11.3333 0.5 8 0.5ZM8 8.83333C6.16 8.83333 4.66667 7.34 4.66667 5.5C4.66667 3.66 6.16 2.16667 8 2.16667C9.84 2.16667 11.3333 3.66 11.3333 5.5C11.3333 7.34 9.84 8.83333 8 8.83333ZM8 3.5C6.89333 3.5 6 4.39333 6 5.5C6 6.60667 6.89333 7.5 8 7.5C9.10667 7.5 10 6.60667 10 5.5C10 4.39333 9.10667 3.5 8 3.5Z" fill="#6D7278"/>
          </svg>
          <span class="news-card__count">${item.views}</span>
        </div>
      </div>
    </div>
  `;
  
  article.addEventListener('click', () => {
    window.location.href = `./news_article.html?id=${item.id}`;
  });
  
  return article;
}

function renderNextBatch() {
  const nextBatch = newsData.slice(currentIndex, currentIndex + ITEMS_TO_SHOW);
  nextBatch.forEach(item => {
    newsGrid.appendChild(createCard(item));
  });
  currentIndex += ITEMS_TO_SHOW;
  
  if (currentIndex >= newsData.length) {
    moreBtn.style.display = 'none';
  }
}

moreBtn.addEventListener('click', renderNextBatch);
renderNextBatch();
initScrollTop();