'use client';
import {useState} from 'react';
import {ActivityFeed} from '../../activity-feed';
import './panels.css';

/**
 * NOVA's Activity (Session AK, owner follow-up 2 N2): every change NOVA and ZIGi made from a card the person confirmed — the
 * one actions log (`zigoals:ai-actions:v1`, "Actions by ZIGi") shown through Activity's own feed, with its Remove and Undo
 * for logs, and the link to where each record lives. A card's own Undo stays on the card (chat or workflow) while it shows.
 */
export default function ActivityPanel() {
  const [limit, setLimit] = useState(20);
  return <div className="nova-activity">
    <p className="ai-note">Each line is a card you confirmed in NOVA or ZIGi. Remove a log here (with Undo), open the record to change it, or use Undo on the card while it shows.</p>
    <ActivityFeed category="ZIGI" limit={limit} onMore={() => setLimit(n => n + 20)}/>
  </div>;
}
