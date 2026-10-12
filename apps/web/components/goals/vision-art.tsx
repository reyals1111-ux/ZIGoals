'use client';
import {useEffect, useState} from 'react';
import type {Vision} from '../../lib/goal-extras/store';
import {getImage} from '../../lib/vision/store';
import {visionScope} from './use-goal-extras';

/** G3's generated gradients: nebula tones, drawn by CSS, never a photo of a person. */
export const GRADIENT_CSS: Record<string, string> = {
  aurora: 'linear-gradient(140deg, #0d4a5c 0%, #1f7a8c 30%, #4c3fa0 65%, #c05ad0 100%)',
  sunrise: 'linear-gradient(160deg, #2b1a4a 0%, #a8466f 45%, #f39a6b 80%, #ffd28a 100%)',
  ocean: 'linear-gradient(150deg, #04213f 0%, #0b5d8a 45%, #23a6c9 75%, #8fe6f4 100%)',
  nebula: 'radial-gradient(circle at 70% 30%, #f08bd6 0%, transparent 40%), linear-gradient(135deg, #12153a 0%, #3a2a7a 50%, #6a3fb5 100%)',
  forest: 'linear-gradient(150deg, #0b2a22 0%, #1e5b45 45%, #4f9d6b 75%, #b8e08a 100%)',
  ember: 'linear-gradient(150deg, #2a0f1f 0%, #7a2236 40%, #d1503f 75%, #ffb36b 100%)',
  dusk: 'linear-gradient(170deg, #0e1230 0%, #33296b 45%, #8a4fa3 75%, #f2a3c0 100%)',
  glacier: 'linear-gradient(150deg, #0d2238 0%, #2f5f8a 45%, #8fc3e6 80%, #eaf6ff 100%)',
};

/** Loads a kept photo as an object URL for as long as it is shown. */
export function useVisionImage(imageId: string | undefined) {
  const [url, setUrl] = useState<string | null>(null), [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!imageId) return;
    let active = true, made: string | null = null;
    getImage(visionScope(), imageId).then(image => {
      if (!active) return;
      if (!image) { setMissing(true); return; }
      made = URL.createObjectURL(image.blob);
      setUrl(made);
    }, () => { if (active) setMissing(true); });
    return () => { active = false; if (made) URL.revokeObjectURL(made); };
  }, [imageId]);
  return {url: imageId ? url : null, missing: imageId ? missing : false};
}

/** A goal's vision as a picture: the photo, or a gradient with an emoji; a calm default when none was chosen. */
export function VisionArt({vision, name, className = ''}: {vision?: Vision; name: string; className?: string}) {
  const photo = useVisionImage(vision?.kind === 'photo' ? vision.imageId : undefined);
  const gradient = vision && vision.kind !== 'photo' ? vision.gradient : undefined;
  const emoji = vision && vision.kind !== 'photo' ? vision.emoji : undefined;
  const background = photo.url ? undefined : GRADIENT_CSS[gradient ?? 'nebula'];
  return <div className={`vision-art ${className}`.trim()} style={background ? {background} : undefined} role="img" aria-label={vision?.kind === 'photo' ? (vision.alt || `Your photo for ${name}`) : `A ${gradient ?? 'nebula'} picture for ${name}`}>
    {/* A blob URL of a photo kept on this device: nothing for next/image to fetch or optimise. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo.url && <img src={photo.url} alt="" />}
    {vision?.kind === 'photo' && photo.missing && <span className="vision-missing">The photo is kept on another device</span>}
    {emoji && <span className="vision-emoji" aria-hidden="true">{emoji}</span>}
  </div>;
}
