import { ExternalLink, MessageCircle, Globe, ShoppingBag } from 'lucide-react';

const links = [
  {
    title: 'Discord Server',
    description: 'Join our Discord community',
    url: 'https://discord.gg/C3pETBx98T',
    icon: MessageCircle,
    color: 'bg-gradient-to-r from-mba-blue to-mba-red hover:from-blue-700 hover:to-red-700',
  },
  {
    title: 'Store',
    description: 'Get exclusive MBA merchandise',
    url: 'https://minecraftbasketball.tebex.io/',
    icon: ShoppingBag,
    color: 'bg-gradient-to-r from-mba-blue to-mba-red hover:from-blue-700 hover:to-red-700',
  },
  {
    title: 'Website',
    description: 'You are here!',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://www.minecraftbasketball.com',
    icon: Globe,
    color: 'bg-gradient-to-r from-mba-blue to-mba-red hover:from-blue-700 hover:to-red-700',
  },
];

export default function LinksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">Important Links</h1>
        <p className="text-gray-600 dark:text-gray-400">Connect with the Minecraft Basketball Association across platforms</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {links.map((link) => {
          const Icon = link.icon;
          
          return (
            <a
              key={link.title}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${link.color} rounded-lg p-6 transition-all transform hover:scale-105 flex items-center space-x-4 group`}
            >
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">{link.title}</h2>
                <p className="text-gray-100 text-sm">{link.description}</p>
              </div>
              <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        })}
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Stay Connected</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Follow us on all platforms to stay updated with the latest news, scores, and events from the Minecraft Basketball Association!
        </p>
      </div>
    </div>
  );
}

