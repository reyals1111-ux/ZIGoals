use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Timestamp, Uint128, Uint64};
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct Config {
    pub admin: Option<Addr>,
    pub native_denom: String,
    pub deposits_paused: bool,
}

#[cw_serde]
pub enum GoalStatus {
    Active,
    Closed,
}

#[cw_serde]
pub struct Goal {
    pub id: Uint64,
    pub owner: Addr,
    pub created_at: Timestamp,
    pub base_denom: String,
    pub strategy_id: String,
    pub total_deposited: Uint128,
    pub total_withdrawn: Uint128,
    pub position_units: Uint128,
    pub status: GoalStatus,
    pub metadata_commitment: Option<String>,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const NEXT_ID: Item<u64> = Item::new("next_id");
pub const GOALS: Map<u64, Goal> = Map::new("goals");
pub const OWNER_GOALS: Map<(&Addr, u64), ()> = Map::new("owner_goals");
pub const TOTAL_LIABILITIES: Item<Uint128> = Item::new("total_liabilities");
