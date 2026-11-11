'use client';
import {CardNotice, type CardProps} from '../cards/kit';

/** Session AM (ADR-038): placeholder body until this widget is built (never shipped: the session replaces every one). */
export default function SunWidget(_: Partial<CardProps>) {
  return <CardNotice kind="empty" title="Being built">This widget is being built in this session.</CardNotice>;
}
