use cosmwasm_std::{OverflowError, StdError};
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),
    #[error("{0}")]
    Overflow(#[from] OverflowError),
    #[error("Attached funds are not accepted")]
    Nonpayable {},
    #[error("Unauthorized")]
    Unauthorized {},
    #[error("Invalid native denomination")]
    InvalidDenom {},
    #[error("Metadata commitment must be a 64-character hexadecimal hash")]
    InvalidCommitment {},
    #[error("Goal not found")]
    GoalNotFound {},
    #[error("Goal is closed")]
    GoalClosed {},
    #[error("Goal must be empty to close")]
    GoalNotEmpty {},
    #[error("Deposits are paused")]
    DepositsPaused {},
    #[error("Deposit requires exactly one nonzero native coin")]
    InvalidDeposit {},
    #[error("Withdrawal must be nonzero and no greater than the goal balance")]
    InvalidWithdrawal {},
    #[error("Goal ID space exhausted")]
    IdExhausted {},
}
