use crate::{
    error::ContractError,
    msg::{
        ExecuteMsg, GoalPositionResponse, GoalsByOwnerResponse, InstantiateMsg, QueryMsg,
        SolvencyResponse,
    },
    state::{Config, Goal, GoalStatus, CONFIG, GOALS, NEXT_ID, OWNER_GOALS, TOTAL_LIABILITIES},
};
use cosmwasm_std::{
    entry_point, to_json_binary, Addr, BankMsg, Binary, Coin, Deps, DepsMut, Env, MessageInfo,
    Order, Response, StdResult, Uint128,
};
use cw_storage_plus::Bound;

const CONTRACT_NAME: &str = "crates.io:zigoals-goal-manager";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

fn nonpayable(info: &MessageInfo) -> Result<(), ContractError> {
    if !info.funds.is_empty() {
        return Err(ContractError::Nonpayable {});
    }
    Ok(())
}

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    nonpayable(&info)?;
    let d = msg.native_denom.as_bytes();
    if !(3..=128).contains(&d.len())
        || !d[0].is_ascii_alphabetic()
        || !d
            .iter()
            .all(|c| c.is_ascii_alphanumeric() || b"/:._-".contains(c))
    {
        return Err(ContractError::InvalidDenom {});
    }
    let admin = msg
        .admin
        .map(|value| deps.api.addr_validate(&value))
        .transpose()?;
    CONFIG.save(
        deps.storage,
        &Config {
            admin,
            native_denom: msg.native_denom,
            deposits_paused: false,
        },
    )?;
    NEXT_ID.save(deps.storage, &1)?;
    TOTAL_LIABILITIES.save(deps.storage, &Uint128::zero())?;
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("action", "instantiate"))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::CreateGoal {
            metadata_commitment,
        } => {
            nonpayable(&info)?;
            let metadata_commitment = validate_commitment(metadata_commitment)?;
            let id = NEXT_ID.load(deps.storage)?;
            let next = id.checked_add(1).ok_or(ContractError::IdExhausted {})?;
            let config = CONFIG.load(deps.storage)?;
            let goal = Goal {
                id: id.into(),
                owner: info.sender,
                created_at: env.block.time,
                base_denom: config.native_denom,
                strategy_id: "idle".into(),
                total_deposited: Uint128::zero(),
                total_withdrawn: Uint128::zero(),
                position_units: Uint128::zero(),
                status: GoalStatus::Active,
                metadata_commitment,
            };
            GOALS.save(deps.storage, id, &goal)?;
            OWNER_GOALS.save(deps.storage, (&goal.owner, id), &())?;
            NEXT_ID.save(deps.storage, &next)?;
            Ok(goal_event("goal_created", &goal))
        }
        ExecuteMsg::Deposit { goal_id } => {
            let mut goal = owned_active_goal(deps.as_ref(), goal_id.u64(), &info.sender)?;
            let config = CONFIG.load(deps.storage)?;
            if config.deposits_paused {
                return Err(ContractError::DepositsPaused {});
            }
            if info.funds.len() != 1
                || info.funds[0].denom != config.native_denom
                || info.funds[0].amount.is_zero()
            {
                return Err(ContractError::InvalidDeposit {});
            }
            let amount = info.funds[0].amount;
            goal.total_deposited = goal.total_deposited.checked_add(amount)?;
            goal.position_units = goal.position_units.checked_add(amount)?;
            let liabilities = TOTAL_LIABILITIES.load(deps.storage)?.checked_add(amount)?;
            GOALS.save(deps.storage, goal_id.u64(), &goal)?;
            TOTAL_LIABILITIES.save(deps.storage, &liabilities)?;
            Ok(goal_event("deposit", &goal).add_attribute("amount", amount))
        }
        ExecuteMsg::Withdraw { goal_id, amount } => {
            nonpayable(&info)?;
            let mut goal = owned_active_goal(deps.as_ref(), goal_id.u64(), &info.sender)?;
            if amount.is_zero() || amount > goal.position_units {
                return Err(ContractError::InvalidWithdrawal {});
            }
            goal.position_units = goal.position_units.checked_sub(amount)?;
            goal.total_withdrawn = goal.total_withdrawn.checked_add(amount)?;
            let liabilities = TOTAL_LIABILITIES.load(deps.storage)?.checked_sub(amount)?;
            GOALS.save(deps.storage, goal_id.u64(), &goal)?;
            TOTAL_LIABILITIES.save(deps.storage, &liabilities)?;
            Ok(goal_event("withdraw", &goal)
                .add_attribute("amount", amount)
                .add_message(BankMsg::Send {
                    to_address: goal.owner.to_string(),
                    amount: vec![Coin {
                        denom: goal.base_denom,
                        amount,
                    }],
                }))
        }
        ExecuteMsg::PauseDeposits {} => set_pause(deps, info, true),
        ExecuteMsg::ResumeDeposits {} => set_pause(deps, info, false),
        ExecuteMsg::CloseGoal { goal_id } => {
            nonpayable(&info)?;
            let mut goal = owned_active_goal(deps.as_ref(), goal_id.u64(), &info.sender)?;
            if !goal.position_units.is_zero() {
                return Err(ContractError::GoalNotEmpty {});
            }
            goal.status = GoalStatus::Closed;
            GOALS.save(deps.storage, goal_id.u64(), &goal)?;
            Ok(goal_event("goal_closed", &goal))
        }
        ExecuteMsg::UpdateMetadataCommitment {
            goal_id,
            metadata_commitment,
        } => {
            nonpayable(&info)?;
            let mut goal = owned_active_goal(deps.as_ref(), goal_id.u64(), &info.sender)?;
            goal.metadata_commitment = validate_commitment(metadata_commitment)?;
            GOALS.save(deps.storage, goal_id.u64(), &goal)?;
            Ok(goal_event("metadata_updated", &goal))
        }
    }
}

