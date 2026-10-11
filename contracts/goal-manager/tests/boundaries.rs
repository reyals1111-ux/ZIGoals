use cosmwasm_std::{
    coin,
    testing::{message_info, mock_dependencies, mock_env},
    Addr, Uint128,
};
use zigoals_goal_manager::{
    contract::{execute, instantiate},
    error::ContractError,
    msg::{ExecuteMsg, InstantiateMsg},
    state::{GOALS, NEXT_ID, OWNER_GOALS, TOTAL_LIABILITIES},
};

#[test]
fn zero_and_duplicate_coin_entries_are_rejected_at_contract_boundary() {
    let mut deps = mock_dependencies();
    let owner = deps.api.addr_make("owner");
    instantiate(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        InstantiateMsg {
            admin: None,
            native_denom: "utest".into(),
        },
    )
    .unwrap();
    execute(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        ExecuteMsg::CreateGoal {
            metadata_commitment: None,
        },
    )
    .unwrap();
    for funds in [
        vec![coin(0, "utest")],
        vec![coin(1, "utest"), coin(2, "utest")],
    ] {
        let error = execute(
            deps.as_mut(),
            mock_env(),
            message_info(&owner, &funds),
            ExecuteMsg::Deposit {
                goal_id: 1u64.into(),
            },
        )
        .unwrap_err();
        assert_eq!(error, ContractError::InvalidDeposit {});
        assert_eq!(
            GOALS.load(&deps.storage, 1).unwrap().position_units,
            Uint128::zero()
        );
        assert_eq!(
            TOTAL_LIABILITIES.load(&deps.storage).unwrap(),
            Uint128::zero()
        );
    }
}

#[test]
fn id_exhaustion_fails_without_overwrite_or_owner_index_write() {
    let mut deps = mock_dependencies();
    let owner = deps.api.addr_make("owner");
    instantiate(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        InstantiateMsg {
            admin: None,
            native_denom: "utest".into(),
        },
    )
    .unwrap();
    NEXT_ID.save(&mut deps.storage, &u64::MAX).unwrap();
    let error = execute(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        ExecuteMsg::CreateGoal {
            metadata_commitment: None,
        },
    )
    .unwrap_err();
    assert_eq!(error, ContractError::IdExhausted {});
    assert_eq!(NEXT_ID.load(&deps.storage).unwrap(), u64::MAX);
    assert!(GOALS.may_load(&deps.storage, u64::MAX).unwrap().is_none());
    assert!(OWNER_GOALS
        .may_load(&deps.storage, (&owner, u64::MAX))
        .unwrap()
        .is_none());
}

#[test]
fn overflowing_deposit_counters_or_liabilities_never_wrap_or_partially_write() {
    let mut deps = mock_dependencies();
    let owner = deps.api.addr_make("owner");
    instantiate(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        InstantiateMsg {
            admin: None,
            native_denom: "utest".into(),
        },
    )
    .unwrap();
    execute(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        ExecuteMsg::CreateGoal {
            metadata_commitment: None,
        },
    )
    .unwrap();
    for field in ["total_deposited", "position_units", "liabilities"] {
        let mut goal = GOALS.load(&deps.storage, 1).unwrap();
        goal.total_deposited = if field == "total_deposited" {
            Uint128::MAX
        } else {
            Uint128::zero()
        };
        goal.position_units = if field == "position_units" {
            Uint128::MAX
        } else {
            Uint128::zero()
        };
        let liabilities = if field == "liabilities" {
            Uint128::MAX
        } else {
            Uint128::zero()
        };
        GOALS.save(&mut deps.storage, 1, &goal).unwrap();
        TOTAL_LIABILITIES
            .save(&mut deps.storage, &liabilities)
            .unwrap();
        assert!(matches!(
            execute(
                deps.as_mut(),
                mock_env(),
                message_info(&owner, &[coin(1, "utest")]),
                ExecuteMsg::Deposit {
                    goal_id: 1u64.into()
                }
            ),
            Err(ContractError::Overflow(_))
        ));
        assert_eq!(GOALS.load(&deps.storage, 1).unwrap(), goal);
        assert_eq!(TOTAL_LIABILITIES.load(&deps.storage).unwrap(), liabilities);
    }
}

