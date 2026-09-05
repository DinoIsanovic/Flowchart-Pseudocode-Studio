/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Smartphone, Check, Copy, X, Terminal, Globe, Layers, Download } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface AndroidBuildModalProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidBuildModal: React.FC<AndroidBuildModalProps> = ({
  language,
  isOpen,
  onClose,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'pwa' | 'twa' | 'capacitor'>('pwa');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const bubblewrapCommands = `# 1. Install Google Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Initialize Android Project using this PWA manifest
bubblewrap init --manifest=https://your-app-url/manifest.webmanifest

# 3. Build signed APK or Google Play AAB
bubblewrap build`;

  const capacitorCommands = `# 1. Install Capacitor dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor project
npx cap init "FlowchartStudio" "com.flowchart.app" --web-dir dist

# 3. Build Web App & Add Android Platform
npm run build
npx cap add android

# 4. Open in Android Studio to build APK / AAB
npx cap open android`;

  const capacitorConfig = `{
  "appId": "com.flowchart.app",
  "appName": "Flowchart & Pseudocode Studio",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https"
  },
  "android": {
    "allowMixedContent": true
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#0A0A0A] text-[#F5F5F5] w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#121212] text-white p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base leading-tight uppercase tracking-wider text-white">
                {t.androidModalTitle}
              </h2>
              <p className="text-[11px] text-white/50 leading-snug font-mono">
                {t.androidSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#0E0E0E] text-xs font-black uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'pwa'
                ? 'border-white text-white bg-[#141414]'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-4 h-4 text-[#06B6D4]" />
            <span>PWA / Instant Install</span>
          </button>
          <button
            onClick={() => setActiveTab('twa')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'twa'
                ? 'border-white text-white bg-[#141414]'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className="w-4 h-4 text-[#06B6D4]" />
            <span>Google TWA (Play Store)</span>
          </button>
          <button
            onClick={() => setActiveTab('capacitor')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'capacitor'
                ? 'border-white text-white bg-[#141414]'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4 text-[#06B6D4]" />
            <span>Capacitor / Android Studio</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-white/70 leading-relaxed bg-[#0A0A0A]">
          {activeTab === 'pwa' && (
            <div className="space-y-3">
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-black font-black flex items-center justify-center shrink-0 mt-0.5 text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-black text-white text-xs uppercase tracking-wider">
                    {t.androidPwaTitle}
                  </h4>
                  <p className="text-emerald-300 text-[11px] mt-0.5">
                    {t.androidPwaDesc}
                  </p>
                </div>
              </div>

              <div className="bg-[#141414] rounded-xl p-4 border border-white/10 space-y-2.5">
                <h5 className="font-black uppercase tracking-wider text-white text-xs">
                  {language === 'en'
                    ? 'How to install on Android phone or tablet:'
                    : language === 'de'
                    ? 'So installierst du die App auf Android:'
                    : 'Kako instalirati na Android uređaj:'}
                </h5>
                <ol className="list-decimal pl-5 space-y-1.5 text-[11.5px] text-white/80">
                  <li>{t.androidPwaStep1}</li>
                  <li>{t.androidPwaStep2}</li>
                  <li>
                    {language === 'en'
                      ? 'The app will launch in dedicated standalone fullscreen mode with touch gesture support, offline canvas caching, and no URL bar.'
                      : language === 'de'
                      ? 'Die App startet im echten Vollbildmodus ohne Browserleiste mit Offline-Unterstützung und optimierten Touch-Gesten.'
                      : 'Aplikacija se pokreće preko cijelog ekrana bez adrasne trake preglednika, uz brze dodirne geste i rad bez interneta.'}
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-[#121212] border border-white/10 rounded-xl text-[11px] text-white/60 font-mono">
                <strong className="text-white">💡 Android Features Included:</strong> Mobile viewport scaling, responsive side drawer, pinch-to-zoom SVG canvas, 48px touch targets, local state storage in IndexedDB/LocalStorage, and offline service worker precaching.
              </div>
            </div>
          )}

          {activeTab === 'twa' && (
            <div className="space-y-3">
              <p className="text-[11.5px] text-white/70">
                {t.androidTwaDesc}
              </p>

              <div className="relative bg-[#050505] text-[#F5F5F5] rounded-xl p-3 font-mono text-[11px] leading-relaxed border border-white/15">
                <button
                  onClick={() => copyToClipboard(bubblewrapCommands, 'twa')}
                  className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors border border-white/10"
                >
                  {copiedId === 'twa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'twa' ? t.copied : t.androidCopyCmd}</span>
                </button>
                <pre className="overflow-x-auto whitespace-pre">{bubblewrapCommands}</pre>
              </div>

              <div className="bg-[#0c1e28] border border-[#06B6D4]/30 rounded-xl p-3 text-[11px] text-[#A5F3FC]">
                <strong className="text-white uppercase tracking-wider">Play Store Ready:</strong> Bubblewrap automatically generates the Digital Asset Links (assetlinks.json), creates the Android keystore, and outputs an APK / AAB ready for Google Play Console.
              </div>
            </div>
          )}

          {activeTab === 'capacitor' && (
            <div className="space-y-3">
              <p className="text-[11.5px] text-white/70">
                {t.androidCapacitorDesc}
              </p>

              <div className="relative bg-[#050505] text-[#F5F5F5] rounded-xl p-3 font-mono text-[11px] leading-relaxed border border-white/15">
                <button
                  onClick={() => copyToClipboard(capacitorCommands, 'cap-cmd')}
                  className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors border border-white/10"
                >
                  {copiedId === 'cap-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'cap-cmd' ? t.copied : t.androidCopyCmd}</span>
                </button>
                <pre className="overflow-x-auto whitespace-pre">{capacitorCommands}</pre>
              </div>

              <div>
                <span className="font-mono font-bold text-white text-xs block mb-1 uppercase tracking-wider">
                  capacitor.config.json:
                </span>
                <div className="relative bg-[#050505] text-[#F5F5F5] rounded-xl p-3 font-mono text-[11px] leading-relaxed border border-white/15">
                  <button
                    onClick={() => copyToClipboard(capacitorConfig, 'cap-cfg')}
                    className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors border border-white/10"
                  >
                    {copiedId === 'cap-cfg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'cap-cfg' ? t.copied : t.androidCopyCmd}</span>
                  </button>
                  <pre className="overflow-x-auto whitespace-pre">{capacitorConfig}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#121212] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-wider text-xs rounded-lg transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
