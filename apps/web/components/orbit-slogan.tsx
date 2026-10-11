'use client';
import {useEntrance} from './use-entrance';
import './motion.css';
export function OrbitSlogan(){const ref=useEntrance<HTMLSpanElement>('primary-slogan');return <span ref={ref} className="slogan-entrance"><span className="slogan-line"><span>Today&apos;s Goals, </span><span className="slogan-gradient">Habits &amp; Health</span></span><span className="slogan-line"><span> = Tomorrow&apos;s </span><span className="slogan-gradient">Wealth</span></span></span>;}
