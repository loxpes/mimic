import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings as SettingsIcon, Globe, Check } from 'lucide-react';

const languages = [
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'pt', label: 'Português', flag: '🇧🇷' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export function Settings() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(
    () => localStorage.getItem('testfarm_language') || 'es'
  );
  const [saved, setSaved] = useState(false);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem('testfarm_language', value);
    // Also change the interface language
    i18n.changeLanguage(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedLanguage = languages.find(l => l.value === language);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          {t('settings.title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Language Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>{t('settings.language')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.interfaceLanguageDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[240px]">
                <SelectValue>
                  {selectedLanguage && (
                    <span className="flex items-center gap-2">
                      <span>{selectedLanguage.flag}</span>
                      <span>{selectedLanguage.label}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" />
                {t('common.saved')}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {t('settings.appliedToNewSessions')}
          </p>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">{t('settings.howItWorks')}</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {t('settings.howItWorksItems.stored')}</li>
            <li>• {t('settings.howItWorksItems.sent')}</li>
            <li>• {t('settings.howItWorksItems.writes')}</li>
            <li>• {t('settings.howItWorksItems.existing')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
