/**
 * Discord Webhook Integration
 * Sends formatted embeds to Discord webhooks
 */

const WEBHOOK_URLS: Record<string, string> = {
  'MBA News': 'https://discord.com/api/webhooks/1462291384949014591/itFQCgf85bns2AeyCzLcTddC-6x9PIq1CivCwVoR2-hCBO5W-nzMvp9OAZDeSeJasVtG',
  'MBA App': 'https://discord.com/api/webhooks/1462292840028569601/Llst8bQ655NOApaVoDnGAUkMKc2FCuMWK1vzyOeeH4XUUTC4FQD2ngJ0_KDzhLdUQ6OQ',
  'Naz Takes': 'https://discord.com/api/webhooks/1462293061077045302/WF_7clcdBzXzsq7mRVqCMG178QEsIfZVemR3FWXlTUdT-eIRQUZM1p4NgIhNFghl8R5I',
};

interface ArticleWebhookData {
  title: string;
  content: string;
  author: string;
  publishedDate: string;
  image?: string;
  articleUrl: string;
  webhookChannel?: string;
}

/**
 * Sends a new article notification to Discord as a rich embed
 */
export async function sendArticleToDiscord(article: ArticleWebhookData) {
  try {
    // Get the webhook URL based on the selected channel
    const webhookChannel = article.webhookChannel || 'MBA News';
    const webhookUrl = WEBHOOK_URLS[webhookChannel];

    if (!webhookUrl) {
      console.error('Invalid webhook channel:', webhookChannel);
      return { success: false, error: 'Invalid webhook channel' };
    }
    // Create a clean excerpt from content (remove HTML if present)
    const cleanContent = article.content.replace(/<[^>]*>/g, '');
    const excerpt = cleanContent.length > 300 
      ? cleanContent.substring(0, 300) + '...' 
      : cleanContent;

    // Format the published date
    const publishedDate = new Date(article.publishedDate);
    const formattedDate = publishedDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Discord embed payload
    const payload = {
      username: 'MBA News',
      avatar_url: 'https://minecraftbasketball.com/logo.png',
      embeds: [
        {
          title: `📰 ${article.title}`,
          description: excerpt,
          url: article.articleUrl,
          color: 0xE31E24, // MBA red color
          author: {
            name: article.author,
            icon_url: 'https://minecraftbasketball.com/logo.png',
          },
          thumbnail: {
            url: 'https://minecraftbasketball.com/logo.png',
          },
          image: article.image ? {
            url: article.image,
          } : undefined,
          footer: {
            text: 'Minecraft Basketball Association',
            icon_url: 'https://minecraftbasketball.com/logo.png',
          },
          timestamp: publishedDate.toISOString(),
          fields: [
            {
              name: '📅 Published',
              value: formattedDate,
              inline: true,
            },
            {
              name: '✍️ Author',
              value: article.author,
              inline: true,
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', errorText);
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    console.log('Article posted to Discord successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to send article to Discord:', error);
    // Don't throw - we don't want to fail the article creation if Discord fails
    return { success: false, error };
  }
}
