import { useNavigate } from 'react-router-dom';
import { SparklesIcon } from '@heroicons/react/20/solid';

export default function LandingPage() {
  const navigate = useNavigate();

  const copyAPI = () => {
    const text = 'https://api.zirocode.com/v1/chat/completions';
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector('.copy-btn') as HTMLButtonElement;
      if (btn) {
        btn.textContent = '已复制';
        setTimeout(() => {
          btn.textContent = '复制';
        }, 2000);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#0a0a0a] flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
            <SparklesIcon className="w-6 h-6 text-[#F97346]" />
            <span>ZiroCode</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/auth/login')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              登录
            </button>
            <button
              onClick={() => navigate('/auth/register')}
              className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors"
            >
              注册
            </button>
          </div>
        </div>
      </nav>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative">
        {/* Background Glow */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 70, 0.08) 0%, transparent 70%)'
          }}
        />

        <div className="max-w-[900px] text-center relative z-10">
          {/* Hero Title */}
          <h1 className="text-7xl font-bold leading-tight mb-6 tracking-tight">
            统一的<br />AI 模型接口网关
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 leading-relaxed mb-12 max-w-[600px] mx-auto">
            兼容 OpenAI API 格式，统一接入 Claude、OpenAI、Gemini、OpenClaw 等主流模型。更稳定、更低成本。
          </p>

          {/* API Box */}
          <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-4 px-6 my-12 max-w-[600px] mx-auto flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <span className="flex-1 font-mono text-[15px] select-all">
              https://api.zirocode.com/v1/chat/completions
            </span>
            <button
              onClick={copyAPI}
              className="copy-btn bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-black transition-colors"
            >
              复制
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center mb-20">
            <button
              onClick={() => navigate('/auth/register')}
              className="px-8 py-3.5 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-xl text-base font-medium transition-all hover:-translate-y-0.5"
            >
              获取 API Key
            </button>
            <button
              onClick={() => navigate('/docs')}
              className="px-8 py-3.5 bg-gray-100 hover:bg-gray-200 text-black rounded-xl text-base font-medium border border-gray-200 transition-colors"
            >
              查看文档
            </button>
          </div>

          {/* Platforms */}
          <div className="mt-20">
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-8">
              支持的平台
            </div>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-8 max-w-[1000px] mx-auto">
              {['OpenAI', 'Claude', 'Gemini', 'OpenRouter', 'DeepSeek', 'OpenClaw',
                'Qwen', 'Grok', 'Moonshot', 'Mistral', 'Llama', 'Stability AI'].map((platform) => (
                <div
                  key={platform}
                  className="flex items-center justify-center h-10 opacity-40 hover:opacity-80 transition-opacity text-base font-medium"
                >
                  {platform}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="flex items-center gap-2 font-bold text-lg mb-2">
            <SparklesIcon className="w-6 h-6 text-[#F97346]" />
            <span>ZiroCode</span>
          </div>
          <p className="text-gray-500 text-sm mb-6">专业的AI服务平台，为开发者提供AI解决方案。</p>
          <p className="text-gray-400 text-xs">© 2026 ZiroCode. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
