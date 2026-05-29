import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initPromise = i18next
  .use(Backend)
  .init({
    fallbackLng: 'zh-CN',
    backend: {
      loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
    },
    ns: ['errors', 'messages'],
    defaultNS: 'messages',
  });

export { initPromise };
export default i18next;
