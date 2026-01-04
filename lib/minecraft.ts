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
  
  // Using crafatar.com for Minecraft heads - requires UUID without dashes
  // If it looks like a UUID (has dashes), remove them
  const uuid = minecraftUuidOrUsername.replace(/-/g, '');
  
  // Size options: 8-512 pixels
  // Use default.png fallback for CORS issues
  return `https://crafatar.com/avatars/${uuid}?size=${size}&default=MHF_Steve&overlay`;
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
  
  // Full body render
  return `https://crafatar.com/renders/body/${uuid}?size=${size}&overlay`;
}
