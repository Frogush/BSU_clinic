import "../styles/news_article.css"

import { newsData } from '../components/news_data.js';

function initArticle() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  
  const article = newsData.find(item => item.id === id);
  
  if (!article) {
    window.location.href = './news.html';
    return;
  }

  document.querySelector('.news-article__title').textContent = article.title;
  document.querySelector('.news-article__date').textContent = article.date;
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