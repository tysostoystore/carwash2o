// Автоматически синхронизирует frontend/config.js с корневым config.js
const path = require('path');
const fs = require('fs');

const rootConfig = require(path.join(__dirname, '..', 'config.js'));
const frontendConfigPath = path.join(__dirname, '..', 'frontend', 'config.js');

const content = `// Этот файл генерируется автоматически из ../config.js\n// Не редактируйте вручную!\nwindow.BACKEND_URL = "${rootConfig.BACKEND_URL}";\nwindow.WEBAPP_URL = "${rootConfig.WEBAPP_URL}";\n`;

fs.writeFileSync(frontendConfigPath, content, 'utf8');
console.log('frontend/config.js успешно синхронизирован с config.js');
