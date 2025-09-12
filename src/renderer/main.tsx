import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initializeI18n } from './i18n'

// 异步初始化应用
async function initializeApp() {
  try {
    // 首先初始化 i18n
    await initializeI18n();
    
    // 然后渲染应用
    createRoot(document.getElementById("root")!).render(<App />);
  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // 如果初始化失败，仍然渲染应用（使用默认语言）
    createRoot(document.getElementById("root")!).render(<App />);
  }
}

// 启动应用
initializeApp();
