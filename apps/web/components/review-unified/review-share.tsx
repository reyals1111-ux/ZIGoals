'use client';
import {useState} from 'react';
import type {LifeReview} from '../../lib/life-review/engine';
import {weekReviewCard} from '../../lib/share-cards/kinds';
import {isShowcase} from '../../lib/showcase-storage';
import ShareCardSheet from '../share-cards/share-card-sheet';

/** Session AK Part 8.5: the unified review's "Share as an image", through the one share-card system (loaded on the tap). */
export default function ReviewShare({review, range, onClose}: {review: LifeReview; range: string; onClose: () => void}) {
  const [example] = useState(() => isShowcase());
  return <ShareCardSheet heading={review.window.period === 'month' ? 'Share your month' : 'Share your week'} build={o => weekReviewCard(review, range, {...o, example})} onClose={onClose} />;
}
