import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import AnalyticsDashboard from './components/AnalyticsDashboard';

function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('sw')}>Swahili</button>
      <button onClick={() => changeLanguage('fr')}>French</button>
      <button onClick={() => changeLanguage('ar')}>Arabic</button>
    </div>
  );
}

function App() {
  const { t } = useTranslation();

  return (
    <div>
      <LanguageSelector />
      <h1>{t('welcome')}</h1>
      <p>{t('description')}</p>
      <AnalyticsDashboard />
    </div>
  );
}

export default function WrappedApp() {
  return (
    <Suspense fallback="Loading...">
      <App />
    </Suspense>
  );
}
