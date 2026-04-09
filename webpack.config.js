// Подключаем встроенный модуль Node.js для работы с путями файловой системы
const path = require("path");
const fs = require("fs"); // Модуль для работы с файловой системой

// Плагин для автоматического создания HTML-файла с подключёнными бандлами
const HtmlWebpackPlugin = require("html-webpack-plugin");

// Плагин для очистки папки сборки перед каждой новой сборкой
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

// Плагин для извлечения CSS в отдельные файлы
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// Получаем список всех HTML-файлов из папки src/pages
const pagesDir = path.resolve(__dirname, "src/pages");
const htmlFiles = fs.readdirSync(pagesDir).filter(fileName => fileName.endsWith(".html"));

// Генерируем точки входа (Entry Points) и плагины для HTML автоматически
const entryPoints = {};
const htmlPlugins = htmlFiles.map(fileName => {
  const pageName = fileName.replace(".html", ""); // например, "about" или "index"
  
  // Добавляем JS-файл в точки входа, если он существует
  // Если для страницы нет своего JS, можно использовать общий или проверять наличие
  const scriptPath = `./src/scripts/${pageName}.js`;
  if (fs.existsSync(path.resolve(__dirname, scriptPath))) {
    entryPoints[pageName] = scriptPath;
  } else {
    // Если JS файла конкретно под страницу нет, можно подключить какой-то дефолтный
    entryPoints[pageName] = "./src/scripts/index.js"; 
  }

  // Настраиваем путь выхода для HTML
  // index.html в корень, остальные в папку pages/
  const outputHtmlPath = pageName === "index" ? "index.html" : `pages/${pageName}.html`;

  return new HtmlWebpackPlugin({
    template: `./src/pages/${fileName}`,
    filename: outputHtmlPath,
    chunks: [pageName], // Подключаем только соответствующий этой странице JS/CSS
  });
});

// Экспортируем объект конфигурации Webpack
module.exports = {
  // Точка входа — главный JavaScript-файл приложения
  entry: entryPoints,

  // Настройки выхода — куда и как будет собираться проект
  output: {
    // Папка, куда Webpack будет складывать сборку
    path: path.resolve(__dirname, "dist"),
    // Имя итогового JS-файла
    filename: "scripts/[name].[contenthash].js",
    // Публичный путь — нужен для корректной работы роутинга и загрузки ресурсов
    publicPath: "/",
  },

  // Режим сборки: development (удобен для разработки) или production (оптимизированный)
  mode: "production",

  // Настройки локального сервера разработки
  devServer: {
    // Папка, из которой сервер будет раздавать файлы
    static: path.resolve(__dirname, "./dist"),
    // Включает gzip-сжатие для ускорения загрузки
    compress: true,
    // Порт, на котором будет запущен сервер
    port: 8081,
    // Автоматически открывает проект в браузере после запуска
    open: true,
    // Позволяет использовать HTML5 History API (SPA-маршрутизация)
    historyApiFallback: true,
  },

  performance: {
    maxEntrypointSize: 51200000, // Увеличиваем лимит до ~50000 Кб
    maxAssetSize: 51200000       // Увеличиваем лимит до ~50000 Кб
  },  

  // Модули — правила обработки различных типов файлов
  module: {
    rules: [
      {
        // Обработка всех JS-файлов через Babel
        test: /\.js$/,
        use: "babel-loader",
        // Исключаем node_modules, чтобы не тратить время на чужие пакеты
        exclude: "/node_modules/",
      },
      {
        // Обработка изображений (png, svg, jpg, gif и т.д.)
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        // Тип ресурса — Webpack сам копирует файл и возвращает ссылку на него
        type: "asset/resource",
        // Настройки генерации имени файлов (папка, оригинальное имя, хэш, расширение)
        generator: {
          filename: "images/[name].[hash][ext]",
        },
      },
      {
        // Обработка шрифтов
        test: /\.(woff(2)?|eot|ttf|otf)$/i,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name].[hash][ext]",
        },
      },
      {
        // Обработка CSS-файлов
        test: /\.css$/,
        use: [
          // Извлекает CSS в отдельные файлы вместо вставки через <style>
          MiniCssExtractPlugin.loader,
          {
            // Позволяет Webpack понимать импорты внутри CSS
            loader: "css-loader",
            options: { importLoaders: 1 }, // указывает, сколько лоадеров применять до css-loader
          },
          // Подключает PostCSS (для autoprefixer, cssnano и других плагинов)
          "postcss-loader",
        ],
      },
    ],
  },

  // Подключаем плагины для расширения возможностей сборки
  plugins: [
    // Создаёт HTML-файл на основе шаблона и автоматически подключает JS/CSS
    ...htmlPlugins,
    // Очищает папку dist перед новой сборкой
    new CleanWebpackPlugin(),
    // Выносит CSS в отдельные файлы
    new MiniCssExtractPlugin({
      filename: "styles/[name].[contenthash].css", // Чтобы стили лежали в dist/styles/
    }),
  ],
};
