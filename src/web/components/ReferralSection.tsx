'use client';
import { useState } from 'react';
import {
  UsersIcon,
  UserIcon,
  BanknotesIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from '@heroicons/react/16/solid';

export default function ReferralSection() {
  const [activeTab, setActiveTab] = useState<'earnings' | 'claims'>('earnings');
  const link = typeof window !== 'undefined' ? `${window.location.origin}/auth/register?aff=XPTG007` : '';

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-lg bg-[#fde8df] flex items-center justify-center">
          <UsersIcon className="w-5 h-5 text-[#e8673a]" />
        </div>
        <h3 className="text-base font-semibold">邀请推广</h3>
      </div>
      <p className="text-gray-400 text-xs mb-4">邀请好友兑换消费，获得丰厚奖励</p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: UserIcon, bg: 'bg-[#fde8df]', iconColor: 'text-[#e8673a]', label: '邀请人数', value: '0' },
          { icon: BanknotesIcon, bg: 'bg-[#d4f5e2]', iconColor: 'text-[#27ae60]', label: '已领取', value: '¥0.00' },
          { icon: ClockIcon, bg: 'bg-[#fde8df]', iconColor: 'text-[#e8673a]', label: '待领取', value: '¥0.00' },
        ].map(({ icon: Icon, bg, iconColor, label, value }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3.5 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-lg font-bold">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[13px] font-semibold mb-2">我的邀请链接</p>
      <div className="flex gap-2 mb-1.5">
        <input readOnly value={link} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-600 bg-gray-50 focus:outline-none focus:border-[#e8673a]" />
        <button onClick={() => navigator.clipboard.writeText(link)} className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
          <ArrowPathIcon className="w-4 h-4" /> 复制
        </button>
      </div>
      <p className="text-xs text-gray-300 mb-4">通过此链接注册的用户兑换并消费后，您将获得相应奖励</p>

      <div className="bg-[#fffbf0] border border-[#f5e8c0] rounded-lg p-3.5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#fde8df] flex items-center justify-center flex-shrink-0">
            <ClipboardDocumentListIcon className="w-5 h-5 text-[#e8673a]" />
          </div>
          <h4 className="text-[13px] font-semibold">邀请规则</h4>
        </div>
        <ol className="list-decimal pl-4 space-y-1">
          {[
            '被邀请者每兑换1亿额度，奖励您1元；5亿奖励您5元，以此类推。',
            '长期享受返现：被邀请人以后每次购买都享受返现。',
            '严禁自我邀请薅羊毛行为，我们有多重检测，如被发现直接封禁、额度清零。',
            '每月1号左右处理提现。',
          ].map((rule, i) => (
            <li key={i} className="text-[13px] text-gray-600 leading-relaxed">{rule}</li>
          ))}
        </ol>
      </div>

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold">收益与申请</span>
          <div className="flex gap-1">
            {(['earnings', 'claims'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-md text-[13px] ${activeTab === tab ? 'bg-[#e8673a] text-white' : 'text-gray-500'}`}>
                {tab === 'earnings' ? '收益记录' : '申请记录'}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-300">最近10条记录</span>
      </div>
      <div className="text-center py-8 text-gray-300">
        <CurrencyDollarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-[13px]">暂无收益记录</p>
        <p className="text-[13px]"><a href="#" className="text-[#e8673a]">邀请好友消费后可获得奖励</a></p>
      </div>
    </div>
  );
}