fn validate_commitment(value: Option<String>) -> Result<Option<String>, ContractError> {
    value
        .map(|hash| {
            if hash.len() != 64 || !hash.bytes().all(|b| b.is_ascii_hexdigit()) {
                return Err(ContractError::InvalidCommitment {});
            }
            Ok(hash.to_ascii_lowercase())
        })
        .transpose()
}

fn owned_active_goal(deps: Deps, id: u64, owner: &Addr) -> Result<Goal, ContractError> {
    let goal = GOALS
        .may_load(deps.storage, id)?
        .ok_or(ContractError::GoalNotFound {})?;
    if goal.owner != owner {
        return Err(ContractError::Unauthorized {});
    }
    if goal.status != GoalStatus::Active {
        return Err(ContractError::GoalClosed {});
    }
    Ok(goal)
}

fn set_pause(deps: DepsMut, info: MessageInfo, paused: bool) -> Result<Response, ContractError> {
    nonpayable(&info)?;
    let mut config = CONFIG.load(deps.storage)?;
    if config.admin.as_ref() != Some(&info.sender) {
        return Err(ContractError::Unauthorized {});
    }
    config.deposits_paused = paused;
    CONFIG.save(deps.storage, &config)?;
    Ok(Response::new().add_attribute(
        "action",
        if paused {
            "deposits_paused"
        } else {
            "deposits_resumed"
        },
    ))
}

fn goal_event(action: &str, goal: &Goal) -> Response {
    Response::new()
        .add_attribute("action", action)
        .add_attribute("goal_id", goal.id)
        .add_attribute("owner", &goal.owner)
        .add_attribute("denom", &goal.base_denom)
        .add_attribute("strategy_id", &goal.strategy_id)
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&CONFIG.load(deps.storage)?),
        QueryMsg::ContractVersion {} => to_json_binary(&cw2::get_contract_version(deps.storage)?),
        QueryMsg::Goal { goal_id } => to_json_binary(&GOALS.load(deps.storage, goal_id.u64())?),
        QueryMsg::GoalsByOwner {
            owner,
            start_after,
            limit,
        } => {
            let owner = deps.api.addr_validate(&owner)?;
            let start = start_after.map(|id| Bound::exclusive(id.u64()));
            let goals = OWNER_GOALS
                .prefix(&owner)
                .keys(deps.storage, start, None, Order::Ascending)
                .take(limit.unwrap_or(30).min(100) as usize)
                .map(|id| GOALS.load(deps.storage, id?))
                .collect::<StdResult<Vec<_>>>()?;
            to_json_binary(&GoalsByOwnerResponse { goals })
        }
        QueryMsg::GoalPosition { goal_id } => {
            let g = GOALS.load(deps.storage, goal_id.u64())?;
            to_json_binary(&GoalPositionResponse {
                goal_id: g.id,
                base_denom: g.base_denom,
                strategy_id: g.strategy_id,
                position_units: g.position_units,
                withdrawable_amount: g.position_units,
            })
        }
        QueryMsg::Solvency {} => {
            let config = CONFIG.load(deps.storage)?;
            let balance = deps
                .querier
                .query_balance(env.contract.address, &config.native_denom)?
                .amount;
            let liabilities = TOTAL_LIABILITIES.load(deps.storage)?;
            to_json_binary(&SolvencyResponse {
                native_denom: config.native_denom,
                bank_balance: balance,
                total_liabilities: liabilities,
                solvent: balance >= liabilities,
                surplus: balance.saturating_sub(liabilities),
            })
        }
    }
}
