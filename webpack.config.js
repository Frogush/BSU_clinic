// Подключаем встроенный модуль Node.js для работы с путями файловой системы
const path = require("path");

// Плагин для автоматического создания HTML-файла с подключёнными бандлами
const HtmlWebpackPlugin = require("html-webpack-plugin");

// Плагин для очистки папки сборки перед каждой новой сборкой
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

// Плагин для извлечения CSS в отдельные файлы
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// Экспортируем объект конфигурации Webpack
module.exports = {
  // Точка входа — главный JavaScript-файл приложения
  entry: { main: "./src/scripts/index.js" },

  // Настройки выхода — куда и как будет собираться проект
  output: {
    // Папка, куда Webpack будет складывать сборку
    path: path.resolve(__dirname, "dist"),
    // Имя итогового JS-файла
    filename: "main.js",
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
    maxEntrypointSize: 512000, // Увеличиваем лимит до ~500 Кб
    maxAssetSize: 512000       // Увеличиваем лимит до ~500 Кб
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
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
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
    new HtmlWebpackPlugin({
      template: "./src/pages/index.html",
    }),
    // Очищает папку dist перед новой сборкой
    new CleanWebpackPlugin(),
    // Выносит CSS в отдельные файлы
    new MiniCssExtractPlugin(),
  ],
};
