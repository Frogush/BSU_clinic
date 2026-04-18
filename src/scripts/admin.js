import "../styles/admin.css";

const root = document.getElementById('admin-root');
const API_URL = 'http://localhost:3000/api';

// Состояние приложения
let currentUser = null;
let authToken = localStorage.getItem('adminToken');

const tabs = [
    { id: 'admins', name: 'Администраторы' },
    { id: 'news', name: 'Новости' },
    { id: 'specialists', name: 'Специалисты' },
    { id: 'services', name: 'Услуги и категории' },
    { id: 'docs', name: 'Документация' },
    { id: 'contacts', name: 'Контакты и график' }
];

// Глобальная переменная для функции очистки текущей вкладки
let currentTabCleanup = null;

// ============= API КЛИЕНТ =============
async function apiRequest(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    
    const headers = { ...options.headers };
    
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            logout();
            throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
        }
        
        const contentType = response.headers.get('content-type');
        
        if (!response.ok) {
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка запроса');
            } else {
                const textError = await response.text();
                console.error('Non-JSON error response:', textError.substring(0, 200));
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
        }
        
        if (response.status === 204) {
            return { success: true };
        }
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return data;
        } else {
            if (response.ok) {
                return { success: true };
            }
            throw new Error('Неожиданный формат ответа от сервера');
        }
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// ============= УПРАВЛЕНИЕ СКРОЛЛОМ =============
function getScrollbarWidth() {
    const div = document.createElement('div');
    div.style.overflow = 'scroll';
    div.style.width = '50px';
    div.style.height = '50px';
    document.body.appendChild(div);
    const scrollbarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);
    return scrollbarWidth;
}

function disableBodyScroll() {
    const scrollbarWidth = getScrollbarWidth();
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.classList.add('admin-modal-open');
}

function enableBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.classList.remove('admin-modal-open');
}

// ============= БАЗОВЫЙ КЛАСС ДЛЯ МОДАЛЬНЫХ ОКОН =============
class ModalManager {
    constructor(modalElement, onClose = null) {
        this.modal = modalElement;
        this.onClose = onClose;
        this.closeButton = modalElement.querySelector('.modal-close-btn');
        this.cancelButton = modalElement.querySelector('.modal-cancel-btn');
        
        // Привязываем методы
        this.close = this.close.bind(this);
        this.handleEsc = this.handleEsc.bind(this);
        this.handleOverlayClick = this.handleOverlayClick.bind(this);
        
        // Добавляем обработчики
        if (this.closeButton) {
            this.closeButton.addEventListener('click', this.close);
        }
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', this.close);
        }
        
        const overlay = modalElement.querySelector('.admin-modal__overlay');
        if (overlay) {
            overlay.addEventListener('click', this.handleOverlayClick);
        }
        
        document.addEventListener('keydown', this.handleEsc);
    }
    
    handleEsc(e) {
        if (e.key === 'Escape' && this.modal.style.display === 'flex') {
            this.close();
        }
    }
    
    handleOverlayClick(e) {
        if (e.target === e.currentTarget) {
            this.close();
        }
    }
    
    open() {
        this.modal.style.display = 'flex';
        disableBodyScroll();
    }
    
    close() {
        this.modal.style.display = 'none';
        enableBodyScroll();
        if (this.onClose) {
            this.onClose();
        }
    }
    
    destroy() {
        document.removeEventListener('keydown', this.handleEsc);
        if (this.closeButton) {
            this.closeButton.removeEventListener('click', this.close);
        }
        if (this.cancelButton) {
            this.cancelButton.removeEventListener('click', this.close);
        }
        const overlay = this.modal.querySelector('.admin-modal__overlay');
        if (overlay) {
            overlay.removeEventListener('click', this.handleOverlayClick);
        }
        this.modal.remove();
    }
}

// ============= АВТОРИЗАЦИЯ =============
async function login(username, password) {
    const data = await apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (data.success && data.token) {
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('adminToken', authToken);
        localStorage.setItem('adminUser', JSON.stringify(currentUser));
        return true;
    }
    
    return false;
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    renderLogin();
}

async function checkAuth() {
    if (!authToken) return false;
    
    try {
        const data = await apiRequest('/admin/verify', { method: 'POST' });
        if (data.valid) {
            currentUser = data.user;
            return true;
        }
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
    }
    
    return false;
}

// ============= УПРАВЛЕНИЕ АДМИНИСТРАТОРАМИ =============
async function loadAdmins() {
    try {
        return await apiRequest('/admins');
    } catch (error) {
        console.error('Ошибка загрузки администраторов:', error);
        return [];
    }
}

