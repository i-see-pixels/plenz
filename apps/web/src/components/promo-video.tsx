import { HeroVideoDialog } from "@plenz/ui/components/hero-video-dialog";

export default function PromoVideo() {
  const videoUrl =
    "https://utxifjblgzbxujxp.public.blob.vercel-storage.com/assets-plenz/plenz-final.mp4";

  const thumbnailUrl =
    "https://utxifjblgzbxujxp.public.blob.vercel-storage.com/assets-plenz/plenz-thumb.png";

  return (
    <HeroVideoDialog
      className="block"
      animationStyle="from-center"
      videoSrc={videoUrl}
      thumbnailSrc={thumbnailUrl}
      thumbnailAlt="Hero Video"
    />
  );
}
