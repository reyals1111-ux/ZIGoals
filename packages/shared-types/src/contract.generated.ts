/* Generated from Rust CosmWasm schemas. Run contracts/goal-manager/scripts/generate-types.mjs; do not edit. */

export type ContractTypes =
  | InstantiateMsg
  | ExecuteMsg
  | QueryMsg
  | Config
  | ContractVersion
  | Goal
  | GoalPositionResponse
  | GoalsByOwnerResponse
  | SolvencyResponse;
export type ExecuteMsg =
  | {
      create_goal: {
        metadata_commitment?: string | null;
      };
    }
  | {
      deposit: {
        goal_id: Uint64;
      };
    }
  | {
      withdraw: {
        amount: Uint128;
        goal_id: Uint64;
      };
    }
  | {
      close_goal: {
        goal_id: Uint64;
      };
    }
  | {
      update_metadata_commitment: {
        goal_id: Uint64;
        metadata_commitment?: string | null;
      };
    }
  | {
      pause_deposits: {};
    }
  | {
      resume_deposits: {};
    };
/**
 * A thin wrapper around u64 that is using strings for JSON encoding/decoding, such that the full u64 range can be used for clients that convert JSON numbers to floats, like JavaScript and jq.
 *
 * # Examples
 *
 * Use `from` to create instances of this and `u64` to get the value out:
 *
 * ``` # use cosmwasm_std::Uint64; let a = Uint64::from(42u64); assert_eq!(a.u64(), 42);
 *
 * let b = Uint64::from(70u32); assert_eq!(b.u64(), 70); ```
 */
export type Uint64 = string;
/**
 * A thin wrapper around u128 that is using strings for JSON encoding/decoding, such that the full u128 range can be used for clients that convert JSON numbers to floats, like JavaScript and jq.
 *
 * # Examples
 *
 * Use `from` to create instances of this and `u128` to get the value out:
 *
 * ``` # use cosmwasm_std::Uint128; let a = Uint128::from(123u128); assert_eq!(a.u128(), 123);
 *
 * let b = Uint128::from(42u64); assert_eq!(b.u128(), 42);
 *
 * let c = Uint128::from(70u32); assert_eq!(c.u128(), 70); ```
 */
export type Uint128 = string;
export type QueryMsg =
  | {
      config: {};
    }
  | {
      goal: {
        goal_id: Uint64;
      };
    }
  | {
      goals_by_owner: {
        limit?: number | null;
        owner: string;
        start_after?: Uint64 | null;
      };
    }
  | {
      goal_position: {
        goal_id: Uint64;
      };
    }
  | {
      contract_version: {};
    }
  | {
      solvency: {};
    };
/**
 * A human readable address.
 *
 * In Cosmos, this is typically bech32 encoded. But for multi-chain smart contracts no assumptions should be made other than being UTF-8 encoded and of reasonable length.
 *
 * This type represents a validated address. It can be created in the following ways 1. Use `Addr::unchecked(input)` 2. Use `let checked: Addr = deps.api.addr_validate(input)?` 3. Use `let checked: Addr = deps.api.addr_humanize(canonical_addr)?` 4. Deserialize from JSON. This must only be done from JSON that was validated before such as a contract's state. `Addr` must not be used in messages sent by the user because this would result in unvalidated instances.
 *
 * This type is immutable. If you really need to mutate it (Really? Are you sure?), create a mutable copy using `let mut mutable = Addr::to_string()` and operate on that `String` instance.
 */
export type Addr = string;
/**
 * A point in time in nanosecond precision.
 *
 * This type can represent times from 1970-01-01T00:00:00Z to 2554-07-21T23:34:33Z.
 *
 * ## Examples
 *
 * ``` # use cosmwasm_std::Timestamp; let ts = Timestamp::from_nanos(1_000_000_202); assert_eq!(ts.nanos(), 1_000_000_202); assert_eq!(ts.seconds(), 1); assert_eq!(ts.subsec_nanos(), 202);
 *
 * let ts = ts.plus_seconds(2); assert_eq!(ts.nanos(), 3_000_000_202); assert_eq!(ts.seconds(), 3); assert_eq!(ts.subsec_nanos(), 202); ```
 */
export type Timestamp = Uint64;
export type GoalStatus = "active" | "closed";

export interface InstantiateMsg {
  admin?: string | null;
  native_denom: string;
}
export interface Config {
  admin?: Addr | null;
  deposits_paused: boolean;
  native_denom: string;
}
export interface ContractVersion {
  /**
   * contract is the crate name of the implementing contract, eg. `crate:cw20-base` we will use other prefixes for other languages, and their standard global namespacing
   */
  contract: string;
  /**
   * version is any string that this implementation knows. It may be simple counter "1", "2". or semantic version on release tags "v0.7.0", or some custom feature flag list. the only code that needs to understand the version parsing is code that knows how to migrate from the given contract (and is tied to it's implementation somehow)
   */
  version: string;
}
export interface Goal {
  base_denom: string;
  created_at: Timestamp;
  id: Uint64;
  metadata_commitment?: string | null;
  owner: Addr;
  position_units: Uint128;
  status: GoalStatus;
  strategy_id: string;
  total_deposited: Uint128;
  total_withdrawn: Uint128;
}
export interface GoalPositionResponse {
  base_denom: string;
  goal_id: Uint64;
  position_units: Uint128;
  strategy_id: string;
  withdrawable_amount: Uint128;
}
export interface GoalsByOwnerResponse {
  goals: Goal[];
}
export interface SolvencyResponse {
  bank_balance: Uint128;
  native_denom: string;
  solvent: boolean;
  surplus: Uint128;
  total_liabilities: Uint128;
}
