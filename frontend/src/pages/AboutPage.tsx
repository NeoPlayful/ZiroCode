import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

export default function AboutPage() {
  const { t } = useTranslation('static');
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null }),
    staleTime: 5 * 60 * 1000,
  });
  const user = data?.user;

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#0a0a0a] flex flex-col">
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
            <SparklesIcon className="w-6 h-6 text-[#F97346]" />
            <span>ZiroCode</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600">{t('static.nav.welcome', { name: user.name })}</span>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t('static.nav.dashboard')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/auth/login')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
                >
                  {t('static.nav.login')}
                </button>
                <button
                  onClick={() => navigate('/auth/register')}
                  className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t('static.nav.register')}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[900px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">{t('static.about.title')}</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('static.about.whoWeAre')}</h2>
            <p>{t('static.about.whoWeAreContent')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('static.about.mission')}</h2>
            <p>{t('static.about.missionContent')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('static.about.advantages')}</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>统一接口</strong>：兼容 OpenAI API 格式，一套代码接入所有主流模型</li>
              <li><strong>高可用性</strong>：多节点部署，智能负载均衡，保障服务稳定</li>
              <li><strong>成本优化</strong>：灵活的定价策略，帮助开发者降低 AI 使用成本</li>
              <li><strong>快速响应</strong>：优化的网络架构，提供更快的 API 响应速度</li>
              <li><strong>完善支持</strong>：专业的技术支持团队，及时解决您的问题</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('static.about.supportedModels')}</h2>
            <p>{t('static.about.supportedModelsContent')}</p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">OpenAI</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Claude</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Gemini</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">DeepSeek</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Qwen</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Grok</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Moonshot</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Mistral</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">{t('static.about.more')}</div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('static.about.useCases')}</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI 应用开发：快速集成多种 AI 能力</li>
              <li>智能客服系统：构建高效的对话机器人</li>
              <li>内容生成平台：自动化内容创作</li>
              <li>数据分析工具：智能数据处理和洞察</li>
              <li>教育培训：AI 辅助学习和教学</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('static.about.contact')}</h2>
            <p>{t('static.about.contactContent')}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>工单系统：登录后台提交工单</li>
              <li>技术文档：查看详细的 API 文档和使用指南</li>
            </ul>
          </section>

          <p className="text-sm text-gray-500 mt-8">{t('static.about.copyright')}</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
