const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, getAll, run, get } = require('./db-api');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'BSU_CLINIC_SUPER_SECRET';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Доступ запрещен. Требуется авторизация." });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Неверный или просроченный токен" });
        }
        req.user = user;
        next();
    });
};

// ============= АВТОРИЗАЦИЯ =============
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "Логин и пароль обязательны" });
    }
    
    try {
        const admin = await get('SELECT * FROM admins WHERE username = ?', [username]);
        
        if (!admin) {
            return res.status(401).json({ error: "Неверный логин или пароль" });
        }
        
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: "Неверный логин или пароль" });
        }
        
        const token = jwt.sign(
            { id: admin.id, username: admin.username, isMainAdmin: admin.id === 1 },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: admin.id,
                username: admin.username,
                isMainAdmin: admin.id === 1
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Проверка валидности токена
app.post('/api/admin/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            isMainAdmin: req.user.id === 1
        }
    });
});

// ============= АДМИНИСТРАТОРЫ (CRUD) =============

// Получить всех администраторов (только для авторизованных)
app.get('/api/admins', authenticateToken, async (req, res) => {
    try {
        const admins = await getAll('admins');
        // Не отправляем пароли на фронт
        const safeAdmins = admins.map(admin => ({
            id: admin.id,
            username: admin.username,
            isMainAdmin: admin.id === 1
        }));
        res.json(safeAdmins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать нового администратора
app.post('/api/admins', authenticateToken, async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "Логин и пароль обязательны" });
    }
    
    if (password.length < 4) {
        return res.status(400).json({ error: "Пароль должен содержать минимум 4 символа" });
    }
    
    try {
        // Проверяем, существует ли уже такой логин
        const existing = await get('SELECT id FROM admins WHERE username = ?', [username]);
        if (existing) {
            return res.status(400).json({ error: "Администратор с таким логином уже существует" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await run(
            'INSERT INTO admins (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );
        
        res.json({
            success: true,
            admin: {
                id: result.lastID,
                username,
                isMainAdmin: false
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обновить администратора
app.put('/api/admins/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;
    
    // Запрещаем редактирование главного админа
    if (parseInt(id) === 1) {
        return res.status(403).json({ error: "Главного администратора нельзя редактировать" });
    }
    
    try {
        let query = 'UPDATE admins SET username = ?';
        let params = [username];
        
        if (password && password.length > 0) {
            if (password.length < 4) {
                return res.status(400).json({ error: "Пароль должен содержать минимум 4 символа" });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }
        
        query += ' WHERE id = ?';
        params.push(id);
        
        await run(query, params);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Удалить администратора
app.delete('/api/admins/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    // Запрещаем удаление главного админа
    if (parseInt(id) === 1) {
        return res.status(403).json({ error: "Нельзя удалить главного администратора" });
    }
    
    // Запрещаем админу удалять самого себя
    if (parseInt(id) === req.user.id) {
        return res.status(403).json({ error: "Нельзя удалить самого себя" });
    }
    
    try {
        await run('DELETE FROM admins WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ПУБЛИЧНЫЕ ЭНДПОИНТЫ (для сайта) =============

app.get('/api/news', async (req, res) => {
    try {
        // Сортировка от новых к старым
        const data = await getAll('news ORDER BY id DESC');
        const formatted = data.map(item => ({
            ...item,
            content: JSON.parse(item.content_json)
        }));
        res.json(formatted);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

app.get('/api/news/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const row = await get('SELECT * FROM news WHERE id = ?', [id]);
        if (!row) return res.status(404).json({ message: "Новость не найдена" });
        
        res.json({
            ...row,
            content: JSON.parse(row.content_json)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/news/:id/view', (req, res) => {
    const { id } = req.params;
    db.run(`UPDATE news SET views = views + 1 WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Просмотр засчитан" });
    });
});

app.get('/api/specialists', async (req, res) => {
    try {
        const data = await getAll('specialists');
        const formatted = data.map(item => ({
            ...item,
            education: JSON.parse(item.education_json),
            // Убеждаемся, что image_url всегда есть (даже если в БД null)
            image_url: item.image_url || '/uploads/specialists_images/doctor_0.png'
        }));
        res.json(formatted);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

app.get('/api/services', async (req, res) => {
    try {
        const data = await getAll('services');
        const formatted = data.map(item => ({
            ...item,
            prices: JSON.parse(item.prices_json)
        }));
        res.json(formatted);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

app.get('/api/contacts', async (req, res) => {
    try {
        const phones = await getAll('contact_phones');
        const schedule = await getAll('contact_schedule');
        res.json({ phones, schedule });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

app.get('/api/documents', async (req, res) => {
    try {
        const data = await getAll('documents');
        const formatted = data.map(item => ({
            ...item,
            items: JSON.parse(item.items_json)
        }));
        res.json(formatted);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

// ============= УПРАВЛЕНИЕ НОВОСТЯМИ (CRUD) =============

// Multer для загрузки файлов
const multer = require('multer');
const fs = require('fs');

// Создаем папку для изображений новостей, если её нет
const newsUploadDir = path.join(__dirname, 'uploads/news_images');
if (!fs.existsSync(newsUploadDir)) {
    fs.mkdirSync(newsUploadDir, { recursive: true });
}

// Настройка хранилища для multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, newsUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'news_' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB лимит
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Только изображения!'));
        }
    }
});

// Получить все новости (для админки)
app.get('/api/admin/news', authenticateToken, async (req, res) => {
    try {
        // Исправлено: убрано дублирование объявления переменной
        const news = await getAll('news ORDER BY id DESC');
        
        const formatted = news.map(item => ({
            ...item,
            content: JSON.parse(item.content_json || '[]')
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить одну новость (для админки)
app.get('/api/admin/news/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const news = await get('SELECT * FROM news WHERE id = ?', [id]);
        if (!news) {
            return res.status(404).json({ error: 'Новость не найдена' });
        }
        news.content = JSON.parse(news.content_json || '[]');
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать новость
app.post('/api/admin/news', authenticateToken, upload.single('image'), async (req, res) => {
    const { title, description, content } = req.body;
    
    if (!title || !description) {
        return res.status(400).json({ error: 'Заголовок и описание обязательны' });
    }
    
    try {
        let image_url = null;
        if (req.file) {
            image_url = '/uploads/news_images/' + req.file.filename;
        }
        
        // Парсим content из JSON строки
        const contentArray = content ? JSON.parse(content) : [];
        const content_json = JSON.stringify(contentArray);
        
        const result = await run(
            `INSERT INTO news (title, date, views, image_url, description, content_json) 
             VALUES (?, datetime('now', '+3 hours'), 0, ?, ?, ?)`,
            [title, image_url, description, content_json]
        );
        
        res.json({
            success: true,
            id: result.lastID,
            message: 'Новость создана успешно'
        });
    } catch (error) {
        console.error('Ошибка создания новости:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновить новость
app.put('/api/admin/news/:id', authenticateToken, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { title, description, content, deleteImage } = req.body;
    
    if (!title || !description) {
        return res.status(400).json({ error: 'Заголовок и описание обязательны' });
    }
    
    try {
        let image_url = null;
        
        // Получаем текущую новость
        const currentNews = await get('SELECT image_url FROM news WHERE id = ?', [id]);
        
        if (deleteImage === 'true' && currentNews && currentNews.image_url) {
            // Удаляем старый файл
            const oldPath = path.join(__dirname, currentNews.image_url);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
            image_url = null;
        }
        
        if (req.file) {
            // Удаляем старый файл, если он есть
            if (currentNews && currentNews.image_url) {
                const oldPath = path.join(__dirname, currentNews.image_url);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            image_url = '/uploads/news_images/' + req.file.filename;
        } else if (!deleteImage && currentNews) {
            image_url = currentNews.image_url;
        }
        
        const contentArray = content ? JSON.parse(content) : [];
        const content_json = JSON.stringify(contentArray);
        
        await run(
            `UPDATE news 
             SET title = ?, description = ?, image_url = ?, content_json = ?
             WHERE id = ?`,
            [title, description, image_url, content_json, id]
        );
        
        res.json({
            success: true,
            message: 'Новость обновлена успешно'
        });
    } catch (error) {
        console.error('Ошибка обновления новости:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить новость
app.delete('/api/admin/news/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Получаем новость перед удалением, чтобы удалить файл изображения
        const news = await get('SELECT image_url FROM news WHERE id = ?', [id]);
        
        if (news && news.image_url) {
            const imagePath = path.join(__dirname, news.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        await run('DELETE FROM news WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Новость удалена успешно'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= УПРАВЛЕНИЕ СПЕЦИАЛИСТАМИ (CRUD) =============

// Создаем папку для изображений специалистов, если её нет
const specialistsUploadDir = path.join(__dirname, 'uploads/specialists_images');
if (!fs.existsSync(specialistsUploadDir)) {
    fs.mkdirSync(specialistsUploadDir, { recursive: true });
}

// Настройка хранилища для специалистов
const specialistStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, specialistsUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'doctor_' + uniqueSuffix + ext);
    }
});

const uploadSpecialist = multer({ 
    storage: specialistStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Только изображения!'));
        }
    }
});

// Получить всех специалистов (для админки)
app.get('/api/admin/specialists', authenticateToken, async (req, res) => {
    try {
        const specialists = await getAll('specialists ORDER BY id DESC');
        const formatted = specialists.map(item => ({
            ...item,
            education: JSON.parse(item.education_json || '[]')
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить одного специалиста (для админки)
app.get('/api/admin/specialists/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const specialist = await get('SELECT * FROM specialists WHERE id = ?', [id]);
        if (!specialist) {
            return res.status(404).json({ error: 'Специалист не найден' });
        }
        specialist.education = JSON.parse(specialist.education_json || '[]');
        res.json(specialist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать специалиста
app.post('/api/admin/specialists', authenticateToken, uploadSpecialist.single('image'), async (req, res) => {
    const { name, titles, experience, category, education } = req.body;
    
    if (!name || !titles || !experience || !category) {
        return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }
    
    try {
        let image_url = '/uploads/specialists_images/doctor_0.png'; // Путь по умолчанию
        
        if (req.file) {
            image_url = '/uploads/specialists_images/' + req.file.filename;
        }
        
        const educationArray = education ? JSON.parse(education) : [];
        const education_json = JSON.stringify(educationArray);
        
        const result = await run(
            `INSERT INTO specialists (name, titles, experience, category, image_url, education_json) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, titles, parseInt(experience), category, image_url, education_json]
        );
        
        res.json({
            success: true,
            id: result.lastID,
            message: 'Специалист создан успешно'
        });
    } catch (error) {
        console.error('Ошибка создания специалиста:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновить специалиста
app.put('/api/admin/specialists/:id', authenticateToken, uploadSpecialist.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, titles, experience, category, education, deleteImage } = req.body;
    
    if (!name || !titles || !experience || !category) {
        return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }
    
    try {
        let image_url = '/uploads/specialists_images/doctor_0.png'; // Путь по умолчанию
        
        const currentSpecialist = await get('SELECT image_url FROM specialists WHERE id = ?', [id]);
        
        if (deleteImage === 'true' && currentSpecialist && currentSpecialist.image_url) {
            // Если удаляем изображение и это не заглушка, удаляем файл
            if (currentSpecialist.image_url !== '/uploads/specialists_images/doctor_0.png') {
                const oldPath = path.join(__dirname, currentSpecialist.image_url);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            image_url = '/uploads/specialists_images/doctor_0.png'; // Устанавливаем заглушку
        }
        
        if (req.file) {
            // Удаляем старый файл, если это не заглушка
            if (currentSpecialist && currentSpecialist.image_url && 
                currentSpecialist.image_url !== '/uploads/specialists_images/doctor_0.png') {
                const oldPath = path.join(__dirname, currentSpecialist.image_url);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            image_url = '/uploads/specialists_images/' + req.file.filename;
        } else if (!deleteImage && currentSpecialist && currentSpecialist.image_url) {
            // Сохраняем текущее изображение
            image_url = currentSpecialist.image_url;
        }
        
        const educationArray = education ? JSON.parse(education) : [];
        const education_json = JSON.stringify(educationArray);
        
        await run(
            `UPDATE specialists 
             SET name = ?, titles = ?, experience = ?, category = ?, image_url = ?, education_json = ?
             WHERE id = ?`,
            [name, titles, parseInt(experience), category, image_url, education_json, id]
        );
        
        res.json({
            success: true,
            message: 'Специалист обновлен успешно'
        });
    } catch (error) {
        console.error('Ошибка обновления специалиста:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить специалиста
app.delete('/api/admin/specialists/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        const specialist = await get('SELECT image_url FROM specialists WHERE id = ?', [id]);
        
        // Удаляем файл только если это не заглушка
        if (specialist && specialist.image_url && 
            specialist.image_url !== '/uploads/specialists_images/doctor_0.png') {
            const imagePath = path.join(__dirname, specialist.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        await run('DELETE FROM specialists WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Специалист удален успешно'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= УПРАВЛЕНИЕ УСЛУГАМИ И КАТЕГОРИЯМИ (CRUD) =============

// Создаем папку для изображений услуг, если её нет
const servicesUploadDir = path.join(__dirname, 'uploads/service_images');
if (!fs.existsSync(servicesUploadDir)) {
    fs.mkdirSync(servicesUploadDir, { recursive: true });
}

// Настройка хранилища для услуг
const serviceStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, servicesUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'service_' + uniqueSuffix + ext);
    }
});

const uploadService = multer({ 
    storage: serviceStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Только изображения!'));
        }
    }
});

// ============= КАТЕГОРИИ УСЛУГ =============

// Получить все категории (для админки)
app.get('/api/admin/service-categories', authenticateToken, async (req, res) => {
    try {
        const categories = await getAll('services ORDER BY id DESC');
        const formatted = categories.map(item => ({
            ...item,
            prices: JSON.parse(item.prices_json || '[]')
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить одну категорию
app.get('/api/admin/service-categories/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const category = await get('SELECT * FROM services WHERE id = ?', [id]);
        if (!category) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        category.prices = JSON.parse(category.prices_json || '[]');
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать категорию
app.post('/api/admin/service-categories', authenticateToken, uploadService.single('image'), async (req, res) => {
    const { name, category, description } = req.body;
    
    if (!name || !category) {
        return res.status(400).json({ error: 'Название и категория обязательны' });
    }
    
    try {
        let image_url = '/uploads/service_images/service_0.png'; // Заглушка по умолчанию
        
        if (req.file) {
            image_url = '/uploads/service_images/' + req.file.filename;
        }
        
        // Создаем пустой массив услуг
        const prices_json = JSON.stringify([]);
        
        const result = await run(
            `INSERT INTO services (name, category, image_url, description, prices_json) 
             VALUES (?, ?, ?, ?, ?)`,
            [name, category, image_url, description || '', prices_json]
        );
        
        res.json({
            success: true,
            id: result.lastID,
            message: 'Категория создана успешно'
        });
    } catch (error) {
        console.error('Ошибка создания категории:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновить категорию
app.put('/api/admin/service-categories/:id', authenticateToken, uploadService.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, category, description, deleteImage } = req.body;
    
    if (!name || !category) {
        return res.status(400).json({ error: 'Название и категория обязательны' });
    }
    
    try {
        let image_url = '/uploads/service_images/service_0.png';
        
        const currentCategory = await get('SELECT image_url FROM services WHERE id = ?', [id]);
        
        if (deleteImage === 'true' && currentCategory && currentCategory.image_url) {
            if (currentCategory.image_url !== '/uploads/service_images/service_0.png') {
                const oldPath = path.join(__dirname, currentCategory.image_url);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            image_url = '/uploads/service_images/service_0.png';
        }
        
        if (req.file) {
            if (currentCategory && currentCategory.image_url && 
                currentCategory.image_url !== '/uploads/service_images/service_0.png') {
                const oldPath = path.join(__dirname, currentCategory.image_url);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            image_url = '/uploads/service_images/' + req.file.filename;
        } else if (!deleteImage && currentCategory && currentCategory.image_url) {
            image_url = currentCategory.image_url;
        }
        
        await run(
            `UPDATE services 
             SET name = ?, category = ?, image_url = ?, description = ?
             WHERE id = ?`,
            [name, category, image_url, description || '', id]
        );
        
        res.json({
            success: true,
            message: 'Категория обновлена успешно'
        });
    } catch (error) {
        console.error('Ошибка обновления категории:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить категорию
app.delete('/api/admin/service-categories/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        const category = await get('SELECT image_url FROM services WHERE id = ?', [id]);
        
        if (category && category.image_url && 
            category.image_url !== '/uploads/service_images/service_0.png') {
            const imagePath = path.join(__dirname, category.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        await run('DELETE FROM services WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Категория удалена успешно'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= УСЛУГИ (внутри категорий) =============

// Добавить услугу в категорию
app.post('/api/admin/services/:categoryId', authenticateToken, async (req, res) => {
    const { categoryId } = req.params;
    const { label, cost } = req.body;
    
    if (!label || (cost !== 0 && !cost)) {
        return res.status(400).json({ error: 'Название услуги и стоимость обязательны' });
    }
    
    try {
        const category = await get('SELECT prices_json FROM services WHERE id = ?', [categoryId]);
        if (!category) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        
        const prices = JSON.parse(category.prices_json || '[]');
        prices.push({ label, cost: parseInt(cost) });
        
        await run(
            'UPDATE services SET prices_json = ? WHERE id = ?',
            [JSON.stringify(prices), categoryId]
        );
        
        res.json({
            success: true,
            message: 'Услуга добавлена успешно'
        });
    } catch (error) {
        console.error('Ошибка добавления услуги:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновить услугу
app.put('/api/admin/services/:categoryId/:serviceIndex', authenticateToken, async (req, res) => {
    const { categoryId, serviceIndex } = req.params;
    const { label, cost } = req.body;
    
    if (!label || !cost) {
        return res.status(400).json({ error: 'Название услуги и стоимость обязательны' });
    }
    
    try {
        const category = await get('SELECT prices_json FROM services WHERE id = ?', [categoryId]);
        if (!category) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        
        const prices = JSON.parse(category.prices_json || '[]');
        if (prices[serviceIndex]) {
            prices[serviceIndex] = { label, cost: parseInt(cost) };
            await run(
                'UPDATE services SET prices_json = ? WHERE id = ?',
                [JSON.stringify(prices), categoryId]
            );
        }
        
        res.json({
            success: true,
            message: 'Услуга обновлена успешно'
        });
    } catch (error) {
        console.error('Ошибка обновления услуги:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить услугу
app.delete('/api/admin/services/:categoryId/:serviceIndex', authenticateToken, async (req, res) => {
    const { categoryId, serviceIndex } = req.params;
    
    try {
        const category = await get('SELECT prices_json FROM services WHERE id = ?', [categoryId]);
        if (!category) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        
        const prices = JSON.parse(category.prices_json || '[]');
        prices.splice(serviceIndex, 1);
        
        await run(
            'UPDATE services SET prices_json = ? WHERE id = ?',
            [JSON.stringify(prices), categoryId]
        );
        
        res.json({
            success: true,
            message: 'Услуга удалена успешно'
        });
    } catch (error) {
        console.error('Ошибка удаления услуги:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============= УПРАВЛЕНИЕ ДОКУМЕНТАЦИЕЙ (CRUD) =============

// Создаем папку для документов, если её нет
const documentsUploadDir = path.join(__dirname, 'uploads/documents');
if (!fs.existsSync(documentsUploadDir)) {
    fs.mkdirSync(documentsUploadDir, { recursive: true });
}

// Настройка хранилища для документов
const documentStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, documentsUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'doc_' + uniqueSuffix + ext);
    }
});

const uploadDocument = multer({ 
    storage: documentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB лимит
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|xls|xlsx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Только документы!'));
        }
    }
});

// Получить все документы
app.get('/api/admin/documents', authenticateToken, async (req, res) => {
    try {
        const documents = await getAll('documents');
        const formatted = documents.map(item => ({
            ...item,
            items: JSON.parse(item.items_json || '[]')
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить документы по секции
app.get('/api/admin/documents/:section', authenticateToken, async (req, res) => {
    const { section } = req.params;
    try {
        const document = await get('SELECT * FROM documents WHERE id = ?', [section]);
        if (!document) {
            return res.status(404).json({ error: 'Секция не найдена' });
        }
        const items = JSON.parse(document.items_json || '[]');
        // НЕ переворачиваем массив на сервере!
        document.items = items;
        res.json(document);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Добавить документ в секцию
app.post('/api/admin/documents/:section', authenticateToken, uploadDocument.single('file'), async (req, res) => {
    const { section } = req.params;
    const { title, link, isFile } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Название документа обязательно' });
    }
    
    try {
        const currentDoc = await get('SELECT items_json FROM documents WHERE id = ?', [section]);
        if (!currentDoc) {
            return res.status(404).json({ error: 'Секция не найдена' });
        }
        
        const items = JSON.parse(currentDoc.items_json || '[]');
        let fileLink = link || '#';
        let isFileBool = isFile === 'true';
        
        if (req.file) {
            fileLink = '/uploads/documents/' + req.file.filename;
            isFileBool = true;
        }
        
        items.push({
            title: title,
            link: fileLink,
            isFile: isFileBool
        });
        
        await run(
            'UPDATE documents SET items_json = ? WHERE id = ?',
            [JSON.stringify(items), section]
        );
        
        res.json({
            success: true,
            message: 'Документ добавлен успешно'
        });
    } catch (error) {
        console.error('Ошибка добавления документа:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновить документ
app.put('/api/admin/documents/:section/:index', authenticateToken, uploadDocument.single('file'), async (req, res) => {
    const { section, index } = req.params;
    const { title, link, isFile } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Название документа обязательно' });
    }
    
    try {
        const currentDoc = await get('SELECT items_json FROM documents WHERE id = ?', [section]);
        if (!currentDoc) {
            return res.status(404).json({ error: 'Секция не найдена' });
        }
        
        const items = JSON.parse(currentDoc.items_json || '[]');
        const itemIndex = parseInt(index);
        
        if (!items[itemIndex]) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        
        const newIsFile = isFile === 'true';
        let fileLink = link || items[itemIndex].link;
        
        // ВАЖНО: Если меняем тип с файла на ссылку, удаляем старый файл
        if (items[itemIndex].isFile === true && newIsFile === false) {
            // Это был файл, а стал ссылкой - удаляем файл
            if (items[itemIndex].link && items[itemIndex].link !== '#' && 
                items[itemIndex].link !== '/uploads/documents/' && 
                !items[itemIndex].link.includes('http')) {
                const oldPath = path.join(__dirname, items[itemIndex].link);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                    console.log('Файл удален при смене типа на ссылку:', oldPath);
                }
            }
            fileLink = link || '#';
        }
        
        // Если загружен новый файл
        if (req.file) {
            // Удаляем старый файл, если он был
            if (items[itemIndex].isFile && items[itemIndex].link && 
                items[itemIndex].link !== '#' && 
                items[itemIndex].link !== '/uploads/documents/' && 
                !items[itemIndex].link.includes('http')) {
                const oldPath = path.join(__dirname, items[itemIndex].link);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                    console.log('Старый файл удален при загрузке нового:', oldPath);
                }
            }
            fileLink = '/uploads/documents/' + req.file.filename;
        }
        
        items[itemIndex] = {
            title: title,
            link: fileLink,
            isFile: newIsFile
        };
        
        await run(
            'UPDATE documents SET items_json = ? WHERE id = ?',
            [JSON.stringify(items), section]
        );
        
        res.json({
            success: true,
            message: 'Документ обновлен успешно'
        });
    } catch (error) {
        console.error('Ошибка обновления документа:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить документ
app.delete('/api/admin/documents/:section/:index', authenticateToken, async (req, res) => {
    const { section, index } = req.params;
    
    try {
        const currentDoc = await get('SELECT items_json FROM documents WHERE id = ?', [section]);
        if (!currentDoc) {
            return res.status(404).json({ error: 'Секция не найдена' });
        }
        
        const items = JSON.parse(currentDoc.items_json || '[]');
        const itemIndex = parseInt(index);
        
        if (!items[itemIndex]) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        
        // Удаляем файл, если это загруженный файл
        if (items[itemIndex].isFile && items[itemIndex].link !== '#' && 
            items[itemIndex].link !== '/uploads/documents/' && !items[itemIndex].link.includes('http')) {
            const filePath = path.join(__dirname, items[itemIndex].link);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        items.splice(itemIndex, 1);
        
        await run(
            'UPDATE documents SET items_json = ? WHERE id = ?',
            [JSON.stringify(items), section]
        );
        
        res.json({
            success: true,
            message: 'Документ удален успешно'
        });
    } catch (error) {
        console.error('Ошибка удаления документа:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============= УПРАВЛЕНИЕ КОНТАКТАМИ (CRUD) =============

// ============= ТЕЛЕФОНЫ =============

// Получить все телефоны
app.get('/api/admin/phones', authenticateToken, async (req, res) => {
    try {
        const phones = await getAll('contact_phones ORDER BY id');
        res.json(phones);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Добавить телефон
app.post('/api/admin/phones', authenticateToken, async (req, res) => {
    const { label, value } = req.body;
    
    if (!label || !value) {
        return res.status(400).json({ error: 'Описание и номер телефона обязательны' });
    }
    
    // Валидация номера телефона (простая проверка)
    const phoneRegex = /^[\+\d\s\-\(\)]{10,20}$/;
    if (!phoneRegex.test(value)) {
        return res.status(400).json({ error: 'Введите корректный номер телефона' });
    }
    
    try {
        const result = await run(
            'INSERT INTO contact_phones (label, value) VALUES (?, ?)',
            [label, value]
        );
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обновить телефон
app.put('/api/admin/phones/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { label, value } = req.body;
    
    if (!label || !value) {
        return res.status(400).json({ error: 'Описание и номер телефона обязательны' });
    }
    
    const phoneRegex = /^[\+\d\s\-\(\)]{10,20}$/;
    if (!phoneRegex.test(value)) {
        return res.status(400).json({ error: 'Введите корректный номер телефона' });
    }
    
    try {
        await run(
            'UPDATE contact_phones SET label = ?, value = ? WHERE id = ?',
            [label, value, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Удалить телефон
app.delete('/api/admin/phones/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await run('DELETE FROM contact_phones WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ГРАФИК РАБОТЫ =============

// Получить график работы
app.get('/api/admin/schedule', authenticateToken, async (req, res) => {
    try {
        const schedule = await getAll('contact_schedule ORDER BY id');
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обновить график работы
app.put('/api/admin/schedule/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { start_time, end_time, is_off } = req.body;
    
    try {
        await run(
            'UPDATE contact_schedule SET start_time = ?, end_time = ?, is_off = ? WHERE id = ?',
            [start_time || null, end_time || null, is_off ? 1 : 0, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Бекенд запущен на http://localhost:${PORT}`);
});