async function createAdmin(username, password) {
    return await apiRequest('/admins', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
}

async function updateAdmin(id, username, password = null) {
    const data = { username };
    if (password && password.trim()) {
        data.password = password;
    }
    return await apiRequest(`/admins/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteAdmin(id) {
    return await apiRequest(`/admins/${id}`, {
        method: 'DELETE'
    });
}

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `admin-notification admin-notification_${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('admin-notification_show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('admin-notification_show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============= ВХОД =============
function renderLogin() {
    root.innerHTML = `
        <div class="admin-login">
            <div class="admin-login__card">
                <h1 class="admin-login__title">Авторизация</h1>
                <form class="admin-login__form" id="login-form">
                    <input type="text" class="admin-input" placeholder="Логин" id="username" required autocomplete="off">
                    <input type="password" class="admin-input" placeholder="Пароль" id="password" required>
                    <button type="submit" class="admin-btn">Войти</button>
                </form>
                <div id="login-error" class="admin-login__error" style="display:none;"></div>
            </div>
        </div>
    `;

    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const success = await login(username, password);
            if (success) {
                renderDashboard();
            } else {
                errorDiv.textContent = 'Неверный логин или пароль';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    };
}

// ============= ДАШБОРД =============
function renderDashboard() {
    // Очищаем предыдущую вкладку
    if (currentTabCleanup) {
        currentTabCleanup();
        currentTabCleanup = null;
    }
    
    root.innerHTML = `
        <div class="admin-panel">
            <aside class="admin-sidebar" id="sidebar">
                <div class="admin-sidebar__logo">Поликлиника БелГУ</div>
                <div class="admin-sidebar__user">
                    <span>👤 ${currentUser?.username || 'Admin'}</span>
                    ${currentUser?.isMainAdmin ? '<span class="admin-badge admin-badge_main">Главный</span>' : ''}
                </div>
                <nav class="admin-nav">
                    ${tabs.map(t => `<button class="admin-nav__btn" data-tab="${t.id}">${t.name}</button>`).join('')}
                    
                    <div class="admin-nav__bottom">
                        <a href="/index.html" class="admin-nav__btn admin-nav__btn_site">На главную сайта</a>
                        <button class="admin-nav__btn admin-nav__btn_logout" id="logout">Выйти</button>
                    </div>
                </nav>
            </aside>
            
            <main class="admin-main">
                <header class="admin-header">
                    <button class="admin-header__burger" id="burger-admin">
                        <svg width="24" height="24" fill="none" stroke="#1D2330" stroke-width="2">
                            <path d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                    <h1 class="admin-header__title" id="tab-title">Раздел</h1>
                </header>
                <div class="admin-content" id="tab-content"></div>
            </main>
        </div>
    `;
    
    initDashboardEvents();
    switchTab('admins');
}

function switchTab(tabId) {
    // Очищаем предыдущую вкладку
    if (currentTabCleanup) {
        currentTabCleanup();
        currentTabCleanup = null;
    }
    
    const tab = tabs.find(t => t.id === tabId);
    document.getElementById('tab-title').textContent = tab.name;
    document.querySelectorAll('.admin-nav__btn').forEach(btn => {
        btn.classList.toggle('admin-nav__btn_active', btn.dataset.tab === tabId);
    });
    renderTabContent(tabId, document.getElementById('tab-content'));
}

function renderTabContent(id, container) {
    switch(id) {
        case 'admins':
            renderAdminsTab(container);
            break;
        case 'news':
            renderNewsTab(container);
            break;
        case 'specialists':
            renderSpecialistsTab(container);
            break;
        case 'services':
            renderServicesTab(container);
            break;
        case 'docs':
            renderDocsTab(container);
            break;
        case 'contacts':
            renderContactsTab(container);
            break;
    }
}

function initDashboardEvents() {
    document.getElementById('logout').onclick = () => logout();
    
    document.getElementById('burger-admin').onclick = () => {
        document.getElementById('sidebar').classList.toggle('admin-sidebar_opened');
    };
    
    document.querySelectorAll('.admin-nav__btn[data-tab]').forEach(btn => {
        btn.onclick = () => {
            switchTab(btn.dataset.tab);
            document.getElementById('sidebar').classList.remove('admin-sidebar_opened');
        };
    });
}

// ============= АДМИНИСТРАТОРЫ =============
// ============= АДМИНИСТРАТОРЫ =============
async function renderAdminsTab(container) {
    container.innerHTML = `
        <section class="admin-section">
            <div class="admin-section__header">
                <h3 class="admin-section__title">Список администраторов</h3>
                <button class="admin-btn admin-btn_add" id="add-admin-btn">+ Добавить администратора</button>
            </div>
            <div id="admins-list">
                <div class="admin-loading">Загрузка...</div>
            </div>
        </section>
    `;
    
    let modalManager = null;
    let editingId = null;
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="admin-modal__overlay"></div>
        <div class="admin-modal__content">
            <h3 id="admin-modal-title">Добавить администратора</h3>
            <form id="admin-form">
                <div class="admin-form__group">
                    <label for="admin-username">Логин *</label>
                    <input type="text" id="admin-username" class="admin-input" placeholder="Введите логин" required autocomplete="off">
                </div>
                <div class="admin-form__group">
                    <label for="admin-password">Пароль</label>
                    <input type="password" id="admin-password" class="admin-input" placeholder="Введите пароль (мин. 4 символа)">
                    <small class="admin-hint" id="password-hint">Минимум 4 символа</small>
                </div>
                <div class="admin-modal__actions">
                    <button type="submit" class="admin-btn">Сохранить</button>
                    <button type="button" class="admin-btn admin-btn_secondary modal-cancel-btn">Отмена</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modalManager = new ModalManager(modal);
    
    async function loadAndRenderAdmins() {
        const admins = await loadAdmins();
        const listDiv = document.getElementById('admins-list');
        
        if (admins.length === 0) {
            listDiv.innerHTML = '<div class="admin-empty">Нет администраторов</div>';
            return;
        }
        
        listDiv.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>Логин</th><th>Статус</th><th>Действия</th></tr>
                </thead>
                <tbody>
                    ${admins.map(admin => `
                        <tr data-id="${admin.id}">
                            <td>${admin.id}</td>
                            <td class="js-username">${escapeHtml(admin.username)}</td>
                            <td>${admin.isMainAdmin ? '<span class="admin-badge admin-badge_main">Главный</span>' : 'Обычный'}</td>
                            <td>
                                <div class="admin-actions">
                                    ${!admin.isMainAdmin ? `
                                        <button class="admin-btn-edit js-edit-admin" data-id="${admin.id}" data-username="${escapeHtml(admin.username)}">Ред.</button>
                                        <button class="admin-btn-del js-delete-admin" data-id="${admin.id}" data-username="${escapeHtml(admin.username)}">Удалить</button>
                                    ` : '<span class="admin-badge">Нельзя редактировать</span>'}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.querySelectorAll('.js-edit-admin').forEach(btn => {
            btn.onclick = () => {
                editingId = parseInt(btn.dataset.id);
                const username = btn.dataset.username;
                document.getElementById('admin-modal-title').textContent = 'Редактировать администратора';
                document.getElementById('admin-username').value = username;
                document.getElementById('admin-password').value = '';
                document.getElementById('admin-password').placeholder = 'Новый пароль (оставьте пустым, чтобы не менять)';
                const hint = document.getElementById('password-hint');
                if (hint) hint.textContent = 'Оставьте пустым, чтобы оставить текущий пароль';
                modalManager.open();
            };
        });
        
        document.querySelectorAll('.js-delete-admin').forEach(btn => {
            btn.onclick = async () => {
                const id = parseInt(btn.dataset.id);
                const username = btn.dataset.username;
                if (confirm(`Вы уверены, что хотите удалить администратора "${username}"?`)) {
                    try {
                        await deleteAdmin(id);
                        await loadAndRenderAdmins();
                        showNotification('Администратор удален', 'success');
                    } catch (error) {
                        showNotification(error.message, 'error');
                    }
                }
            };
        });
    }
    
    document.getElementById('add-admin-btn').onclick = () => {
        editingId = null;
        document.getElementById('admin-modal-title').textContent = 'Добавить администратора';
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').placeholder = 'Введите пароль (мин. 4 символа)';
        const hint = document.getElementById('password-hint');
        if (hint) hint.textContent = 'Минимум 4 символа';
        modalManager.open();
    };
    
    document.getElementById('admin-form').onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;
        
        if (!username) {
            showNotification('Введите логин', 'error');
            return;
        }
        
        if (!editingId && (!password || password.length < 4)) {
            showNotification('Пароль должен содержать минимум 4 символа', 'error');
            return;
        }
        
        try {
            if (editingId) {
                await updateAdmin(editingId, username, password);
                showNotification('Администратор обновлен', 'success');
            } else {
                await createAdmin(username, password);
                showNotification('Администратор создан', 'success');
            }
            modalManager.close();
            await loadAndRenderAdmins();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    currentTabCleanup = () => {
        if (modalManager) modalManager.destroy();
    };
    
    await loadAndRenderAdmins();
}

// ============= НОВОСТИ =============
async function renderNewsTab(container) {
    container.innerHTML = `
        <section class="admin-section">
            <div class="admin-section__header">
                <h3 class="admin-section__title">Управление новостями</h3>
                <button class="admin-btn admin-btn_add" id="create-news-btn">+ Создать новость</button>
            </div>
            <div id="news-list"><div class="admin-loading">Загрузка...</div></div>
        </section>
    `;
    
    let modalManager = null;
    let editingNewsId = null;
    let paragraphs = [];
    let currentImageFile = null;
    let deleteCurrentImage = false;
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'admin-modal admin-modal_large';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="admin-modal__overlay"></div>
        <div class="admin-modal__content admin-modal__content_large">
            <h3 id="news-modal-title">Создать новость</h3>
            <form id="news-form">
                <div class="admin-form__group">
                    <label>Заголовок *</label>
                    <input type="text" id="news-title" class="admin-input" required>
                </div>
                <div class="admin-form__group">
                    <label>Краткое описание *</label>
                    <textarea id="news-description" class="admin-textarea" rows="3" required></textarea>
                </div>
                <div class="admin-form__group">
                    <label>Изображение *</label>
                    <div class="admin-file-upload">
                        <input type="file" id="news-image" accept="image/*" class="admin-file-input">
                        <div class="admin-file-upload__label">📁 Нажмите для выбора файла</div>
                        <div id="news-image-preview" class="admin-image-preview"></div>
                        <button type="button" id="remove-news-image" class="admin-btn-remove" style="display:none;">Удалить изображение</button>
                    </div>
                </div>
                <div class="admin-form__group">
                    <label>Содержание (абзацы)</label>
                    <div id="paragraphs-container" class="admin-paragraphs-container"></div>
                    <button type="button" id="add-paragraph" class="admin-btn admin-btn_secondary">+ Добавить абзац</button>
                </div>
                <div class="admin-modal__actions">
                    <button type="submit" class="admin-btn">Сохранить</button>
                    <button type="button" class="admin-btn admin-btn_secondary modal-cancel-btn">Отмена</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modalManager = new ModalManager(modal);
    
    function renderParagraphs() {
        const container = document.getElementById('paragraphs-container');
        if (!container) return;
        container.innerHTML = paragraphs.map((paragraph, index) => `
            <div class="admin-paragraph-item">
                <textarea class="admin-textarea admin-paragraph-text" data-index="${index}" rows="3">${escapeHtml(paragraph)}</textarea>
                <button type="button" class="admin-btn-remove-paragraph" data-index="${index}">✕</button>
            </div>
        `).join('');
        
        document.querySelectorAll('.admin-paragraph-text').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                paragraphs[index] = e.target.value;
            });
        });
        document.querySelectorAll('.admin-btn-remove-paragraph').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                paragraphs.splice(index, 1);
                renderParagraphs();
            };
        });
    }
    
    function initFileUpload() {
        const fileInput = modal.querySelector('#news-image');
        const removeBtn = document.getElementById('remove-news-image');
        
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    currentImageFile = file;
                    deleteCurrentImage = false;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const preview = document.getElementById('news-image-preview');
                        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                        if (removeBtn) removeBtn.style.display = 'inline-block';
                    };
                    reader.readAsDataURL(file);
                }
            };
        }
        
        if (removeBtn) {
            removeBtn.onclick = () => {
                deleteCurrentImage = true;
                document.getElementById('news-image-preview').innerHTML = '';
                removeBtn.style.display = 'none';
                currentImageFile = null;
                if (fileInput) fileInput.value = '';
            };
        }
        
        const fileUploadDiv = modal.querySelector('.admin-file-upload');
        if (fileUploadDiv && fileInput) {
            fileUploadDiv.style.cursor = 'pointer';
            fileUploadDiv.onclick = (e) => {
                e.stopPropagation();
                fileInput.click();
            };
        }
    }
    
    async function loadAndRenderNews() {
        try {
            const news = await apiRequest('/admin/news');
            const listDiv = document.getElementById('news-list');
            if (!listDiv) return;
            if (!news || news.length === 0) {
                listDiv.innerHTML = '<div class="admin-empty">Нет новостей. Создайте первую новость!</div>';
                return;
            }
            listDiv.innerHTML = `<div class="admin-cards-grid">${news.map(item => `
                <div class="admin-news-card" data-id="${item.id}">
                    ${item.image_url ? `<img src="http://localhost:3000${item.image_url}" alt="${escapeHtml(item.title)}" class="admin-news-card__image">` : '<div class="admin-news-card__image admin-news-card__image_placeholder">📰</div>'}
                    <div class="admin-news-card__content">
                        <h4>${escapeHtml(item.title)}</h4>
                        <p class="admin-news-card__date">${new Date(item.date).toLocaleString('ru-RU')}</p>
                        <p class="admin-news-card__description">${escapeHtml(item.description.substring(0, 100))}${item.description.length > 100 ? '...' : ''}</p>
                        <div class="admin-news-card__stats"><span>👁️ ${item.views || 0} просмотров</span><span>📄 ${item.content?.length || 0} абзацев</span></div>
                        <div class="admin-news-card__actions">
                            <button class="admin-btn-edit js-edit-news" data-id="${item.id}">Редактировать</button>
                            <button class="admin-btn-del js-delete-news" data-id="${item.id}">Удалить</button>
                        </div>
                    </div>
                </div>
            `).join('')}</div>`;
            
            document.querySelectorAll('.js-edit-news').forEach(btn => {
                btn.onclick = async () => {
                    const id = parseInt(btn.dataset.id);
                    await loadNewsForEdit(id);
                    modalManager.open();
                };
            });
            document.querySelectorAll('.js-delete-news').forEach(btn => {
                btn.onclick = async () => {
                    const id = parseInt(btn.dataset.id);
                    if (confirm('Вы уверены, что хотите удалить эту новость?')) {
                        try {
                            await apiRequest(`/admin/news/${id}`, { method: 'DELETE' });
                            showNotification('Новость удалена', 'success');
                            await loadAndRenderNews();
                        } catch (error) {
                            showNotification(error.message, 'error');
                        }
                    }
                };
            });
        } catch (error) {
            document.getElementById('news-list').innerHTML = `<div class="admin-error">Ошибка загрузки новостей: ${error.message}</div>`;
        }
    }
    
    async function loadNewsForEdit(id) {
        try {
            const news = await apiRequest(`/admin/news/${id}`);
            editingNewsId = id;
            document.getElementById('news-modal-title').textContent = 'Редактировать новость';
            document.getElementById('news-title').value = news.title;
            document.getElementById('news-description').value = news.description;
            paragraphs = news.content || [];
            renderParagraphs();
            if (news.image_url) {
                document.getElementById('news-image-preview').innerHTML = `<img src="http://localhost:3000${news.image_url}" alt="Preview">`;
                document.getElementById('remove-news-image').style.display = 'inline-block';
                deleteCurrentImage = false;
            } else {
                document.getElementById('news-image-preview').innerHTML = '';
                document.getElementById('remove-news-image').style.display = 'none';
            }
            currentImageFile = null;
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
    
    document.getElementById('create-news-btn').onclick = () => {
        editingNewsId = null;
        document.getElementById('news-modal-title').textContent = 'Создать новость';
        document.getElementById('news-title').value = '';
        document.getElementById('news-description').value = '';
        paragraphs = [];
        renderParagraphs();
        document.getElementById('news-image-preview').innerHTML = '';
        document.getElementById('remove-news-image').style.display = 'none';
        currentImageFile = null;
        deleteCurrentImage = false;
        modalManager.open();
    };
    
    document.getElementById('add-paragraph').onclick = () => {
        paragraphs.push('');
        renderParagraphs();
        setTimeout(() => {
            const last = document.querySelector('.admin-paragraph-text:last-child');
            if (last) last.focus();
        }, 100);
    };
    
    document.getElementById('news-form').onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('news-title').value.trim();
        const description = document.getElementById('news-description').value.trim();
        
        if (!editingNewsId && !currentImageFile) {
            showNotification('Загрузите изображение для новости', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('content', JSON.stringify(paragraphs.filter(p => p.trim())));
        if (currentImageFile) formData.append('image', currentImageFile);
        if (deleteCurrentImage && editingNewsId) formData.append('deleteImage', 'true');
        
        try {
            if (editingNewsId) {
                await apiRequest(`/admin/news/${editingNewsId}`, { method: 'PUT', body: formData });
                showNotification('Новость обновлена', 'success');
            } else {
                await apiRequest('/admin/news', { method: 'POST', body: formData });
                showNotification('Новость создана', 'success');
            }
            modalManager.close();
            await loadAndRenderNews();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    initFileUpload();
    currentTabCleanup = () => { if (modalManager) modalManager.destroy(); };
    await loadAndRenderNews();
}

// ============= СПЕЦИАЛИСТЫ =============
async function renderSpecialistsTab(container) {
    container.innerHTML = `
        <section class="admin-section">
            <div class="admin-section__header">
                <h3 class="admin-section__title">Управление специалистами</h3>
                <button class="admin-btn admin-btn_add" id="create-specialist-btn">+ Добавить специалиста</button>
            </div>
            <div id="specialists-list"><div class="admin-loading">Загрузка...</div></div>
        </section>
    `;
    
    let modalManager = null;
    let editingSpecialistId = null;
    let educationItems = [];
    let currentImageFile = null;
    let deleteCurrentImage = false;
    
    const modal = document.createElement('div');
    modal.className = 'admin-modal admin-modal_large';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="admin-modal__overlay"></div>
        <div class="admin-modal__content admin-modal__content_large">
            <h3 id="specialist-modal-title">Добавить специалиста</h3>
            <form id="specialist-form">
                <div class="admin-form__grid">
                    <div class="admin-form__group"><label>ФИО врача *</label><input type="text" id="specialist-name" class="admin-input" required></div>
                    <div class="admin-form__group"><label>Должности/регалии *</label><input type="text" id="specialist-titles" class="admin-input" required></div>
                    <div class="admin-form__group"><label>Стаж работы (лет) *</label><input type="number" id="specialist-experience" class="admin-input" min="0" required></div>
                    <div class="admin-form__group"><label>Категория *</label><input type="text" id="specialist-category" class="admin-input" required></div>
                </div>
                <div class="admin-form__group">
                    <label>Фото врача</label>
                    <div class="admin-file-upload" id="specialist-file-upload">
                        <input type="file" id="specialist-image" accept="image/*" class="admin-file-input">
                        <div class="admin-file-upload__label">📁 Нажмите для выбора фото</div>
                        <div id="specialist-image-preview" class="admin-image-preview"></div>
                        <button type="button" id="remove-specialist-image" class="admin-btn-remove" style="display:none;">Удалить фото</button>
                    </div>
                </div>
                <div class="admin-form__group">
                    <label>Образование</label>
                    <div id="education-container" class="admin-paragraphs-container"></div>
                    <button type="button" id="add-education" class="admin-btn admin-btn_secondary">+ Добавить образование</button>
                </div>
                <div class="admin-modal__actions">
                    <button type="submit" class="admin-btn">Сохранить</button>
                    <button type="button" class="admin-btn admin-btn_secondary modal-cancel-btn">Отмена</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modalManager = new ModalManager(modal);
    
    function renderEducation() {
        const container = document.getElementById('education-container');
        if (!container) return;
        container.innerHTML = educationItems.map((item, index) => `
            <div class="admin-paragraph-item">
                <textarea class="admin-textarea admin-paragraph-text" data-index="${index}" rows="2" placeholder="Введите информацию об образовании...">${escapeHtml(item)}</textarea>
                ${index > 0 ? `<button type="button" class="admin-btn-remove-paragraph" data-index="${index}">✕</button>` : '<span class="admin-required-badge">Обязательно</span>'}
            </div>
        `).join('');
        document.querySelectorAll('#education-container .admin-paragraph-text').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                educationItems[index] = e.target.value;
            });
        });
        document.querySelectorAll('#education-container .admin-btn-remove-paragraph').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                if (index > 0) { educationItems.splice(index, 1); renderEducation(); }
            };
        });
    }
    
    function initFileUpload() {
        const fileInput = modal.querySelector('#specialist-image');
        const removeBtn = document.getElementById('remove-specialist-image');
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    currentImageFile = file;
                    deleteCurrentImage = false;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        document.getElementById('specialist-image-preview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                        if (removeBtn) removeBtn.style.display = 'inline-block';
                    };
                    reader.readAsDataURL(file);
                }
            };
        }
        if (removeBtn) {
            removeBtn.onclick = () => {
                deleteCurrentImage = true;
                document.getElementById('specialist-image-preview').innerHTML = '';
                removeBtn.style.display = 'none';
                currentImageFile = null;
                if (fileInput) fileInput.value = '';
            };
        }
        const fileUploadDiv = modal.querySelector('#specialist-file-upload');
        if (fileUploadDiv && fileInput) {
            fileUploadDiv.style.cursor = 'pointer';
            fileUploadDiv.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
        }
    }
    
    async function loadAndRenderSpecialists() {
        try {
            const specialists = await apiRequest('/admin/specialists');
            const listDiv = document.getElementById('specialists-list');
            if (!listDiv) return;
            if (!specialists || specialists.length === 0) {
                listDiv.innerHTML = '<div class="admin-empty">Нет специалистов. Добавьте первого специалиста!</div>';
                return;
            }
            listDiv.innerHTML = `<div class="admin-cards-grid">${specialists.map(item => `
                <div class="admin-news-card">
                    <img src="http://localhost:3000${item.image_url || '/uploads/specialists_images/doctor_0.png'}" alt="${escapeHtml(item.name)}" class="admin-news-card__image">
                    <div class="admin-news-card__content">
                        <h4>${escapeHtml(item.name)}</h4>
                        <p class="admin-specialist-titles">${escapeHtml(item.titles)}</p>
                        <div class="admin-specialist-info"><span>⭐ Стаж: ${item.experience} лет</span><span>📋 Категория: ${escapeHtml(item.category)}</span></div>
                        <div class="admin-news-card__stats"><span>🎓 ${item.education?.length || 0} записей об образовании</span></div>
                        <div class="admin-news-card__actions">
                            <button class="admin-btn-edit js-edit-specialist" data-id="${item.id}">Редактировать</button>
                            <button class="admin-btn-del js-delete-specialist" data-id="${item.id}">Удалить</button>
                        </div>
                    </div>
                </div>
            `).join('')}</div>`;
            
            document.querySelectorAll('.js-edit-specialist').forEach(btn => {
                btn.onclick = async () => {
                    const id = parseInt(btn.dataset.id);
                    await loadSpecialistForEdit(id);
                    modalManager.open();
                };
            });
            document.querySelectorAll('.js-delete-specialist').forEach(btn => {
                btn.onclick = async () => {
                    const id = parseInt(btn.dataset.id);
                    if (confirm('Вы уверены, что хотите удалить этого специалиста?')) {
                        try {
                            await apiRequest(`/admin/specialists/${id}`, { method: 'DELETE' });
                            showNotification('Специалист удален', 'success');
                            await loadAndRenderSpecialists();
                        } catch (error) {
                            showNotification(error.message, 'error');
                        }
                    }
                };
            });
        } catch (error) {
            document.getElementById('specialists-list').innerHTML = `<div class="admin-error">Ошибка загрузки специалистов: ${error.message}</div>`;
        }
    }
    
    async function loadSpecialistForEdit(id) {
        try {
            const specialist = await apiRequest(`/admin/specialists/${id}`);
            editingSpecialistId = id;
            document.getElementById('specialist-modal-title').textContent = 'Редактировать специалиста';
            document.getElementById('specialist-name').value = specialist.name || '';
            document.getElementById('specialist-titles').value = specialist.titles || '';
            document.getElementById('specialist-experience').value = specialist.experience || '';
            document.getElementById('specialist-category').value = specialist.category || '';
            educationItems = specialist.education && specialist.education.length ? [...specialist.education] : [''];
            renderEducation();
            const imageUrl = specialist.image_url || '/uploads/specialists_images/doctor_0.png';
            document.getElementById('specialist-image-preview').innerHTML = `<img src="http://localhost:3000${imageUrl}" alt="Preview">`;
            if (specialist.image_url && specialist.image_url !== '/uploads/specialists_images/doctor_0.png') {
                document.getElementById('remove-specialist-image').style.display = 'inline-block';
                deleteCurrentImage = false;
            } else {
                document.getElementById('remove-specialist-image').style.display = 'none';
            }
            currentImageFile = null;
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
    
    document.getElementById('create-specialist-btn').onclick = () => {
        editingSpecialistId = null;
        document.getElementById('specialist-modal-title').textContent = 'Добавить специалиста';
        document.getElementById('specialist-name').value = '';
        document.getElementById('specialist-titles').value = '';
        document.getElementById('specialist-experience').value = '';
        document.getElementById('specialist-category').value = '';
        educationItems = [''];
        renderEducation();
        document.getElementById('specialist-image-preview').innerHTML = '';
        document.getElementById('remove-specialist-image').style.display = 'none';
        currentImageFile = null;
        deleteCurrentImage = false;
        modalManager.open();
    };
    
    document.getElementById('add-education').onclick = () => {
        educationItems.push('');
        renderEducation();
        setTimeout(() => {
            const last = document.querySelector('#education-container .admin-paragraph-text:last-child');
            if (last) last.focus();
        }, 100);
    };
    
    document.getElementById('specialist-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('specialist-name').value.trim();
        const titles = document.getElementById('specialist-titles').value.trim();
        const experience = document.getElementById('specialist-experience').value;
        const category = document.getElementById('specialist-category').value.trim();
        if (!name || !titles || !experience || !category) {
            showNotification('Заполните все обязательные поля', 'error');
            return;
        }
        const filteredEducation = educationItems.filter(e => e.trim());
        if (filteredEducation.length === 0) {
            showNotification('Добавьте хотя бы одну запись об образовании', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('name', name);
        formData.append('titles', titles);
        formData.append('experience', experience);
        formData.append('category', category);
        formData.append('education', JSON.stringify(filteredEducation));
        if (currentImageFile) formData.append('image', currentImageFile);
        if (deleteCurrentImage && editingSpecialistId) formData.append('deleteImage', 'true');
        try {
            if (editingSpecialistId) {
                await apiRequest(`/admin/specialists/${editingSpecialistId}`, { method: 'PUT', body: formData });
                showNotification('Специалист обновлен', 'success');
            } else {
                await apiRequest('/admin/specialists', { method: 'POST', body: formData });
                showNotification('Специалист создан', 'success');
            }
            modalManager.close();
            await loadAndRenderSpecialists();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    initFileUpload();
    currentTabCleanup = () => { if (modalManager) modalManager.destroy(); };
    await loadAndRenderSpecialists();
}

// ============= УСЛУГИ =============
async function renderServicesTab(container) {
    container.innerHTML = `
        <div class="admin-dual-grid">
            <section class="admin-section">
                <div class="admin-section__header">
                    <h3 class="admin-section__title">Категории услуг</h3>
                    <button class="admin-btn admin-btn_add" id="create-category-btn">+ Добавить категорию</button>
                </div>
                <div id="categories-list"><div class="admin-loading">Загрузка...</div></div>
            </section>
            <section class="admin-section">
                <div class="admin-section__header">
                    <h3 class="admin-section__title">Услуги</h3>
                </div>
                <div id="services-list"><div class="admin-placeholder">Выберите категорию, чтобы увидеть услуги</div></div>
            </section>
        </div>
    `;
    
    let selectedCategoryId = null;
    let editingCategoryId = null;
    let editingServiceCategoryId = null;
    let editingServiceIndex = null;
    let currentImageFile = null;
    let deleteCurrentImage = false;
    let categoryModalManager = null;
    let serviceModalManager = null;
    
    // Модальное окно для категории
    const categoryModal = document.createElement('div');
    categoryModal.className = 'admin-modal admin-modal_large';
    categoryModal.style.display = 'none';
    categoryModal.innerHTML = `
        <div class="admin-modal__overlay"></div>
        <div class="admin-modal__content admin-modal__content_large">
            <h3 id="category-modal-title">Добавить категорию</h3>
            <form id="category-form">
                <div class="admin-form__grid">
                    <div class="admin-form__group"><label>Название категории *</label><input type="text" id="category-name" class="admin-input" required></div>
                    <div class="admin-form__group"><label>Группа категории *</label><input type="text" id="category-group" class="admin-input" required></div>
                </div>
                <div class="admin-form__group">
                    <label>Изображение *</label>
                    <div class="admin-file-upload" id="category-file-upload">
                        <input type="file" id="category-image" accept="image/*" class="admin-file-input">
                        <div class="admin-file-upload__label">📁 Нажмите для выбора изображения</div>
                        <div id="category-image-preview" class="admin-image-preview"></div>
                        <button type="button" id="remove-category-image" class="admin-btn-remove" style="display:none;">Удалить изображение</button>
                    </div>
                </div>
                <div class="admin-form__group"><label>Описание категории</label><textarea id="category-description" class="admin-textarea" rows="3"></textarea></div>
                <div class="admin-modal__actions">
                    <button type="submit" class="admin-btn">Сохранить</button>
                    <button type="button" class="admin-btn admin-btn_secondary modal-cancel-btn">Отмена</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(categoryModal);
    categoryModalManager = new ModalManager(categoryModal);
    
    // Модальное окно для услуги
    const serviceModal = document.createElement('div');
    serviceModal.className = 'admin-modal';
    serviceModal.style.display = 'none';
    serviceModal.innerHTML = `
        <div class="admin-modal__overlay"></div>
        <div class="admin-modal__content">
            <h3 id="service-modal-title">Добавить услугу</h3>
            <form id="service-form">
                <div class="admin-form__group"><label>Название услуги *</label><input type="text" id="service-label" class="admin-input" required></div>
                <div class="admin-form__group"><label>Стоимость (₽) *</label><input type="number" id="service-cost" class="admin-input" min="0" required><small class="admin-hint">Если стоимость 0, на сайте будет отображаться "Уточняйте"</small></div>
                <div class="admin-modal__actions">
                    <button type="submit" class="admin-btn">Сохранить</button>
                    <button type="button" class="admin-btn admin-btn_secondary modal-cancel-btn">Отмена</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(serviceModal);
    serviceModalManager = new ModalManager(serviceModal);
    
    function initCategoryFileUpload() {
        const fileInput = categoryModal.querySelector('#category-image');
        const removeBtn = document.getElementById('remove-category-image');
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    currentImageFile = file;
                    deleteCurrentImage = false;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        document.getElementById('category-image-preview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                        if (removeBtn) removeBtn.style.display = 'inline-block';
                    };
                    reader.readAsDataURL(file);
                }
            };
        }
        if (removeBtn) {
            removeBtn.onclick = () => {
                deleteCurrentImage = true;
                document.getElementById('category-image-preview').innerHTML = '';
                removeBtn.style.display = 'none';
                currentImageFile = null;
                if (fileInput) fileInput.value = '';
            };
        }
        const fileUploadDiv = categoryModal.querySelector('#category-file-upload');
        if (fileUploadDiv && fileInput) {
            fileUploadDiv.style.cursor = 'pointer';
            fileUploadDiv.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
        }
    }
    
    async function loadCategories() {
        try {
            const categories = await apiRequest('/admin/service-categories');
            const listDiv = document.getElementById('categories-list');
            if (!listDiv) return;
            if (!categories || categories.length === 0) {
                listDiv.innerHTML = '<div class="admin-empty">Нет категорий. Создайте первую категорию!</div>';
                return;
            }
            listDiv.innerHTML = `<div class="admin-categories-list">${categories.map(cat => `
                <div class="admin-category-item ${selectedCategoryId === cat.id ? 'admin-category-item_active' : ''}" data-id="${cat.id}">
                    <img src="http://localhost:3000${cat.image_url || '/uploads/service_images/service_0.png'}" alt="${escapeHtml(cat.name)}" class="admin-category-item__image">
                    <div class="admin-category-item__content">
                        <h4>${escapeHtml(cat.name)}</h4>
                        <p class="admin-category-item__group">${escapeHtml(cat.category)}</p>
                        <p class="admin-category-item__description">${escapeHtml(cat.description?.substring(0, 80) || '')}</p>
                        <div class="admin-category-item__stats"><span>📋 ${cat.prices?.length || 0} услуг</span></div>
                        <div class="admin-category-item__actions">
                            <button class="admin-btn-edit js-edit-category" data-id="${cat.id}">Ред.</button>
                            <button class="admin-btn-del js-delete-category" data-id="${cat.id}">Удалить</button>
                        </div>
                    </div>
                </div>
            `).join('')}</div>`;
            
            document.querySelectorAll('.admin-category-item').forEach(item => {
                item.onclick = (e) => {
                    if (!e.target.classList.contains('admin-btn-edit') && !e.target.classList.contains('admin-btn-del')) {
                        selectedCategoryId = parseInt(item.dataset.id);
                        loadServices(selectedCategoryId);
                        loadCategories();
                        window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    }
                };
            });
            document.querySelectorAll('.js-edit-category').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    await loadCategoryForEdit(parseInt(btn.dataset.id));
                    categoryModalManager.open();
                };
            });
            document.querySelectorAll('.js-delete-category').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.dataset.id);
                    if (confirm('Вы уверены, что хотите удалить эту категорию? Все услуги в ней будут удалены.')) {
                        try {
                            await apiRequest(`/admin/service-categories/${id}`, { method: 'DELETE' });
                            showNotification('Категория удалена', 'success');
                            if (selectedCategoryId === id) {
                                selectedCategoryId = null;
                                document.getElementById('services-list').innerHTML = '<div class="admin-placeholder">Выберите категорию, чтобы увидеть услуги</div>';
                            }
                            await loadCategories();
                        } catch (error) {
                            showNotification(error.message, 'error');
                        }
                    }
                };
            });
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
        }
    }
    
    async function loadServices(categoryId) {
        try {
            const categories = await apiRequest('/admin/service-categories');
            const category = categories.find(c => c.id === categoryId);
            const servicesDiv = document.getElementById('services-list');
            if (!category) {
                servicesDiv.innerHTML = '<div class="admin-placeholder">Категория не найдена</div>';
                return;
            }
            servicesDiv.innerHTML = `
                <div class="admin-services-header"><button class="admin-btn admin-btn_add" id="add-service-btn">+ Добавить услугу</button></div>
                ${!category.prices || category.prices.length === 0 ? 
                    '<div class="admin-placeholder">В этой категории пока нет услуг. Добавьте первую услугу!</div>' :
                    `<table class="admin-table"><thead><tr><th>Название услуги</th><th>Стоимость</th><th>Действия</th></tr></thead>
                    <tbody>${category.prices.map((service, index) => `
                        <tr><td>${escapeHtml(service.label)}</td>
                        <td>${service.cost === 0 ? 'Уточняйте' : service.cost + ' ₽'}</td>
                        <td><div class="admin-actions">
                            <button class="admin-btn-edit js-edit-service" data-index="${index}" data-label="${escapeHtml(service.label)}" data-cost="${service.cost}">Ред.</button>
                            <button class="admin-btn-del js-delete-service" data-index="${index}">Удалить</button>
                        </div></td></tr>
                    `).join('')}</tbody></table>`
                }
            `;
            const addBtn = document.getElementById('add-service-btn');
            if (addBtn) {
                addBtn.onclick = () => {
                    editingServiceCategoryId = categoryId;
                    editingServiceIndex = null;
                    document.getElementById('service-modal-title').textContent = 'Добавить услугу';
                    document.getElementById('service-label').value = '';
                    document.getElementById('service-cost').value = '';
                    serviceModalManager.open();
                };
            }
            if (category.prices && category.prices.length > 0) {
                document.querySelectorAll('.js-edit-service').forEach(btn => {
                    btn.onclick = () => {
                        editingServiceCategoryId = categoryId;
                        editingServiceIndex = parseInt(btn.dataset.index);
                        document.getElementById('service-modal-title').textContent = 'Редактировать услугу';
                        document.getElementById('service-label').value = btn.dataset.label;
                        document.getElementById('service-cost').value = btn.dataset.cost;
                        serviceModalManager.open();
                    };
                });
                document.querySelectorAll('.js-delete-service').forEach(btn => {
                    btn.onclick = async () => {
                        const index = parseInt(btn.dataset.index);
                        if (confirm('Вы уверены, что хотите удалить эту услугу?')) {
                            try {
                                await apiRequest(`/admin/services/${categoryId}/${index}`, { method: 'DELETE' });
                                showNotification('Услуга удалена', 'success');
                                loadServices(categoryId);
                            } catch (error) {
                                showNotification(error.message, 'error');
                            }
                        }
                    };
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки услуг:', error);
            document.getElementById('services-list').innerHTML = '<div class="admin-error">Ошибка загрузки услуг</div>';
        }
    }
    
    async function loadCategoryForEdit(id) {
        try {
            const category = await apiRequest(`/admin/service-categories/${id}`);
            editingCategoryId = id;
            document.getElementById('category-modal-title').textContent = 'Редактировать категорию';
            document.getElementById('category-name').value = category.name;
            document.getElementById('category-group').value = category.category;
            document.getElementById('category-description').value = category.description || '';
            const imageUrl = category.image_url || '/uploads/service_images/service_0.png';
            document.getElementById('category-image-preview').innerHTML = `<img src="http://localhost:3000${imageUrl}" alt="Preview">`;
            if (category.image_url && category.image_url !== '/uploads/service_images/service_0.png') {
                document.getElementById('remove-category-image').style.display = 'inline-block';
                deleteCurrentImage = false;
            } else {
                document.getElementById('remove-category-image').style.display = 'none';
            }
            currentImageFile = null;
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
    
    document.getElementById('create-category-btn').onclick = () => {
        editingCategoryId = null;
        document.getElementById('category-modal-title').textContent = 'Добавить категорию';
        document.getElementById('category-name').value = '';
        document.getElementById('category-group').value = '';
        document.getElementById('category-description').value = '';
        document.getElementById('category-image-preview').innerHTML = '';
        document.getElementById('remove-category-image').style.display = 'none';
        currentImageFile = null;
        deleteCurrentImage = false;
        categoryModalManager.open();
    };
    
    document.getElementById('category-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('category-name').value.trim();
        const category = document.getElementById('category-group').value.trim();
        const description = document.getElementById('category-description').value.trim();
        if (!editingCategoryId && !currentImageFile) {
            showNotification('Загрузите изображение для категории', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('description', description);
        if (currentImageFile) formData.append('image', currentImageFile);
        if (deleteCurrentImage && editingCategoryId) formData.append('deleteImage', 'true');
        try {
            if (editingCategoryId) {
                await apiRequest(`/admin/service-categories/${editingCategoryId}`, { method: 'PUT', body: formData });
                showNotification('Категория обновлена', 'success');
            } else {
                await apiRequest('/admin/service-categories', { method: 'POST', body: formData });
                showNotification('Категория создана', 'success');
            }
            categoryModalManager.close();
            await loadCategories();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    document.getElementById('service-form').onsubmit = async (e) => {
        e.preventDefault();
        const label = document.getElementById('service-label').value.trim();
        const cost = document.getElementById('service-cost').value;
        if (!label) {
            showNotification('Введите название услуги', 'error');
            return;
        }
        if (cost === '' || cost === null || isNaN(parseInt(cost))) {
            showNotification('Введите стоимость услуги', 'error');
            return;
        }
        const costValue = parseInt(cost);
        try {
            if (editingServiceIndex !== null) {
                await apiRequest(`/admin/services/${editingServiceCategoryId}/${editingServiceIndex}`, {
                    method: 'PUT',
                    body: JSON.stringify({ label, cost: costValue })
                });
                showNotification('Услуга обновлена', 'success');
            } else {
                await apiRequest(`/admin/services/${editingServiceCategoryId}`, {
                    method: 'POST',
                    body: JSON.stringify({ label, cost: costValue })
                });
                showNotification('Услуга добавлена', 'success');
            }
            serviceModalManager.close();
            loadServices(editingServiceCategoryId);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    initCategoryFileUpload();
    currentTabCleanup = () => {
        if (categoryModalManager) categoryModalManager.destroy();
        if (serviceModalManager) serviceModalManager.destroy();
    };
    await loadCategories();
}

// ============= ДОКУМЕНТЫ =============
async function renderDocsTab(container) {
    container.innerHTML = `
        <section class="admin-section">
            <div class="admin-section__header"><h3 class="admin-section__title">Управление документацией</h3></div>
            <div class="admin-docs-sections">
                <div class="admin-docs-section" data-section="general-info">
                    <h4>Общие сведения</h4>
                    <div id="general-info-docs" class="admin-docs-list"></div>
                    <button class="admin-btn admin-btn_add add-doc-btn" data-section="general-info">+ Добавить документ</button>
                </div>
                <div class="admin-docs-section" data-section="paid-services">
                    <h4>Платные медицинские услуги</h4>
                    <div id="paid-services-docs" class="admin-docs-list"></div>
                    <button class="admin-btn admin-btn_add add-doc-btn" data-section="paid-services">+ Добавить документ</button>
                </div>
            </div>
        </section>
    `;
    
    let modalManager = null;
    let currentSection = null;
    let editingDocIndex = null;
    let currentFile = null;
    
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="admin-modal__overlay"></div>
        <div class="admin-modal__content">
            <h3 id="doc-modal-title">Добавить документ</h3>
            <form id="doc-form">
                <div class="admin-form__group"><label>Название документа *</label><input type="text" id="doc-title" class="admin-input" required></div>
                <div class="admin-form__group"><label>Тип добавления</label><select id="doc-type" class="admin-input"><option value="file">Загрузить файл</option><option value="link">Внешняя ссылка</option></select></div>
                <div class="admin-form__group" id="doc-file-group"><label>Файл документа</label><div class="admin-file-upload" id="doc-file-upload"><input type="file" id="doc-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" class="admin-file-input"><div class="admin-file-upload__label">📁 Нажмите для выбора файла</div><div id="doc-file-preview" class="admin-file-preview"></div></div></div>
                <div class="admin-form__group" id="doc-link-group" style="display:none;"><label>Ссылка на документ</label><input type="url" id="doc-link" class="admin-input" placeholder="https://example.com/document.pdf"></div>
                <div class="admin-modal__actions">
                    <button type="submit" class="admin-btn">Сохранить</button>
                    <button type="button" class="admin-btn admin-btn_secondary modal-cancel-btn">Отмена</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modalManager = new ModalManager(modal);
    
    function initDocFileUpload() {
        const fileUploadDiv = modal.querySelector('#doc-file-upload');
        const fileInput = modal.querySelector('#doc-file');
        if (fileUploadDiv && fileInput) {
            fileUploadDiv.style.cursor = 'pointer';
            fileUploadDiv.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    currentFile = file;
                    document.getElementById('doc-file-preview').innerHTML = `<div class="admin-file-info">📄 ${file.name} (${(file.size / 1024).toFixed(2)} KB)</div>`;
                }
            };
        }
    }
    
    document.getElementById('doc-type').onchange = (e) => {
        const isFile = e.target.value === 'file';
        document.getElementById('doc-file-group').style.display = isFile ? 'block' : 'none';
        document.getElementById('doc-link-group').style.display = isFile ? 'none' : 'block';
        document.getElementById('doc-link').required = !isFile;
    };
    
    async function loadDocuments(section) {
        try {
            const data = await apiRequest(`/admin/documents/${section}`);
            const container = document.getElementById(`${section}-docs`);
            if (!container) return;
            if (!data.items || data.items.length === 0) {
                container.innerHTML = '<div class="admin-empty">Нет документов</div>';
                return;
            }
            container.innerHTML = `<table class="admin-table"><thead><tr><th>Название</th><th>Тип</th><th>Действия</th></tr></thead>
                <tbody>${data.items.map((doc, idx) => `
                    <tr><td>${escapeHtml(doc.title)}</td><td>${doc.isFile ? '📄 Файл' : '🔗 Ссылка'}</td>
                    <td><div class="admin-actions">
                        <button class="admin-btn-edit js-edit-doc" data-index="${idx}" data-title="${escapeHtml(doc.title)}" data-link="${escapeHtml(doc.link)}" data-isfile="${doc.isFile}">Ред.</button>
                        <button class="admin-btn-del js-delete-doc" data-index="${idx}">Удалить</button>
                    </div></td></tr>
                `).join('')}</tbody></table>`;
            
            document.querySelectorAll(`#${section}-docs .js-edit-doc`).forEach(btn => {
                btn.onclick = () => {
                    currentSection = section;
                    editingDocIndex = parseInt(btn.dataset.index);
                    document.getElementById('doc-modal-title').textContent = 'Редактировать документ';
                    document.getElementById('doc-title').value = btn.dataset.title;
                    const isFile = btn.dataset.isfile === 'true';
                    document.getElementById('doc-type').value = isFile ? 'file' : 'link';
                    document.getElementById('doc-type').dispatchEvent(new Event('change'));
                    if (!isFile) document.getElementById('doc-link').value = btn.dataset.link;
                    currentFile = null;
                    modalManager.open();
                };
            });
            document.querySelectorAll(`#${section}-docs .js-delete-doc`).forEach(btn => {
                btn.onclick = async () => {
                    const idx = parseInt(btn.dataset.index);
                    if (confirm('Вы уверены, что хотите удалить этот документ?')) {
                        try {
                            await apiRequest(`/admin/documents/${section}/${idx}`, { method: 'DELETE' });
                            showNotification('Документ удален', 'success');
                            await loadDocuments(section);
                        } catch (error) {
                            showNotification(error.message, 'error');
                        }
                    }
                };
            });
        } catch (error) {
            document.getElementById(`${section}-docs`).innerHTML = `<div class="admin-error">Ошибка загрузки: ${error.message}</div>`;
        }
    }
    
    document.querySelectorAll('.add-doc-btn').forEach(btn => {
        btn.onclick = () => {
            currentSection = btn.dataset.section;
            editingDocIndex = null;
            document.getElementById('doc-modal-title').textContent = 'Добавить документ';
            document.getElementById('doc-title').value = '';
            document.getElementById('doc-link').value = '';
            document.getElementById('doc-type').value = 'file';
            document.getElementById('doc-type').dispatchEvent(new Event('change'));
            document.getElementById('doc-file').value = '';
            document.getElementById('doc-file-preview').innerHTML = '';
            currentFile = null;
            modalManager.open();
        };
    });
    
    document.getElementById('doc-form').onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('doc-title').value.trim();
        const docType = document.getElementById('doc-type').value;
        const isFile = docType === 'file';
        const link = document.getElementById('doc-link').value.trim();
        if (!title) { showNotification('Введите название документа', 'error'); return; }
        if (isFile && !currentFile && editingDocIndex === null) { showNotification('Выберите файл для загрузки', 'error'); return; }
        if (!isFile && !link) { showNotification('Введите ссылку на документ', 'error'); return; }
        const formData = new FormData();
        formData.append('title', title);
        formData.append('isFile', isFile);
        if (isFile && currentFile) formData.append('file', currentFile);
        else if (!isFile) formData.append('link', link);
        try {
            if (editingDocIndex !== null) {
                await apiRequest(`/admin/documents/${currentSection}/${editingDocIndex}`, { method: 'PUT', body: formData });
                showNotification('Документ обновлен', 'success');
            } else {
                await apiRequest(`/admin/documents/${currentSection}`, { method: 'POST', body: formData });
                showNotification('Документ добавлен', 'success');
            }
            modalManager.close();
            await loadDocuments(currentSection);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    initDocFileUpload();
    currentTabCleanup = () => { if (modalManager) modalManager.destroy(); };
    await loadDocuments('general-info');
    await loadDocuments('paid-services');
}

// ============= КОНТАКТЫ =============
async function renderContactsTab(container) {
    container.innerHTML = `
        <section class="admin-section">
            <div class="admin-section__header"><h3 class="admin-section__title">Управление телефонами</h3><button class="admin-btn admin-btn_add" id="add-phone-btn">+ Добавить телефон</button></div>
            <div id="phones-list"><div class="admin-loading">Загрузка...</div></div>
        </section>
        <section class="admin-section">
            <div class="admin-section__header"><h3 class="admin-section__title">График работы</h3></div>
            <div id="schedule-list"><div class="admin-loading">Загрузка...</div></div>
            <button class="admin-btn" id="save-schedule-btn" style="margin-top: 20px;">Сохранить график</button>
        </section>
    `;
    
    let modalManager = null;
    let editingPhoneId = null;
    
    const phoneModal = document.createElement('div');
    phoneModal.className = 'admin-modal';
    phoneModal.style.display = 'none';
    phoneModal.innerHTML = `
        <div class="admin-modal__overlay"></div>
        <div class="admin-modal__content">
            <h3 id="phone-modal-title">Добавить телефон</h3>
            <form id="phone-form">
                <div class="admin-form__group"><label>Описание *</label><input type="text" id="phone-label" class="admin-input" required></div>
                <div class="admin-form__group"><label>Номер телефона *</label><input type="tel" id="phone-value" class="admin-input" required><small class="admin-hint">Формат: +7 (XXX) XXX-XX-XX</small></div>
                <div class="admin-modal__actions">
                    <button type="submit" class="admin-btn">Сохранить</button>
                    <button type="button" class="admin-btn admin-btn_secondary modal-cancel-btn">Отмена</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(phoneModal);
    modalManager = new ModalManager(phoneModal);
    
    async function loadPhones() {
        try {
            const phones = await apiRequest('/admin/phones');
            const listDiv = document.getElementById('phones-list');
            if (!phones || phones.length === 0) {
                listDiv.innerHTML = '<div class="admin-empty">Нет телефонов. Добавьте первый телефон!</div>';
                return;
            }
            listDiv.innerHTML = `<table class="admin-table"><thead><tr><th>ID</th><th>Описание</th><th>Номер телефона</th><th>Действия</th></tr></thead>
                <tbody>${phones.map(phone => `<tr><td>${phone.id}</td><td>${escapeHtml(phone.label)}</td><td>${escapeHtml(phone.value)}</td>
                <td><div class="admin-actions"><button class="admin-btn-edit js-edit-phone" data-id="${phone.id}" data-label="${escapeHtml(phone.label)}" data-value="${escapeHtml(phone.value)}">Ред.</button>
                <button class="admin-btn-del js-delete-phone" data-id="${phone.id}">Удалить</button></div></td></tr>`).join('')}</tbody></table>`;
            
            document.querySelectorAll('.js-edit-phone').forEach(btn => {
                btn.onclick = () => {
                    editingPhoneId = parseInt(btn.dataset.id);
                    document.getElementById('phone-modal-title').textContent = 'Редактировать телефон';
                    document.getElementById('phone-label').value = btn.dataset.label;
                    document.getElementById('phone-value').value = btn.dataset.value;
                    modalManager.open();
                };
            });
            document.querySelectorAll('.js-delete-phone').forEach(btn => {
                btn.onclick = async () => {
                    const id = parseInt(btn.dataset.id);
                    if (confirm('Вы уверены, что хотите удалить этот телефон?')) {
                        try {
                            await apiRequest(`/admin/phones/${id}`, { method: 'DELETE' });
                            showNotification('Телефон удален', 'success');
                            await loadPhones();
                        } catch (error) {
                            showNotification(error.message, 'error');
                        }
                    }
                };
            });
        } catch (error) {
            document.getElementById('phones-list').innerHTML = '<div class="admin-error">Ошибка загрузки телефонов</div>';
        }
    }
    
    async function loadSchedule() {
        try {
            const schedule = await apiRequest('/admin/schedule');
            const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
            const listDiv = document.getElementById('schedule-list');
            if (!schedule || schedule.length === 0) {
                listDiv.innerHTML = '<div class="admin-empty">График работы не найден</div>';
                return;
            }
            listDiv.innerHTML = `<table class="admin-table" id="schedule-table"><thead><tr><th>День недели</th><th>Время открытия</th><th>Время закрытия</th><th>Выходной</th></tr></thead>
                <tbody>${schedule.map((item, index) => `<tr data-id="${item.id}"><td><strong>${days[index]}</strong></td>
                <td><input type="time" class="admin-input admin-input_table schedule-start" data-id="${item.id}" value="${item.start_time || '09:00'}" ${item.is_off ? 'disabled' : ''}></td>
                <td><input type="time" class="admin-input admin-input_table schedule-end" data-id="${item.id}" value="${item.end_time || '18:00'}" ${item.is_off ? 'disabled' : ''}></td>
                <td><input type="checkbox" class="schedule-off" data-id="${item.id}" ${item.is_off ? 'checked' : ''}></td></tr>`).join('')}</tbody></table>`;
            
            document.querySelectorAll('.schedule-off').forEach(checkbox => {
                checkbox.onchange = (e) => {
                    const row = e.target.closest('tr');
                    const startInput = row.querySelector('.schedule-start');
                    const endInput = row.querySelector('.schedule-end');
                    if (e.target.checked) {
                        startInput.disabled = true;
                        endInput.disabled = true;
                        startInput.value = '';
                        endInput.value = '';
                    } else {
                        startInput.disabled = false;
                        endInput.disabled = false;
                        startInput.value = '09:00';
                        endInput.value = '18:00';
                    }
                };
            });
        } catch (error) {
            document.getElementById('schedule-list').innerHTML = '<div class="admin-error">Ошибка загрузки графика</div>';
        }
    }
    
    async function saveSchedule() {
        try {
            const rows = document.querySelectorAll('#schedule-table tbody tr');
            const updates = [];
            for (const row of rows) {
                const id = parseInt(row.dataset.id);
                const isOff = row.querySelector('.schedule-off').checked;
                let startTime = null, endTime = null;
                if (!isOff) {
                    startTime = row.querySelector('.schedule-start').value;
                    endTime = row.querySelector('.schedule-end').value;
                    if (!startTime || !endTime) { showNotification('Заполните время работы для всех дней', 'error'); return; }
                }
                updates.push(apiRequest(`/admin/schedule/${id}`, { method: 'PUT', body: JSON.stringify({ start_time: startTime, end_time: endTime, is_off: isOff }) }));
            }
            await Promise.all(updates);
            showNotification('График работы сохранен', 'success');
            await loadSchedule();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
    
    document.getElementById('add-phone-btn').onclick = () => {
        editingPhoneId = null;
        document.getElementById('phone-modal-title').textContent = 'Добавить телефон';
        document.getElementById('phone-label').value = '';
        document.getElementById('phone-value').value = '';
        modalManager.open();
    };
    
    document.getElementById('save-schedule-btn').onclick = saveSchedule;
    
    document.getElementById('phone-form').onsubmit = async (e) => {
        e.preventDefault();
        const label = document.getElementById('phone-label').value.trim();
        const value = document.getElementById('phone-value').value.trim();
        if (!label || !value) { showNotification('Заполните все поля', 'error'); return; }
        const phoneRegex = /^[\+\d\s\-\(\)]{10,20}$/;
        if (!phoneRegex.test(value)) { showNotification('Введите корректный номер телефона', 'error'); return; }
        try {
            if (editingPhoneId) {
                await apiRequest(`/admin/phones/${editingPhoneId}`, { method: 'PUT', body: JSON.stringify({ label, value }) });
                showNotification('Телефон обновлен', 'success');
            } else {
                await apiRequest('/admin/phones', { method: 'POST', body: JSON.stringify({ label, value }) });
                showNotification('Телефон добавлен', 'success');
            }
            modalManager.close();
            await loadPhones();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    currentTabCleanup = () => { if (modalManager) modalManager.destroy(); };
    await loadPhones();
    await loadSchedule();
}

// ============= ИНИЦИАЛИЗАЦИЯ =============
async function init() {
    const isAuth = await checkAuth();
    if (isAuth) {
        renderDashboard();
    } else {
        renderLogin();
    }
}

init();