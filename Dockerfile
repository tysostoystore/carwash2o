# Используем официальный Node.js образ
FROM node:20

# Создаём рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --production

# Копируем остальные файлы проекта
COPY . .

# Открываем порт (важно для Fly.io)
EXPOSE 3000

# Запуск приложения
CMD ["node", "backend/server.js"]
