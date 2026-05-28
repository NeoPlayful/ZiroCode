import { Link } from 'react-router-dom';
import { SparklesIcon } from '@heroicons/react/20/solid';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex items-center gap-2 font-bold text-lg mb-2">
          <SparklesIcon className="w-6 h-6 text-[#F97346]" />
          <span>ZiroCode</span>
        </div>
        <p className="text-gray-500 text-sm mb-4">专业的AI服务平台，为开发者提供AI解决方案。</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 ZiroCode. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-gray-600 transition-colors">隐私政策</Link>
            <Link to="/terms" className="hover:text-gray-600 transition-colors">使用条款</Link>
            <Link to="/about" className="hover:text-gray-600 transition-colors">关于</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
