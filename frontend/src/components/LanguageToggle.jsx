// frontend/src/components/LanguageToggle.jsx
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle({ isSidebarOpen }) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = i18n.language;

  const languages = [
    { code: 'en', name: 'English', short: 'EN' },
    { code: 'id', name: 'Indonesia', short: 'ID' },
  ];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  if (!isSidebarOpen) {
    // Collapsed sidebar - show short code (EN/ID)
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          title={t('language.changeLanguage')}
        >
          <span className="text-sm font-bold text-gray-700">{currentLanguage.short}</span>
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                  currentLang === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="text-sm font-bold">{lang.short}</span>
                <span className="text-sm font-medium">{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Expanded sidebar - show full language name
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between transition-colors group"
      >
        <div className="flex items-center space-x-3">
          <span className="text-sm font-bold text-gray-700">{currentLanguage.short}</span>
          <span className="text-sm font-medium text-gray-700">{currentLanguage.name}</span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                currentLang === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              <span className="text-sm font-bold">{lang.short}</span>
              <span className="text-sm font-medium">{lang.name}</span>
              {currentLang === lang.code && (
                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}