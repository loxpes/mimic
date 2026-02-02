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
import { Settings as SettingsIcon, Globe, Check, Terminal, Key, AlertCircle, Loader2 } from 'lucide-react';
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
  { value: 'anthropic', label: 'Anthropic (Claude)', description: 'Claude 3.5 Sonnet, Claude 3 Haiku' },
  { value: 'openai', label: 'OpenAI (GPT)', description: 'GPT-4o, GPT-4 Turbo' },
  { value: 'google', label: 'Google (Gemini)', description: 'Gemini 1.5 Pro, Gemini 1.5 Flash' },
  { value: 'ollama', label: 'Ollama (Local)', description: 'Llama 3, Mistral, CodeLlama' },
  { value: 'claude-cli', label: 'Claude Code CLI', description: 'Solo para desarrollo local' },
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
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434/v1');

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
      setOllamaUrl(settings.ollamaBaseUrl || 'http://localhost:11434/v1');
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
      ollamaBaseUrl: provider === 'ollama' ? ollamaUrl : undefined,
    });
  };

  // Handle save API key
  const handleSaveAnthropicKey = () => {
    updateMutation.mutate({ anthropicApiKey: anthropicKey || null });
    setAnthropicKey(''); // Clear input after save
  };

  const handleSaveOpenaiKey = () => {
    updateMutation.mutate({ openaiApiKey: openaiKey || null });
    setOpenaiKey(''); // Clear input after save
  };

  const handleSaveGoogleKey = () => {
    updateMutation.mutate({ googleApiKey: googleKey || null });
    setGoogleKey(''); // Clear input after save
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
              <label className="text-sm font-medium">Modelo</label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="ej: claude-sonnet-4-20250514, gpt-4o, gemini-1.5-pro"
              />
              <p className="text-xs text-muted-foreground">
                Introduce el ID del modelo del proveedor seleccionado
              </p>
            </div>
          </div>

          {/* Ollama URL (only shown for ollama) */}
          {provider === 'ollama' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Ollama URL</label>
              <Input
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
              />
            </div>
          )}

          <Button
            onClick={handleSaveProvider}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Guardar configuracion
          </Button>

          {updateMutation.isSuccess && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              Configuracion guardada
            </p>
          )}
        </CardContent>
      </Card>

      {/* API Keys Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>API Keys</CardTitle>
          </div>
          <CardDescription>
            Las API keys se almacenan encriptadas en el servidor con AES-256.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Encryption warning */}
          {settings && !settings.encryptionConfigured && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Encriptacion no configurada</p>
                <p>El servidor no tiene configurada la variable ENCRYPTION_KEY. Las API keys no se pueden guardar de forma segura.</p>
              </div>
            </div>
          )}

          {/* Anthropic Key */}
          <div className="space-y-3 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Anthropic API Key</h4>
                <p className="text-sm text-muted-foreground">Para usar Claude (Anthropic)</p>
              </div>
              {settings?.hasAnthropicKey ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Configurada
                </Badge>
              ) : (
                <Badge variant="secondary">No configurada</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="font-mono"
                disabled={!settings?.encryptionConfigured}
              />
              <Button
                onClick={handleSaveAnthropicKey}
                disabled={updateMutation.isPending || !settings?.encryptionConfigured}
                variant="outline"
              >
                {anthropicKey ? 'Guardar' : 'Borrar'}
              </Button>
            </div>
          </div>

          {/* OpenAI Key */}
          <div className="space-y-3 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">OpenAI API Key</h4>
                <p className="text-sm text-muted-foreground">Para usar GPT-4 (OpenAI)</p>
              </div>
              {settings?.hasOpenaiKey ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Configurada
                </Badge>
              ) : (
                <Badge variant="secondary">No configurada</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="font-mono"
                disabled={!settings?.encryptionConfigured}
              />
              <Button
                onClick={handleSaveOpenaiKey}
                disabled={updateMutation.isPending || !settings?.encryptionConfigured}
                variant="outline"
              >
                {openaiKey ? 'Guardar' : 'Borrar'}
              </Button>
            </div>
          </div>

          {/* Google Key */}
          <div className="space-y-3 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Google API Key</h4>
                <p className="text-sm text-muted-foreground">Para usar Gemini (Google)</p>
              </div>
              {settings?.hasGoogleKey ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Configurada
                </Badge>
              ) : (
                <Badge variant="secondary">No configurada</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder="AIza..."
                className="font-mono"
                disabled={!settings?.encryptionConfigured}
              />
              <Button
                onClick={handleSaveGoogleKey}
                disabled={updateMutation.isPending || !settings?.encryptionConfigured}
                variant="outline"
              >
                {googleKey ? 'Guardar' : 'Borrar'}
              </Button>
            </div>
          </div>

          {/* Info about env vars */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">Alternativa: Variables de entorno</p>
            <p>Tambien puedes configurar las API keys en el servidor via variables de entorno:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 font-mono text-xs">
              <li>ANTHROPIC_API_KEY</li>
              <li>OPENAI_API_KEY</li>
              <li>GOOGLE_API_KEY</li>
            </ul>
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
