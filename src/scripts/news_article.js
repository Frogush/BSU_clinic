import "../styles/news_article.css"

import { getUpdatedNewsData, incrementNewsView } from '../components/news_service.js';
import { initSidebar } from "../components/sidebar.js";
import { initScrollTop } from "../components/scroll-top.js";

initSidebar();
initScrollTop();

function initArticle() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  
  // 1. Сначала увеличиваем счетчик в памяти
  const updatedCount = incrementNewsView(id);
  
  // 2. Получаем обновленные данные
  const newsData = getUpdatedNewsData();
  const article = newsData.find(item => item.id === id);
  
  if (!article) {
    window.location.href = './news.html';
    return;
  }

  document.querySelector('.news-article__title').textContent = article.title;
  document.querySelector('.news-article__date').textContent = article.date;
  
  // Выводим обновленное количество (из LocalStorage)
  document.querySelector('.news-article__views-count').textContent = `${article.views} просмотров`;
  document.querySelector('.news-article__image').src = article.image;
  
  const contentContainer = document.querySelector('.news-article__content');
  contentContainer.innerHTML = '';
  
  article.fullContent.forEach(text => {
    const p = document.createElement('p');
    p.className = 'news-article__paragraph';
    p.textContent = text;
    contentContainer.appendChild(p);
  });
}

window.onload = initArticle;