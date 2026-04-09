import { newsData } from './data.js';

const STORAGE_KEY = 'polyclinic_news_views';

function getStoredViews() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
}

function saveView(id, count) {
    const views = getStoredViews();
    views[id] = count;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export function getUpdatedNewsData() {
    const storedViews = getStoredViews();
    return newsData.map(item => {
        if (storedViews[item.id]) {
            return { ...item, views: storedViews[item.id] };
        }
        return item;
    });
}

export function incrementNewsView(id) {
    const data = getUpdatedNewsData();
    const article = data.find(item => item.id === id);
    
    if (article) {
        let currentCount = parseInt(article.views.toString().replace(/\s|,/g, '')) || 0;
        currentCount++;

        const newCountStr = currentCount.toLocaleString('ru-RU');
        saveView(id, newCountStr);
        return newCountStr;
    }
    return null;
}