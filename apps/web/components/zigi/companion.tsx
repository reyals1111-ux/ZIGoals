'use client';
import {ZigiKnock} from './knock';

/**
 * ZIGi's companion (Session V Part 13): what runs beside the launcher only once the person switched it on. Today that is
 * the knock. The launcher shell loads this file when knocking is on, and never otherwise.
 */
export default function ZigiCompanion(props: {away: boolean; phone: boolean; side: 'right' | 'left'}) {
  return <ZigiKnock {...props}/>;
}
