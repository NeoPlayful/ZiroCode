import { useTranslation } from 'react-i18next';

export default function DeveloperPage() {
  const { t } = useTranslation('developer');

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('developer.title')}</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('developer.authentication')}</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Cookie:</strong> {t('developer.authCookie')}</p>
          <p><strong>Bearer Token:</strong> {t('developer.authBearer')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('developer.statusCodes')}</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left p-2">{t('developer.statusCode')}</th><th className="text-left p-2">{t('developer.description')}</th></tr></thead>
          <tbody>
            <tr className="border-b"><td className="p-2">200</td><td className="p-2">{t('developer.status.200')}</td></tr>
            <tr className="border-b"><td className="p-2">400</td><td className="p-2">{t('developer.status.400')}</td></tr>
            <tr className="border-b"><td className="p-2">401</td><td className="p-2">{t('developer.status.401')}</td></tr>
            <tr className="border-b"><td className="p-2">403</td><td className="p-2">{t('developer.status.403')}</td></tr>
            <tr className="border-b"><td className="p-2">404</td><td className="p-2">{t('developer.status.404')}</td></tr>
            <tr className="border-b"><td className="p-2">500</td><td className="p-2">{t('developer.status.500')}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">{t('developer.errorCodes')}</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left p-2">{t('developer.errorCode')}</th><th className="text-left p-2">{t('developer.description')}</th></tr></thead>
          <tbody>
            <tr className="border-b"><td className="p-2">UNAUTHORIZED</td><td className="p-2">{t('developer.errors.UNAUTHORIZED')}</td></tr>
            <tr className="border-b"><td className="p-2">FORBIDDEN</td><td className="p-2">{t('developer.errors.FORBIDDEN')}</td></tr>
            <tr className="border-b"><td className="p-2">NOT_FOUND</td><td className="p-2">{t('developer.errors.NOT_FOUND')}</td></tr>
            <tr className="border-b"><td className="p-2">BAD_REQUEST</td><td className="p-2">{t('developer.errors.BAD_REQUEST')}</td></tr>
            <tr className="border-b"><td className="p-2">INTERNAL</td><td className="p-2">{t('developer.errors.INTERNAL')}</td></tr>
            <tr className="border-b"><td className="p-2">QUOTA_EXHAUSTED</td><td className="p-2">{t('developer.errors.QUOTA_EXHAUSTED')}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
