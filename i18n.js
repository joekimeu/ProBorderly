import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome: "Welcome to the African Business Compliance Platform",
      description: "AI-powered regulatory compliance and smart contract management."
    }
  },
  sw: {
    translation: {
      welcome: "Karibu kwenye Jukwaa la Uzingatiaji wa Biashara za Afrika",
      description: "Uzingatiaji wa kanuni unaotumia AI na usimamizi wa mikataba smart."
    }
  },
  fr: {
    translation: {
      welcome: "Bienvenue sur la plateforme de conformité des entreprises africaines",
      description: "Conformité réglementaire alimentée par l'IA et gestion des contrats intelligents."
    }
  },
  ar: {
    translation: {
      welcome: "مرحبًا بكم في منصة الامتثال للأعمال الأفريقية",
      description: "الامتثال التنظيمي المدعوم بالذكاء الاصطناعي وإدارة العقود الذكية."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
