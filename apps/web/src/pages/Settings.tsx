import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Globe, Check, Terminal, Key, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { settingsApi, type AppSettings, type UpdateSettingsInput } from '@/lib/api';

const languages = [
  { value: 'es', label: 'Espanol', flag: '\u{1F1EA}\u{1F1F8}' },
  { value: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { value: 'pt', label: 'Portugues', flag: '\u{1F1E7}\u{1F1F7}' },
  { value: 'fr', label: 'Francais', flag: '\u{1F1EB}\u{1F1F7}' },
  { value: 'de', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
];

const providers = [
  { value: 'anthropic', label: 'Anthropic (Claude)', description: 'Claude Sonnet, Claude Haiku' },
  { value: 'openai', label: 'OpenAI (GPT)', description: 'GPT-4o, GPT-4 Turbo' },
  { value: 'google', label: 'Google (Gemini)', description: 'Gemini 1.5 Pro, Gemini 1.5 Flash' },
];

export function Settings() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Language state
  const [language, setLanguage] = useState(
    () => localStorage.getItem('testfarm_language') || 'es'
  );
  const [languageSaved, setLanguageSaved] = useState(false);

  // LLM state
  const [provider, setProvider] = useState<string>('anthropic');
  const [model, setModel] = useState<string>('claude-sonnet-4-20250514');

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateSettingsInput) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  // Initialize state from fetched settings
  useEffect(() => {
    if (settings) {
      setProvider(settings.llmProvider);
      setModel(settings.llmModel);
    }
  }, [settings]);

  // Handle language change
  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem('testfarm_language', value);
    i18n.changeLanguage(value);
    setLanguageSaved(true);
    setTimeout(() => setLanguageSaved(false), 2000);
  };

  // Handle provider change
  const handleProviderChange = (value: string) => {
    setProvider(value);
  };

  // Handle save provider/model
  const handleSaveProvider = () => {
    updateMutation.mutate({
      llmProvider: provider as AppSettings['llmProvider'],
      llmModel: model,
    });
  };

  const selectedLanguage = languages.find(l => l.value === language);
  const selectedProvider = providers.find(p => p.value === provider);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            {languageSaved && (
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

      {/* LLM Provider Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle>{t('settings.llmProvider')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.llmProviderDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue>
                    {selectedProvider?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex flex-col">
                        <span>{p.label}</span>
                        <span className="text-xs text-muted-foreground">{p.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. claude-sonnet-4-20250514, gpt-4o, gemini-1.5-pro"
              />
              <p className="text-xs text-muted-foreground">
                Enter the model ID for the selected provider
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveProvider}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Save configuration
          </Button>

          {updateMutation.isSuccess && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              Configuration saved
            </p>
          )}
        </CardContent>
      </Card>

      {/* API Keys Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>API Keys</CardTitle>
          </div>
          <CardDescription>
            API keys are configured via environment variables on the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <h4 className="font-medium">Anthropic</h4>
                <p className="text-sm text-muted-foreground">ANTHROPIC_API_KEY</p>
              </div>
              {settings?.hasAnthropicKey ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Configured
                </Badge>
              ) : (
                <Badge variant="secondary">Not configured</Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <h4 className="font-medium">OpenAI</h4>
                <p className="text-sm text-muted-foreground">OPENAI_API_KEY</p>
              </div>
              {settings?.hasOpenaiKey ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Configured
                </Badge>
              ) : (
                <Badge variant="secondary">Not configured</Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <h4 className="font-medium">Google</h4>
                <p className="text-sm text-muted-foreground">GOOGLE_API_KEY</p>
              </div>
              {settings?.hasGoogleKey ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Configured
                </Badge>
              ) : (
                <Badge variant="secondary">Not configured</Badge>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p>Set API keys in your <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> file or as environment variables before starting the server.</p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">{t('settings.howItWorks')}</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>{'\u2022'} {t('settings.howItWorksItems.stored')}</li>
            <li>{'\u2022'} {t('settings.howItWorksItems.sent')}</li>
            <li>{'\u2022'} {t('settings.howItWorksItems.writes')}</li>
            <li>{'\u2022'} {t('settings.howItWorksItems.existing')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
