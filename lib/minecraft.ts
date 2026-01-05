/**
 * Get Minecraft player headshot URL
 * Uses crafatar.com for Minecraft avatar renders
 * Requires Minecraft UUID, not username
 */
export function getMinecraftHeadshot(minecraftUuidOrUsername: string | null | undefined, size: number = 128): string {
  if (!minecraftUuidOrUsername) {
    // Default placeholder if no Minecraft UUID
    return `https://ui-avatars.com/api/?name=Player&size=${size}&background=0A0E27&color=00A8E8&bold=true`;
  }
  
  // Using mc-heads.net which handles CORS better than crafatar
  // If it looks like a UUID (has dashes), remove them
  const uuid = minecraftUuidOrUsername.replace(/-/g, '');
  
  // mc-heads.net provides better CORS support and fallback
  return `https://mc-heads.net/avatar/${uuid}/${size}`;
}

/**
 * Get full Minecraft skin render
 */
export function getMinecraftSkinRender(minecraftUuidOrUsername: string | null | undefined, size: number = 256): string {
  if (!minecraftUuidOrUsername) {
    return `https://ui-avatars.com/api/?name=Player&size=${size}&background=0A0E27&color=00A8E8&bold=true`;
  }
  
  // Remove dashes from UUID
  const uuid = minecraftUuidOrUsername.replace(/-/g, '');
  
  // mc-heads.net body render
  return `https://mc-heads.net/body/${uuid}/${size}`;
}
