import { useState, useEffect } from 'react';
import { getCurrentLocale } from '../../lib/i18n/language-manager';
import { translations } from '../../lib/i18n/translations';

export interface ApiConfig {
  provider: 'openai' | 'groq' | 'local' | 'none';
  apiKey: string;
  baseUrl?: string; // 用于自定义端点
  model?: string;   // 模型选择
}

interface ApiConfigProps {
  config: ApiConfig;
  onChange: (config: ApiConfig) => void;
  className?: string;
}

export function ApiConfigComponent({ config, onChange, className = '' }: ApiConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tempConfig, setTempConfig] = useState<ApiConfig>(config);
  
  const locale = getCurrentLocale();
  const t = translations[locale] || translations.en;

  const providers = [
    {
      id: 'none' as const,
      name: locale === 'zh' ? '不使用API（时间分段）' :
            locale === 'ja' ? 'APIを使用しない（時間セグメント）' :
            'No API (Time segments)',
      description: locale === 'zh' ? '生成时间分段占位符，需手动编辑' :
                  locale === 'ja' ? '時間セグメントのプレースホルダーを生成、手動編集が必要' :
                  'Generate time-based placeholders, manual editing required',
    },
    {
      id: 'groq' as const,
      name: 'Groq',
      description: locale === 'zh' ? '快速的Whisper API（需注册）' :
                  locale === 'ja' ? '高速Whisper API（登録が必要）' :
                  'Fast Whisper API (registration required)',
    },
    {
      id: 'openai' as const,
      name: 'OpenAI Whisper',
      description: locale === 'zh' ? '官方Whisper API' :
                  locale === 'ja' ? '公式Whisper API' :
                  'Official Whisper API',
    },
    {
      id: 'local' as const,
      name: locale === 'zh' ? '自定义端点' :
            locale === 'ja' ? 'カスタムエンドポイント' :
            'Custom Endpoint',
      description: locale === 'zh' ? '使用自己部署的Whisper服务' :
                  locale === 'ja' ? '自分でデプロイしたWhisperサービスを使用' :
                  'Use your own deployed Whisper service',
    },
  ];

  const models = {
    openai: ['whisper-1'],
    groq: ['whisper-large-v3', 'whisper-large-v3-turbo'],
    local: ['whisper-tiny', 'whisper-base', 'whisper-small', 'whisper-medium', 'whisper-large'],
    none: [],
  };

  const handleSave = () => {
    onChange(tempConfig);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setTempConfig(config);
    setIsExpanded(false);
  };

  return (
    <div className={`rounded-lg border border-neutral-dark/20 bg-primary ${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-light/30 transition-colors"
      >
        <div>
          <h3 className="text-lg font-semibold text-success-dark">
            {locale === 'zh' ? 'AI转录配置' :
             locale === 'ja' ? 'AI転写設定' :
             'AI Transcription Config'}
          </h3>
          <p className="text-sm text-neutral-dark/70 mt-1">
            {config.provider === 'none' 
              ? (locale === 'zh' ? '当前：时间分段模式' :
                 locale === 'ja' ? '現在：時間セグメントモード' :
                 'Current: Time segment mode')
              : `${locale === 'zh' ? '当前：' :
                   locale === 'ja' ? '現在：' :
                   'Current: '}${providers.find(p => p.id === config.provider)?.name || config.provider}`
            }
          </p>
        </div>
        <svg 
          className={`h-5 w-5 text-neutral-dark/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-neutral-dark/10 p-4 space-y-4">
          {/* 服务提供商选择 */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              {locale === 'zh' ? '选择服务提供商' :
               locale === 'ja' ? 'サービスプロバイダーを選択' :
               'Choose Service Provider'}
            </label>
            <div className="space-y-2">
              {providers.map((provider) => (
                <label key={provider.id} className="flex items-start gap-3 p-3 border border-neutral-dark/20 rounded-lg hover:bg-neutral-light/20 cursor-pointer">
                  <input
                    type="radio"
                    name="provider"
                    value={provider.id}
                    checked={tempConfig.provider === provider.id}
                    onChange={(e) => setTempConfig({
                      ...tempConfig,
                      provider: e.target.value as ApiConfig['provider'],
                      apiKey: e.target.value === 'none' ? '' : tempConfig.apiKey,
                      model: models[e.target.value as keyof typeof models][0],
                    })}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{provider.name}</span>
                    </div>
                    <p className="text-sm text-neutral-dark/70 mt-1">{provider.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* API密钥输入 */}
          {tempConfig.provider !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                {locale === 'zh' ? 'API密钥' :
                 locale === 'ja' ? 'APIキー' :
                 'API Key'}
              </label>
              <input
                type="password"
                value={tempConfig.apiKey}
                onChange={(e) => setTempConfig({ ...tempConfig, apiKey: e.target.value })}
                placeholder={
                  tempConfig.provider === 'groq' ? 'gsk_...' :
                  tempConfig.provider === 'openai' ? 'sk-...' :
                  'your-api-key'
                }
                className="w-full px-3 py-2 border border-neutral-dark/20 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {tempConfig.provider === 'groq' && (
                <p className="text-xs text-neutral-dark/60 mt-1">
                  {locale === 'zh' ? '在 ' :
                   locale === 'ja' ? '' :
                   'Get your free API key at '}
                  <a 
                    href="https://console.groq.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent-dark hover:underline"
                  >
                    console.groq.com
                  </a>
                  {locale === 'zh' ? ' 获取免费API密钥' :
                   locale === 'ja' ? 'で無料のAPIキーを取得' :
                   ''}
                </p>
              )}
              {tempConfig.provider === 'openai' && (
                <p className="text-xs text-neutral-dark/60 mt-1">
                  {locale === 'zh' ? '在 ' :
                   locale === 'ja' ? '' :
                   'Get your API key at '}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent-dark hover:underline"
                  >
                    platform.openai.com
                  </a>
                  {locale === 'zh' ? ' 获取API密钥' :
                   locale === 'ja' ? 'でAPIキーを取得' :
                   ''}
                </p>
              )}
            </div>
          )}

          {/* 自定义端点URL */}
          {tempConfig.provider === 'local' && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                {locale === 'zh' ? '服务端点URL' :
                 locale === 'ja' ? 'サービスエンドポイントURL' :
                 'Service Endpoint URL'}
              </label>
              <input
                type="url"
                value={tempConfig.baseUrl || ''}
                onChange={(e) => setTempConfig({ ...tempConfig, baseUrl: e.target.value })}
                placeholder="http://localhost:8000/v1/audio/transcriptions"
                className="w-full px-3 py-2 border border-neutral-dark/20 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              <p className="text-xs text-neutral-dark/60 mt-1">
                {locale === 'zh' ? '兼容OpenAI Whisper API格式的端点' :
                 locale === 'ja' ? 'OpenAI Whisper API形式と互換性のあるエンドポイント' :
                 'Endpoint compatible with OpenAI Whisper API format'}
              </p>
            </div>
          )}

          {/* 模型选择 */}
          {tempConfig.provider !== 'none' && models[tempConfig.provider].length > 1 && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                {locale === 'zh' ? '模型' :
                 locale === 'ja' ? 'モデル' :
                 'Model'}
              </label>
              <select
                value={tempConfig.model || ''}
                onChange={(e) => setTempConfig({ ...tempConfig, model: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-dark/20 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {models[tempConfig.provider].map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-lg bg-accent-dark px-4 py-2 text-sm font-medium text-primary transition hover:bg-accent"
            >
              {locale === 'zh' ? '保存配置' :
               locale === 'ja' ? '設定を保存' :
               'Save Config'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-neutral-dark/20 px-4 py-2 text-sm font-medium text-neutral-dark transition hover:bg-neutral-light/30"
            >
              {locale === 'zh' ? '取消' :
               locale === 'ja' ? 'キャンセル' :
               'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 本地存储管理
const STORAGE_KEY = 'audio-transcription-api-config';

export function saveApiConfig(config: ApiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save API config:', error);
  }
}

export function loadApiConfig(): ApiConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load API config:', error);
  }
  
  // 默认配置
  return {
    provider: 'none',
    apiKey: '',
  };
}
