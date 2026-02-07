import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isLocalhostUrl, extractPort } from '@/lib/url-utils';

interface LocalhostWarningProps {
  targetUrl: string;
  onReplace: (newUrl: string) => void;
}

export function LocalhostWarning({ targetUrl, onReplace }: LocalhostWarningProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'cloudflared' | 'ngrok'>('cloudflared');
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [copiedCommand, setCopiedCommand] = useState(false);

  if (!isLocalhostUrl(targetUrl)) return null;

  const port = extractPort(targetUrl) || '3000';

  const commands = {
    cloudflared: t('localhost.cloudflaredCommand', { port }),
    ngrok: t('localhost.ngrokCommand', { port }),
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(commands[activeTab]);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handleUseUrl = () => {
    if (tunnelUrl.trim()) {
      onReplace(tunnelUrl.trim());
      setTunnelUrl('');
    }
  };

  return (
    <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-yellow-800 dark:text-yellow-400 text-sm">
            {t('localhost.detected')}
          </p>
          <p className="text-yellow-700 dark:text-yellow-500/80 text-sm mt-1">
            {t('localhost.explanation')}
          </p>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('cloudflared')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'cloudflared'
              ? 'bg-white dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 shadow-sm'
              : 'text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200'
          }`}
        >
          cloudflared
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ngrok')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'ngrok'
              ? 'bg-white dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 shadow-sm'
              : 'text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200'
          }`}
        >
          ngrok
        </button>
      </div>

      {/* Command display */}
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200 px-3 py-2 rounded-md text-xs font-mono">
          {commands[activeTab]}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="shrink-0 border-yellow-400 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
        >
          {copiedCommand ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              {t('localhost.copied')}
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              {t('localhost.copy')}
            </>
          )}
        </Button>
      </div>

      {/* Tunnel URL input */}
      <div className="flex items-center gap-2">
        <input
          type="url"
          placeholder={t('localhost.pasteUrl')}
          value={tunnelUrl}
          onChange={(e) => setTunnelUrl(e.target.value)}
          className="flex-1 px-3 py-2 rounded-md border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-yellow-950/40 text-sm"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleUseUrl}
          disabled={!tunnelUrl.trim()}
          className="shrink-0"
        >
          {t('localhost.useThisUrl')}
        </Button>
      </div>
    </div>
  );
}
