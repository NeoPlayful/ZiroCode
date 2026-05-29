import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-8">{t('static.privacy.title')}</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. 信息收集</h2>
            <p>我们收集您在使用 ZiroCode 服务时提供的信息，包括但不限于：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>账户信息：邮箱地址、用户名等注册信息</li>
              <li>使用数据：API 调用记录、使用量统计</li>
              <li>技术信息：IP 地址、浏览器类型、设备信息</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. 信息使用</h2>
            <p>我们使用收集的信息用于：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>提供和改进我们的服务</li>
              <li>处理您的请求和交易</li>
              <li>发送服务通知和更新</li>
              <li>保护服务安全，防止欺诈行为</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. 信息保护</h2>
            <p>我们采取合理的安全措施保护您的个人信息，包括：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>数据加密传输和存储</li>
              <li>访问控制和权限管理</li>
              <li>定期安全审计</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. 信息共享</h2>
            <p>我们不会出售您的个人信息。仅在以下情况下可能共享您的信息：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>获得您的明确同意</li>
              <li>法律法规要求</li>
              <li>保护我们的合法权益</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Cookie 使用</h2>
            <p>我们使用 Cookie 和类似技术来改善用户体验、分析服务使用情况。您可以通过浏览器设置管理 Cookie。</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. 您的权利</h2>
            <p>您有权：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>访问和更新您的个人信息</li>
              <li>删除您的账户和数据</li>
              <li>拒绝某些数据处理</li>
              <li>导出您的数据</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. 政策更新</h2>
            <p>我们可能会不时更新本隐私政策。重大变更时，我们会通过邮件或网站公告通知您。</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. 联系我们</h2>
            <p>如有任何关于隐私政策的问题，请通过工单系统联系我们。</p>
          </section>

          <p className="text-sm text-gray-500 mt-8">{t('static.privacy.lastUpdated')}</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
