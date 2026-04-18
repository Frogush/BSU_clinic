import "../styles/news_article.css"
import { initSidebar } from "../components/sidebar.js";
import { initScrollTop } from "../components/scroll-top.js";

initSidebar();
initScrollTop();

async function initArticle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    console.log("ID новости из URL:", id); // Проверка ID

    if (!id) {
        console.warn("ID не найден, возврат на страницу новостей");
        window.location.href = './news.html';
        return;
    }

    try {
        // 1. Сначала засчитываем просмотр (метод POST)
        console.log("Отправка запроса на увеличение просмотров...");
        await fetch(`/api/news/${id}/view`, { method: 'POST' });

        // 2. Получаем данные новости (ИСПРАВЛЕННЫЙ URL)
        console.log("Загрузка данных новости...");
        const response = await fetch(`/api/news/${id}`); 
        
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }

        const article = await response.json();
        console.log("Данные получены:", article);

        // Заполняем элементы страницы
        document.querySelector('.news-article__title').textContent = article.title;
        document.querySelector('.news-article__date').textContent = article.date;
        document.querySelector('.news-article__views-count').textContent = `${article.views} просмотров`;
        
        // Картинка
        const imgElement = document.querySelector('.news-article__image');
        if (imgElement) imgElement.src = article.image_url;

        // Контент (абзацы)
        const contentContainer = document.querySelector('.news-article__content');
        if (contentContainer) {
            contentContainer.innerHTML = '';
            // Проверяем, что content — это массив (мы его парсим в index.js на бекенде)
            const paragraphs = Array.isArray(article.content) ? article.content : [];
            
            paragraphs.forEach(text => {
                const p = document.createElement('p');
                p.className = 'news-article__paragraph';
                p.textContent = text;
                contentContainer.appendChild(p);
            });
        }

    } catch (error) {
        console.error("Критическая ошибка при загрузке статьи:", error);
        // Временно закомментируй строку ниже, чтобы страница НЕ улетала назад, 
        // и ты мог увидеть ошибки в консоли браузера (F12)
        // window.location.href = './news.html';
    }
}

// Используем DOMContentLoaded вместо onload для надежности
document.addEventListener('DOMContentLoaded', initArticle);