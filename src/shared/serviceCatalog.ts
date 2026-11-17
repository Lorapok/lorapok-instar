import type { ServiceDefinition } from './types'

export const BUILTIN_SERVICES: ServiceDefinition[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Web',
    url: 'https://web.whatsapp.com',
    icon: 'whatsapp',
    category: 'chat',
    recommendedCss: `
      /* Lorapok Instar sensory tuning for WhatsApp */
      ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
      ::-webkit-scrollbar-thumb { background: rgba(233, 84, 32, 0.3) !important; border-radius: 9999px !important; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(233, 84, 32, 0.6) !important; }
    `
  },
  {
    id: 'telegram',
    name: 'Telegram Web',
    url: 'https://web.telegram.org/a/',
    icon: 'telegram',
    category: 'chat',
    recommendedCss: `
      /* Lorapok Instar smooth scroll for Telegram */
      ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
      ::-webkit-scrollbar-thumb { background: rgba(34, 158, 217, 0.3) !important; border-radius: 9999px !important; }
    `
  },
  {
    id: 'discord',
    name: 'Discord',
    url: 'https://discord.com/app',
    icon: 'discord',
    category: 'chat',
    recommendedCss: `
      /* Clean Discord scrollbars */
      ::-webkit-scrollbar { width: 6px !important; }
      ::-webkit-scrollbar-thumb { background: rgba(88, 101, 242, 0.4) !important; border-radius: 9999px !important; }
    `
  },
  {
    id: 'slack',
    name: 'Slack',
    url: 'https://app.slack.com/client',
    icon: 'slack',
    category: 'collaboration',
    recommendedCss: `
      ::-webkit-scrollbar { width: 6px !important; }
      ::-webkit-scrollbar-thumb { background: rgba(74, 21, 75, 0.4) !important; border-radius: 9999px !important; }
    `
  },
  {
    id: 'messenger',
    name: 'Messenger',
    url: 'https://www.messenger.com',
    icon: 'messenger',
    category: 'chat',
    recommendedCss: `
      ::-webkit-scrollbar { width: 6px !important; }
      ::-webkit-scrollbar-thumb { background: rgba(0, 132, 255, 0.3) !important; border-radius: 9999px !important; }
    `
  },
  {
    id: 'instagram',
    name: 'Instagram Direct',
    url: 'https://www.instagram.com/direct/inbox/',
    icon: 'instagram',
    category: 'social',
    recommendedCss: `
      ::-webkit-scrollbar { width: 6px !important; }
    `
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    url: 'https://x.com/messages',
    icon: 'x',
    category: 'social',
    recommendedCss: `
      ::-webkit-scrollbar { width: 6px !important; }
    `
  },
  {
    id: 'facebook',
    name: 'Facebook',
    url: 'https://www.facebook.com',
    icon: 'facebook',
    category: 'social'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Messaging',
    url: 'https://www.linkedin.com/messaging/',
    icon: 'linkedin',
    category: 'collaboration'
  },
  {
    id: 'custom',
    name: 'Custom Web App',
    url: 'https://',
    icon: 'custom',
    category: 'custom'
  }
]
