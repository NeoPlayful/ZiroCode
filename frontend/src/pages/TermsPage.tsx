import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon } from '@heroicons/react/20/solid';
import Footer from '../components/Footer';

export default function TermsPage() {
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
                <span className="text-sm text-gray-600">欢迎，{user.name}</span>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  进入控制台
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[900px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">使用条款</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. 服务条款接受</h2>
            <p>使用 ZiroCode 服务即表示您同意遵守本使用条款。如果您不同意这些条款，请不要使用我们的服务。</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. 账户注册</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>您必须提供准确、完整的注册信息</li>
              <li>您有责任保护账户安全和密码保密</li>
              <li>您对账户下的所有活动负责</li>
              <li>禁止共享账户或转让账户</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. 服务使用规范</h2>
            <p>使用我们的服务时，您同意：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>遵守所有适用的法律法规</li>
              <li>不进行任何非法、欺诈或滥用行为</li>
              <li>不干扰或破坏服务的正常运行</li>
              <li>不尝试未经授权访问系统或数据</li>
              <li>不使用服务进行垃圾信息发送或恶意攻击</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. API 使用限制</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>遵守 API 调用频率限制</li>
              <li>不得滥用或过度使用 API 资源</li>
              <li>不得将 API 密钥公开或共享给第三方</li>
              <li>合理使用配额，避免浪费资源</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. 付费服务</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>付费服务按照公布的价格收费</li>
              <li>我们保留随时调整价格的权利</li>
              <li>退款政策以具体服务条款为准</li>
              <li>未支付费用可能导致服务暂停</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. 知识产权</h2>
            <p>ZiroCode 服务及其所有内容、功能和特性均为我们或许可方的财产，受知识产权法保护。</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. 免责声明</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>服务按"现状"提供，不提供任何明示或暗示的保证</li>
              <li>我们不保证服务不中断或无错误</li>
              <li>我们不对因使用服务造成的损失负责</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. 服务变更和终止</h2>
            <p>我们保留随时修改、暂停或终止服务的权利。对于违反条款的用户，我们有权暂停或终止其账户。</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. 条款修改</h2>
            <p>我们可能会不时更新这些条款。继续使用服务即表示您接受修改后的条款。</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. 联系方式</h2>
            <p>如有任何关于使用条款的问题，请通过工单系统联系我们。</p>
          </section>

          <p className="text-sm text-gray-500 mt-8">最后更新时间：2026年5月</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