#[test]
fn overflowing_withdrawn_or_underflowing_liabilities_never_partially_write() {
    let mut deps = mock_dependencies();
    let owner = deps.api.addr_make("owner");
    instantiate(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        InstantiateMsg {
            admin: None,
            native_denom: "utest".into(),
        },
    )
    .unwrap();
    execute(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        ExecuteMsg::CreateGoal {
            metadata_commitment: None,
        },
    )
    .unwrap();
    for overflow_withdrawn in [true, false] {
        let mut goal = GOALS.load(&deps.storage, 1).unwrap();
        goal.position_units = Uint128::new(10);
        goal.total_withdrawn = if overflow_withdrawn {
            Uint128::MAX
        } else {
            Uint128::zero()
        };
        let liabilities = if overflow_withdrawn {
            Uint128::new(10)
        } else {
            Uint128::zero()
        };
        GOALS.save(&mut deps.storage, 1, &goal).unwrap();
        TOTAL_LIABILITIES
            .save(&mut deps.storage, &liabilities)
            .unwrap();
        assert!(matches!(
            execute(
                deps.as_mut(),
                mock_env(),
                message_info(&owner, &[]),
                ExecuteMsg::Withdraw {
                    goal_id: 1u64.into(),
                    amount: 1u128.into()
                }
            ),
            Err(ContractError::Overflow(_))
        ));
        assert_eq!(GOALS.load(&deps.storage, 1).unwrap(), goal);
        assert_eq!(TOTAL_LIABILITIES.load(&deps.storage).unwrap(), liabilities);
    }
}

#[test]
fn rejects_zero_coin_attachments_even_on_nonpayable_messages() {
    let mut deps = mock_dependencies();
    let owner = deps.api.addr_make("owner");
    assert_eq!(
        instantiate(
            deps.as_mut(),
            mock_env(),
            message_info(&owner, &[coin(0, "utest")]),
            InstantiateMsg {
                admin: None,
                native_denom: "utest".into()
            }
        )
        .unwrap_err(),
        ContractError::Nonpayable {}
    );
    instantiate(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        InstantiateMsg {
            admin: Some(owner.to_string()),
            native_denom: "utest".into(),
        },
    )
    .unwrap();
    execute(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        ExecuteMsg::CreateGoal {
            metadata_commitment: None,
        },
    )
    .unwrap();
    for msg in [
        ExecuteMsg::CreateGoal {
            metadata_commitment: None,
        },
        ExecuteMsg::Withdraw {
            goal_id: 1u64.into(),
            amount: 1u128.into(),
        },
        ExecuteMsg::CloseGoal {
            goal_id: 1u64.into(),
        },
        ExecuteMsg::UpdateMetadataCommitment {
            goal_id: 1u64.into(),
            metadata_commitment: None,
        },
        ExecuteMsg::PauseDeposits {},
        ExecuteMsg::ResumeDeposits {},
    ] {
        assert_eq!(
            execute(
                deps.as_mut(),
                mock_env(),
                message_info(&owner, &[coin(0, "utest")]),
                msg
            )
            .unwrap_err(),
            ContractError::Nonpayable {}
        );
    }
}

#[test]
fn no_arbitrary_call_sweep_owner_transfer_or_migration_execute_message_exists() {
    for json in [
        r#"{"sweep":{}}"#,
        r#"{"execute":{"msgs":[]}}"#,
        r#"{"transfer_ownership":{"owner":"someone"}}"#,
        r#"{"migrate":{}}"#,
    ] {
        assert!(serde_json::from_str::<ExecuteMsg>(json).is_err());
    }
    // A configured admin has no goal-owner privilege, even when its address is valid.
    let mut deps = mock_dependencies();
    let owner = deps.api.addr_make("owner");
    let admin: Addr = deps.api.addr_make("admin");
    instantiate(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        InstantiateMsg {
            admin: Some(admin.to_string()),
            native_denom: "utest".into(),
        },
    )
    .unwrap();
    execute(
        deps.as_mut(),
        mock_env(),
        message_info(&owner, &[]),
        ExecuteMsg::CreateGoal {
            metadata_commitment: None,
        },
    )
    .unwrap();
    for msg in [
        ExecuteMsg::CloseGoal {
            goal_id: 1u64.into(),
        },
        ExecuteMsg::UpdateMetadataCommitment {
            goal_id: 1u64.into(),
            metadata_commitment: None,
        },
    ] {
        assert_eq!(
            execute(deps.as_mut(), mock_env(), message_info(&admin, &[]), msg).unwrap_err(),
            ContractError::Unauthorized {}
        );
    }
}
