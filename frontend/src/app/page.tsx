'use client';

import Link from 'next/link';
import InstitutionalContact from '@/components/landing/InstitutionalContact';
import { useTranslation } from '@/lib/i18n';

export default function Home() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white mb-16">
          <h1 className="text-6xl font-bold mb-4">{t('landing.heroTitle')}</h1>
          <p className="text-2xl opacity-90">{t('landing.heroSubtitle')}</p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-12">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">{t('landing.featuresTitle')}</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-2xl mr-3">📄</span>
                  <div>
                    <h3 className="font-semibold text-lg">{t('landing.feature1Title')}</h3>
                    <p className="text-gray-600">{t('landing.feature1Desc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">🤖</span>
                  <div>
                    <h3 className="font-semibold text-lg">{t('landing.feature2Title')}</h3>
                    <p className="text-gray-600">{t('landing.feature2Desc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">🔍</span>
                  <div>
                    <h3 className="font-semibold text-lg">{t('landing.feature3Title')}</h3>
                    <p className="text-gray-600">{t('landing.feature3Desc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">📊</span>
                  <div>
                    <h3 className="font-semibold text-lg">{t('landing.feature4Title')}</h3>
                    <p className="text-gray-600">{t('landing.feature4Desc')}</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex flex-col justify-center">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">{t('landing.ctaStartTitle')}</h2>
                <div className="space-y-4">
                  <Link
                    href="/register"
                    className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-lg font-semibold text-center hover:from-indigo-700 hover:to-purple-700 transition-all"
                  >
                    {t('landing.ctaCreateAccount')}
                  </Link>
                  <Link
                    href="/login"
                    className="block w-full bg-white border-2 border-indigo-600 text-indigo-600 py-4 rounded-lg font-semibold text-center hover:bg-indigo-50 transition-all"
                  >
                    {t('landing.ctaSignIn')}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-8">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-4 text-gray-900">{t('landing.techTitle')}</h3>
              <div className="flex flex-wrap justify-center gap-4">
                <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full font-medium">GPT-4</span>
                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full font-medium">Next.js 15</span>
                <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full font-medium">PostgreSQL</span>
                <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full font-medium">TypeScript</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Plans Section */}
        <div className="max-w-7xl mx-auto mt-20">
          <div className="text-center mb-12">
            <span className="inline-block bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-xs font-bold tracking-wider mb-4">
              {t('landing.pricingBadge')}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('landing.pricingTitle')}
            </h2>
            <p className="text-xl text-white opacity-90 max-w-3xl mx-auto">
              {t('landing.pricingSubtitle')}
            </p>
            <div className="flex justify-center gap-3 mt-6 text-sm">
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-white">{t('landing.trustNoCard')}</span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-white">{t('landing.trustCancel')}</span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-white">{t('landing.trustAnnual')}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col hover:shadow-2xl transition-all">
              <div className="mb-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{t('landing.tierFreeName')}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{t('landing.tierFreeTag')}</p>
              </div>
              <div className="mb-5">
                <div className="text-4xl font-bold text-gray-900">$0</div>
                <p className="text-sm text-gray-500">{t('landing.tierFreePrice')}</p>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">1 caso activo</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">5 documentos</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700"><strong>30</strong> consultas IA/mes</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">50 MB almacenamiento</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">Base legal pública</span></li>
                <li className="flex items-start text-gray-400"><span className="mr-2">✗</span><span>Sin OCR Vision</span></li>
              </ul>
              <Link
                href="/register"
                className="block w-full bg-gray-100 text-gray-900 py-2.5 rounded-lg font-semibold text-center text-sm hover:bg-gray-200 transition-colors"
              >
                {t('landing.ctaStartFree')}
              </Link>
            </div>

            {/* Starter Plan */}
            <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col hover:shadow-2xl transition-all">
              <div className="mb-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{t('landing.tierStarterName')}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{t('landing.tierStarterTag')}</p>
              </div>
              <div className="mb-5">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$19</span>
                  <span className="text-gray-500 ml-1 text-sm">{t('common.perMonth')}</span>
                </div>
                <p className="text-sm text-green-600 font-medium">$190{t('common.perYear')} {t('landing.yearlySavings')}</p>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700"><strong>10</strong> casos activos</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">50 documentos</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700"><strong>150</strong> consultas IA/mes</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">2 GB almacenamiento</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">OCR Vision (10 págs/mes)</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">Resúmenes ejecutivos IA</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">Email support 48h</span></li>
              </ul>
              <Link
                href="/register?plan=starter"
                className="block w-full bg-white border-2 border-indigo-600 text-indigo-600 py-2.5 rounded-lg font-semibold text-center text-sm hover:bg-indigo-50 transition-colors"
              >
                {t('landing.ctaStartStarter')}
              </Link>
            </div>

            {/* Pro Plan - Popular */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-6 transform lg:scale-110 lg:-my-2 relative flex flex-col text-white">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-xs font-bold tracking-wider whitespace-nowrap">
                  {t('landing.popularBadge')}
                </span>
              </div>
              <div className="mb-5 mt-2">
                <h3 className="text-xl font-bold mb-1">{t('landing.tierProName')}</h3>
                <p className="text-xs uppercase tracking-wide font-semibold opacity-80">{t('landing.tierProTag')}</p>
              </div>
              <div className="mb-5">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="ml-1 text-sm opacity-80">{t('common.perMonth')}</span>
                </div>
                <p className="text-sm font-medium text-yellow-300">$490{t('common.perYear')} {t('landing.yearlySavings')}</p>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                <li className="flex items-start"><span className="text-yellow-300 mr-2 font-bold">✓</span><span><strong>50</strong> casos activos</span></li>
                <li className="flex items-start"><span className="text-yellow-300 mr-2 font-bold">✓</span><span>250 documentos</span></li>
                <li className="flex items-start"><span className="text-yellow-300 mr-2 font-bold">✓</span><span><strong>600</strong> consultas IA/mes</span></li>
                <li className="flex items-start"><span className="text-yellow-300 mr-2 font-bold">✓</span><span>8 GB almacenamiento</span></li>
                <li className="flex items-start"><span className="text-yellow-300 mr-2 font-bold">✓</span><span>OCR Vision (80 págs/mes)</span></li>
                <li className="flex items-start"><span className="text-yellow-300 mr-2 font-bold">✓</span><span>Coherence Check IA</span></li>
                <li className="flex items-start"><span className="text-yellow-300 mr-2 font-bold">✓</span><span>Auto-fill metadatos IA</span></li>
                <li className="flex items-start"><span className="text-yellow-300 mr-2 font-bold">✓</span><span>Módulo Finanzas + OCR pagos</span></li>
                <li className="flex items-start"><span className="text-yellow-300 mr-2 font-bold">✓</span><span>Soporte chat 24h</span></li>
              </ul>
              <Link
                href="/register?plan=pro"
                className="block w-full bg-white text-indigo-700 py-2.5 rounded-lg font-bold text-center text-sm hover:bg-gray-100 transition-colors shadow-lg"
              >
                {t('landing.ctaStartPro')}
              </Link>
            </div>

            {/* Pro Max Plan */}
            <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col hover:shadow-2xl transition-all relative overflow-hidden border-2 border-indigo-200">
              <div className="absolute top-0 right-0 bg-gradient-to-bl from-indigo-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                {t('landing.powerBadge')}
              </div>
              <div className="mb-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{t('landing.tierProMaxName')}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{t('landing.tierProMaxTag')}</p>
              </div>
              <div className="mb-5">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$99</span>
                  <span className="text-gray-500 ml-1 text-sm">{t('common.perMonth')}</span>
                </div>
                <p className="text-sm text-green-600 font-medium">$990{t('common.perYear')} {t('landing.yearlySavings')}</p>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">Todo lo de Pro</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700"><strong>200</strong> casos activos</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">800 documentos</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700"><strong>1.200</strong> consultas IA/mes</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">25 GB almacenamiento</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">OCR Vision (200 págs/mes)</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">Prioridad en cola IA</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">API access (5K calls/mes)</span></li>
              </ul>
              <Link
                href="/register?plan=pro_max"
                className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold text-center text-sm hover:opacity-90 transition-all"
              >
                {t('landing.ctaStartProMax')}
              </Link>
            </div>

            {/* Studio Plan */}
            <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col hover:shadow-2xl transition-all">
              <div className="mb-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{t('landing.tierStudioName')}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{t('landing.tierStudioTag')}</p>
              </div>
              <div className="mb-5">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$249</span>
                  <span className="text-gray-500 ml-1 text-sm">{t('common.perMonth')}</span>
                </div>
                <p className="text-sm text-green-600 font-medium">$2,490{t('common.perYear')} {t('landing.yearlySavings')}</p>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">Todo lo de Pro Max</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700"><strong>5 usuarios</strong></span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700"><strong>100</strong> casos (cuota equipo)</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700"><strong>3.000</strong> consultas IA/mes (equipo)</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">60 GB almacenamiento</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">OCR Vision (400 págs/mes)</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">Roles &amp; permisos</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">Workspace compartido</span></li>
                <li className="flex items-start"><span className="text-green-500 mr-2 font-bold">✓</span><span className="text-gray-700">API access (15K calls/mes)</span></li>
              </ul>
              <Link
                href="/register?plan=studio"
                className="block w-full bg-white border-2 border-purple-600 text-purple-600 py-2.5 rounded-lg font-semibold text-center text-sm hover:bg-purple-50 transition-colors"
              >
                {t('landing.ctaStartStudio')}
              </Link>
            </div>
          </div>

          {/* Institutional Plan — Sales-led */}
          <InstitutionalContact />

          {/* Comparison vs competitors */}
          <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-center mb-2 text-gray-900">{t('landing.comparisonTitle')}</h3>
            <p className="text-center text-gray-500 text-sm mb-8">{t('landing.comparisonSubtitle')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">Característica</th>
                    <th className="text-center py-3 px-3 font-semibold text-indigo-600">Poweria Pro<br/><span className="text-xs font-normal text-gray-500">$49/mes</span></th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-500">Clio Manage<br/><span className="text-xs font-normal">$109/mes</span></th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-500">MyCase<br/><span className="text-xs font-normal">$79/mes</span></th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100"><td className="py-2.5 px-3">Base legal ecuatoriana nativa</td><td className="text-center text-green-600 font-bold">✓</td><td className="text-center text-gray-300">—</td><td className="text-center text-gray-300">—</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2.5 px-3">RAG con citas verificables</td><td className="text-center text-green-600 font-bold">✓</td><td className="text-center text-gray-300">—</td><td className="text-center text-yellow-500">parcial</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2.5 px-3">Auto-fill IA de metadatos del caso</td><td className="text-center text-green-600 font-bold">✓</td><td className="text-center text-gray-300">—</td><td className="text-center text-gray-300">—</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2.5 px-3">OCR Vision para PDFs escaneados</td><td className="text-center text-green-600 font-bold">✓</td><td className="text-center text-gray-300">—</td><td className="text-center text-gray-300">—</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2.5 px-3">Coherence Check IA</td><td className="text-center text-green-600 font-bold">✓</td><td className="text-center text-gray-300">—</td><td className="text-center text-gray-300">—</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2.5 px-3">Módulo financiero (acuerdos, hitos, pagos)</td><td className="text-center text-green-600 font-bold">✓</td><td className="text-center text-green-600">✓</td><td className="text-center text-green-600">✓</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2.5 px-3">Casos ilimitados</td><td className="text-center text-green-600 font-bold">✓</td><td className="text-center text-green-600">✓</td><td className="text-center text-green-600">✓</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2.5 px-3">Soporte en español Ecuador</td><td className="text-center text-green-600 font-bold">✓</td><td className="text-center text-gray-300">—</td><td className="text-center text-gray-300">—</td></tr>
                  <tr><td className="py-2.5 px-3">Pago en USD vía transferencia local</td><td className="text-center text-green-600 font-bold">✓</td><td className="text-center text-gray-300">—</td><td className="text-center text-gray-300">—</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Add-ons section */}
          <div className="mt-8 bg-gradient-to-br from-white to-indigo-50 rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-center mb-2 text-gray-900">{t('landing.addonsTitle')}</h3>
            <p className="text-center text-gray-500 text-sm mb-6">{t('landing.addonsSubtitle')}</p>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <div className="text-2xl mb-1">🔍</div>
                <div className="font-bold text-gray-900">+1.000 consultas IA</div>
                <div className="text-indigo-600 font-bold text-lg">$15</div>
                <div className="text-xs text-gray-500">Pro / Studio / Enterprise</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <div className="text-2xl mb-1">📷</div>
                <div className="font-bold text-gray-900">+200 págs OCR</div>
                <div className="text-indigo-600 font-bold text-lg">$5</div>
                <div className="text-xs text-gray-500">Starter+</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <div className="text-2xl mb-1">💾</div>
                <div className="font-bold text-gray-900">+10 GB storage</div>
                <div className="text-indigo-600 font-bold text-lg">$3</div>
                <div className="text-xs text-gray-500">Starter+</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <div className="text-2xl mb-1">👥</div>
                <div className="font-bold text-gray-900">+1 seat (Studio)</div>
                <div className="text-indigo-600 font-bold text-lg">$29</div>
                <div className="text-xs text-gray-500">Solo Studio</div>
              </div>
            </div>
          </div>

          {/* Trust signals */}
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-center mb-8 text-gray-900">{t('landing.trustSignalsTitle')}</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🇪🇨</div>
                <h4 className="font-bold text-base mb-2">{t('landing.trustEcuadorTitle')}</h4>
                <p className="text-gray-600 text-sm">{t('landing.trustEcuadorDesc')}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🔒</div>
                <h4 className="font-bold text-base mb-2">{t('landing.trustSecurityTitle')}</h4>
                <p className="text-gray-600 text-sm">{t('landing.trustSecurityDesc')}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🚀</div>
                <h4 className="font-bold text-base mb-2">{t('landing.trustUpdatesTitle')}</h4>
                <p className="text-gray-600 text-sm">{t('landing.trustUpdatesDesc')}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📱</div>
                <h4 className="font-bold text-base mb-2">{t('landing.trustMultiTitle')}</h4>
                <p className="text-gray-600 text-sm">{t('landing.trustMultiDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
