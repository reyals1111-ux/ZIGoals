'use client';
import {useEffect, useId, useState} from 'react';
import {photoDestination, photoSendLine, type PhotoTarget} from '../../lib/ai/photo-consent';
import {readPrivacyMode} from '../../lib/nova/setup';
import {getAppStorage} from '../../lib/showcase-storage';
import './photo-send-confirm.css';

/**
 * Session AK security reviews Z1A-1 and Z1B-10 (lane ZF): a lab-sheet or receipt photo is shown with where it goes before
 * anything is sent; nothing leaves until the person presses Send. When the privacy mode would refuse it (Strict and a
 * cloud model; Guarded and a cloud model, which never gets a photo), the reason shows instead of Send.
 */
export function PhotoSendConfirm({file, what, target, onSend, onCancel}: {file: File; what: 'lab sheet' | 'receipt'; target: PhotoTarget; onSend: () => void; onCancel: () => void}) {
  const id = useId(), [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let made: string | null = null; try { made = URL.createObjectURL(file); setUrl(made); } catch { setUrl(null); } return () => { if (made) URL.revokeObjectURL(made); }; }, [file]);
  let mode: ReturnType<typeof readPrivacyMode> = null; try { mode = readPrivacyMode(getAppStorage()); } catch { mode = 'strict'; }
  const destination = photoDestination(target, mode);
  return <div className="photo-send-confirm" role="group" aria-labelledby={`${id}-line`}>
    {/* A local blob of the person's own photo, never fetched: next/image has nothing to optimise. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {url && <img src={url} alt={`The ${what} photo you chose`}/>}
    {destination.refusal ? <p id={`${id}-line`} role="alert">{destination.refusal}</p> : <p id={`${id}-line`}>{photoSendLine(what, destination)}</p>}
    <div className="actions">
      {!destination.refusal && <button type="button" className="secondary" onClick={onSend}>Send to {destination.name}</button>}
      <button type="button" className="quiet" onClick={onCancel}>{destination.refusal ? 'OK' : 'Cancel'}</button>
    </div>
  </div>;
}
