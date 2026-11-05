'use client';
import {ValidatorsSection} from '../earn/validators-section';
import {useEarnLive, useMinuteClock} from '../earn/use-earn-live';

/** The Staking page's validator list (components/staking/staking-validators.tsx), its own chunk: loaded at the fold's first open. */
export default function StakingValidatorsLive() {
  const validators = useEarnLive('validators'), now = useMinuteClock();
  return <ValidatorsSection validators={validators} now={now}/>;
}
