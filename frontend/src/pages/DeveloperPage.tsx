export default function DeveloperPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">API 文档</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">认证方式</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Cookie:</strong> 浏览器自动携带 session cookie</p>
          <p><strong>Bearer Token:</strong> Authorization: Bearer YOUR_API_KEY</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">状态码</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left p-2">状态码</th><th className="text-left p-2">说明</th></tr></thead>
          <tbody>
            <tr className="border-b"><td className="p-2">200</td><td className="p-2">请求成功</td></tr>
            <tr className="border-b"><td className="p-2">400</td><td className="p-2">请求参数错误</td></tr>
            <tr className="border-b"><td className="p-2">401</td><td className="p-2">未登录</td></tr>
            <tr className="border-b"><td className="p-2">403</td><td className="p-2">权限不足</td></tr>
            <tr className="border-b"><td className="p-2">404</td><td className="p-2">资源不存在</td></tr>
            <tr className="border-b"><td className="p-2">500</td><td className="p-2">服务器错误</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">错误码</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left p-2">错误码</th><th className="text-left p-2">说明</th></tr></thead>
          <tbody>
            <tr className="border-b"><td className="p-2">UNAUTHORIZED</td><td className="p-2">未登录</td></tr>
            <tr className="border-b"><td className="p-2">FORBIDDEN</td><td className="p-2">权限不足</td></tr>
            <tr className="border-b"><td className="p-2">NOT_FOUND</td><td className="p-2">资源不存在</td></tr>
            <tr className="border-b"><td className="p-2">BAD_REQUEST</td><td className="p-2">请求参数错误</td></tr>
            <tr className="border-b"><td className="p-2">INTERNAL</td><td className="p-2">服务器内部错误</td></tr>
            <tr className="border-b"><td className="p-2">QUOTA_EXHAUSTED</td><td className="p-2">配额已用完</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
