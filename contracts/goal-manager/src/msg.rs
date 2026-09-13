use crate::state::Goal;
use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Uint128, Uint64};

#[cw_serde]
pub struct InstantiateMsg {
    pub admin: Option<String>,
    pub native_denom: String,
}

#[cw_serde]
pub enum ExecuteMsg {
    CreateGoal {
        metadata_commitment: Option<String>,
    },
    Deposit {
        goal_id: Uint64,
    },
    Withdraw {
        goal_id: Uint64,
        amount: Uint128,
    },
    CloseGoal {
        goal_id: Uint64,
    },
    UpdateMetadataCommitment {
        goal_id: Uint64,
        metadata_commitment: Option<String>,
    },
    PauseDeposits {},
    ResumeDeposits {},
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(crate::state::Config)]
    Config {},
    #[returns(Goal)]
    Goal { goal_id: Uint64 },
    #[returns(GoalsByOwnerResponse)]
    GoalsByOwner {
        owner: String,
        start_after: Option<Uint64>,
        limit: Option<u32>,
    },
    #[returns(GoalPositionResponse)]
    GoalPosition { goal_id: Uint64 },
    #[returns(cw2::ContractVersion)]
    ContractVersion {},
    #[returns(SolvencyResponse)]
    Solvency {},
}

#[cw_serde]
pub struct GoalsByOwnerResponse {
    pub goals: Vec<Goal>,
}

#[cw_serde]
pub struct GoalPositionResponse {
    pub goal_id: Uint64,
    pub base_denom: String,
    pub strategy_id: String,
    pub position_units: Uint128,
    pub withdrawable_amount: Uint128,
}

#[cw_serde]
pub struct SolvencyResponse {
    pub native_denom: String,
    pub bank_balance: Uint128,
    pub total_liabilities: Uint128,
    pub solvent: bool,
    pub surplus: Uint128,
}
