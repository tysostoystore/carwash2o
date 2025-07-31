# Используем официальный Node.js образ
FROM node:20

# Создаём рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Устанавливаем глобальные зависимости
RUN npm install -g concurrently

COPY start.sh ./
RUN chmod +x start.sh

# Открываем порт (важно для Fly.io)
EXPOSE 3000

# Запуск приложения
CMD ["./start.sh"]
