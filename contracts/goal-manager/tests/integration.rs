use cosmwasm_std::{coin, coins, Addr, Empty, Uint128, Uint64};
use cw_multi_test::{App, AppBuilder, Contract, ContractWrapper, Executor};
use zigoals_goal_manager::{
    contract::{execute, instantiate, query},
    msg::{
        ExecuteMsg, GoalPositionResponse, GoalsByOwnerResponse, InstantiateMsg, QueryMsg,
        SolvencyResponse,
    },
    state::{Config, Goal, GoalStatus},
};

const DENOM: &str = "utest";
fn code() -> Box<dyn Contract<Empty>> {
    Box::new(ContractWrapper::new(execute, instantiate, query))
}
struct Suite {
    app: App,
    contract: Addr,
    owner: Addr,
    other: Addr,
    admin: Addr,
}
impl Suite {
    fn new() -> Self {
        let owner = cosmwasm_std::testing::MockApi::default().addr_make("owner");
        let other = cosmwasm_std::testing::MockApi::default().addr_make("other");
        let admin = cosmwasm_std::testing::MockApi::default().addr_make("admin");
        let mut app = AppBuilder::new().build(|router, _, storage| {
            for address in [&owner, &other, &admin] {
                router
                    .bank
                    .init_balance(
                        storage,
                        address,
                        vec![coin(1_000_000, DENOM), coin(1000, "uother")],
                    )
                    .unwrap();
            }
        });
        let id = app.store_code(code());
        let contract = app
            .instantiate_contract(
                id,
                owner.clone(),
                &InstantiateMsg {
                    admin: Some(admin.to_string()),
                    native_denom: DENOM.into(),
                },
                &[],
                "Goal Manager",
                None,
            )
            .unwrap();
        Self {
            app,
            contract,
            owner,
            other,
            admin,
        }
    }
    fn create(&mut self, owner: Addr) -> u64 {
        let response = self
            .app
            .execute_contract(
                owner,
                self.contract.clone(),
                &ExecuteMsg::CreateGoal {
                    metadata_commitment: None,
                },
                &[],
            )
            .unwrap();
        response
            .events
            .iter()
            .flat_map(|e| &e.attributes)
            .find(|a| a.key == "goal_id")
            .unwrap()
            .value
            .parse()
            .unwrap()
    }
    fn goal(&self, id: u64) -> Goal {
        self.app
            .wrap()
            .query_wasm_smart(&self.contract, &QueryMsg::Goal { goal_id: id.into() })
            .unwrap()
    }
    fn balance(&self, owner: &Addr) -> u128 {
        self.app
            .wrap()
            .query_balance(owner, DENOM)
            .unwrap()
            .amount
            .u128()
    }
    fn position(&self, id: u64) -> GoalPositionResponse {
        self.app
            .wrap()
            .query_wasm_smart(
                &self.contract,
                &QueryMsg::GoalPosition { goal_id: id.into() },
            )
            .unwrap()
    }
    fn solvency(&self) -> SolvencyResponse {
        self.app
            .wrap()
            .query_wasm_smart(&self.contract, &QueryMsg::Solvency {})
            .unwrap()
    }
}

#[test]
fn instantiate_sets_injected_denom_optional_pause_admin_and_cw2_version() {
    let s = Suite::new();
    let config: Config = s
        .app
        .wrap()
        .query_wasm_smart(&s.contract, &QueryMsg::Config {})
        .unwrap();
    assert_eq!(
        config,
        Config {
            admin: Some(s.admin.clone()),
            native_denom: DENOM.into(),
            deposits_paused: false
        }
    );
    let version: cw2::ContractVersion = s
        .app
        .wrap()
        .query_wasm_smart(&s.contract, &QueryMsg::ContractVersion {})
        .unwrap();
    assert_eq!(version.contract, "crates.io:zigoals-goal-manager");
    assert_eq!(version.version, env!("CARGO_PKG_VERSION"));
    assert_eq!(
        s.app
            .wrap()
            .query_wasm_contract_info(&s.contract)
            .unwrap()
            .admin,
        None
    );
}

#[test]
fn creates_monotonic_goals_and_indexes_only_their_owners() {
    let mut s = Suite::new();
    assert_eq!(s.create(s.owner.clone()), 1);
    assert_eq!(s.create(s.other.clone()), 2);
    assert_eq!(s.create(s.owner.clone()), 3);
    let first = s.goal(1);
    assert_eq!(first.owner, s.owner);
    assert_eq!(first.created_at, s.app.block_info().time);
    assert_eq!(first.base_denom, DENOM);
    assert_eq!(first.strategy_id, "idle");
    assert_eq!(first.position_units, Uint128::zero());
    assert_eq!(first.total_deposited, Uint128::zero());
    assert_eq!(first.total_withdrawn, Uint128::zero());
    assert_eq!(first.status, GoalStatus::Active);
    assert_eq!(first.metadata_commitment, None);
    let result: GoalsByOwnerResponse = s
        .app
        .wrap()
        .query_wasm_smart(
            &s.contract,
            &QueryMsg::GoalsByOwner {
                owner: s.owner.to_string(),
                start_after: None,
                limit: None,
            },
        )
        .unwrap();
    assert_eq!(
        result.goals.iter().map(|g| g.id.u64()).collect::<Vec<_>>(),
        vec![1, 3]
    );
    assert_eq!(s.position(1).withdrawable_amount, Uint128::zero());
    assert_eq!(s.solvency().total_liabilities, Uint128::zero());
}

#[test]
fn instantiate_rejects_invalid_denom_admin_and_funds() {
    let mut s = Suite::new();
    let id = s.app.store_code(code());
    for denom in ["", "a", "ab", "1test", "u test", "u$test", &"a".repeat(129)] {
        assert!(
            s.app
                .instantiate_contract(
                    id,
                    s.owner.clone(),
                    &InstantiateMsg {
                        admin: None,
                        native_denom: denom.into()
                    },
                    &[],
                    "bad denom",
                    None
                )
                .is_err(),
            "{denom}"
        );
    }
    assert!(s
        .app
        .instantiate_contract(
            id,
            s.owner.clone(),
            &InstantiateMsg {
                admin: Some("invalid".into()),
                native_denom: DENOM.into()
            },
            &[],
            "bad admin",
            None
        )
        .is_err());
    assert!(s
        .app
        .instantiate_contract(
            id,
            s.owner.clone(),
            &InstantiateMsg {
                admin: None,
                native_denom: DENOM.into()
            },
            &coins(10, DENOM),
            "payable",
            None
        )
        .is_err());
    assert_eq!(s.balance(&s.owner), 1_000_000);
    for denom in [
        "factory/creator/token",
        "ibc/0123456789ABCDEF",
        "abc:def._-",
        &"a".repeat(128),
    ] {
        s.app
            .instantiate_contract(
                id,
                s.owner.clone(),
                &InstantiateMsg {
                    admin: None,
                    native_denom: denom.into(),
                },
                &[],
                "valid denom",
                None,
            )
            .unwrap();
    }
}

#[test]
fn ids_and_money_are_strings_at_json_boundary() {
    let text = serde_json::to_string(&ExecuteMsg::Withdraw {
        goal_id: Uint64::new(9_007_199_254_740_993),
        amount: Uint128::MAX,
    })
    .unwrap();
    assert_eq!(text,"{\"withdraw\":{\"goal_id\":\"9007199254740993\",\"amount\":\"340282366920938463463374607431768211455\"}}");
    assert!(
        serde_json::from_str::<ExecuteMsg>(r#"{"deposit":{"goal_id":9007199254740993}}"#).is_err()
    );
}

#[test]
fn deposits_and_withdrawals_move_bank_funds_and_preserve_lifetime_accounting() {
    let mut s = Suite::new();
    let id = s.create(s.owner.clone());
    let other_id = s.create(s.other.clone());
    for amount in [100, 60] {
        s.app
            .execute_contract(
                s.owner.clone(),
                s.contract.clone(),
                &ExecuteMsg::Deposit { goal_id: id.into() },
                &coins(amount, DENOM),
            )
            .unwrap();
    }
    s.app
        .execute_contract(
            s.other.clone(),
            s.contract.clone(),
            &ExecuteMsg::Deposit {
                goal_id: other_id.into(),
            },
            &coins(40, DENOM),
        )
        .unwrap();
    assert_eq!(s.balance(&s.owner), 999_840);
    assert_eq!(s.balance(&s.contract), 200);
    assert_eq!(s.position(id).withdrawable_amount, Uint128::new(160));
    assert_eq!(s.solvency().total_liabilities, Uint128::new(200));
    let result = s
        .app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Withdraw {
                goal_id: id.into(),
                amount: Uint128::new(50),
            },
            &[],
        )
        .unwrap();
    assert!(result
        .events
        .iter()
        .flat_map(|e| &e.attributes)
        .any(|a| a.key == "amount" && a.value == "50"));
    assert_eq!(s.balance(&s.owner), 999_890);
    assert_eq!(s.balance(&s.contract), 150);
    assert_eq!(s.goal(id).position_units, Uint128::new(110));
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Withdraw {
                goal_id: id.into(),
                amount: Uint128::new(110),
            },
            &[],
        )
        .unwrap();
    let goal = s.goal(id);
    assert_eq!(goal.total_deposited, Uint128::new(160));
    assert_eq!(goal.total_withdrawn, Uint128::new(160));
    assert_eq!(goal.position_units, Uint128::zero());
    assert_eq!(s.balance(&s.owner), 1_000_000);
    assert_eq!(s.balance(&s.contract), 40);
    assert_eq!(s.goal(other_id).position_units, Uint128::new(40));
    assert_eq!(s.solvency().total_liabilities, Uint128::new(40));
    assert!(s.solvency().solvent);
}

#[test]
fn rejects_invalid_deposits_atomically_and_only_owner_can_fund_goal() {
    let mut s = Suite::new();
    let id = s.create(s.owner.clone());
    let before = s.goal(id);
    for funds in [
        vec![],
        coins(1, "uother"),
        vec![coin(1, DENOM), coin(1, "uother")],
    ] {
        let error = s
            .app
            .execute_contract(
                s.owner.clone(),
                s.contract.clone(),
                &ExecuteMsg::Deposit { goal_id: id.into() },
                &funds,
            )
            .unwrap_err();
        assert!(error
            .root_cause()
            .to_string()
            .contains("exactly one nonzero native coin"));
        assert_eq!(s.goal(id), before);
        assert_eq!(s.balance(&s.owner), 1_000_000);
        assert_eq!(s.balance(&s.contract), 0);
    }
    for sender in [s.other.clone(), s.admin.clone()] {
        let error = s
            .app
            .execute_contract(
                sender.clone(),
                s.contract.clone(),
                &ExecuteMsg::Deposit { goal_id: id.into() },
                &coins(5, DENOM),
            )
            .unwrap_err();
        assert_eq!(error.root_cause().to_string(), "Unauthorized");
        assert_eq!(s.balance(&sender), 1_000_000);
    }
    assert_eq!(s.solvency().total_liabilities, Uint128::zero());
}

#[test]
fn zero_and_overdraw_and_unauthorized_withdrawals_do_not_change_balances() {
    let mut s = Suite::new();
    let id = s.create(s.owner.clone());
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Deposit { goal_id: id.into() },
            &coins(100, DENOM),
        )
        .unwrap();
    for amount in [0, 101, u128::MAX] {
        let error = s
            .app
            .execute_contract(
                s.owner.clone(),
                s.contract.clone(),
                &ExecuteMsg::Withdraw {
                    goal_id: id.into(),
                    amount: amount.into(),
                },
                &[],
            )
            .unwrap_err();
        assert!(error
            .root_cause()
            .to_string()
            .contains("Withdrawal must be nonzero"));
    }
    for sender in [s.other.clone(), s.admin.clone()] {
        let error = s
            .app
            .execute_contract(
                sender.clone(),
                s.contract.clone(),
                &ExecuteMsg::Withdraw {
                    goal_id: id.into(),
                    amount: 1u128.into(),
                },
                &[],
            )
            .unwrap_err();
        assert_eq!(error.root_cause().to_string(), "Unauthorized");
        assert_eq!(s.balance(&sender), 1_000_000);
    }
    assert_eq!(s.goal(id).position_units, Uint128::new(100));
    assert_eq!(s.goal(id).total_withdrawn, Uint128::zero());
    assert_eq!(s.balance(&s.owner), 999_900);
    assert_eq!(s.balance(&s.contract), 100);
    assert_eq!(s.solvency().total_liabilities, Uint128::new(100));
}

#[test]
fn pause_is_admin_only_and_never_prevents_exit_then_resume_restores_deposit() {
    let mut s = Suite::new();
    let id = s.create(s.owner.clone());
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Deposit { goal_id: id.into() },
            &coins(100, DENOM),
        )
        .unwrap();
    for msg in [ExecuteMsg::PauseDeposits {}, ExecuteMsg::ResumeDeposits {}] {
        assert_eq!(
            s.app
                .execute_contract(s.owner.clone(), s.contract.clone(), &msg, &[])
                .unwrap_err()
                .root_cause()
                .to_string(),
            "Unauthorized"
        );
    }
    s.app
        .execute_contract(
            s.admin.clone(),
            s.contract.clone(),
            &ExecuteMsg::PauseDeposits {},
            &[],
        )
        .unwrap();
    assert_eq!(
        s.app
            .execute_contract(
                s.owner.clone(),
                s.contract.clone(),
                &ExecuteMsg::Deposit { goal_id: id.into() },
                &coins(1, DENOM)
            )
            .unwrap_err()
            .root_cause()
            .to_string(),
        "Deposits are paused"
    );
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Withdraw {
                goal_id: id.into(),
                amount: 100u128.into(),
            },
            &[],
        )
        .unwrap();
    assert_eq!(s.balance(&s.owner), 1_000_000);
    assert_eq!(s.solvency().total_liabilities, Uint128::zero());
    s.app
        .execute_contract(
            s.admin.clone(),
            s.contract.clone(),
            &ExecuteMsg::ResumeDeposits {},
            &[],
        )
        .unwrap();
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Deposit { goal_id: id.into() },
            &coins(7, DENOM),
        )
        .unwrap();
    assert_eq!(s.goal(id).position_units, Uint128::new(7));
}

#[test]
fn optional_admin_absence_permanently_disables_pause_control() {
    let mut s = Suite::new();
    let code_id = s.app.store_code(code());
    let contract = s
        .app
        .instantiate_contract(
            code_id,
            s.owner.clone(),
            &InstantiateMsg {
                admin: None,
                native_denom: DENOM.into(),
            },
            &[],
            "no admin",
            None,
        )
        .unwrap();
    for sender in [s.owner.clone(), s.admin.clone()] {
        for msg in [ExecuteMsg::PauseDeposits {}, ExecuteMsg::ResumeDeposits {}] {
            assert_eq!(
                s.app
                    .execute_contract(sender.clone(), contract.clone(), &msg, &[])
                    .unwrap_err()
                    .root_cause()
                    .to_string(),
                "Unauthorized"
            );
        }
    }
}

#[test]
fn failed_downstream_bank_send_rolls_back_goal_and_liabilities() {
    let mut s = Suite::new();
    let id = s.create(s.owner.clone());
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Deposit { goal_id: id.into() },
            &coins(80, DENOM),
        )
        .unwrap();
    // Test-only bank fault: model a failed outgoing transfer after state writes.
    s.app.init_modules(|router, _, storage| {
        router
            .bank
            .init_balance(storage, &s.contract, vec![])
            .unwrap()
    });
    let before = s.goal(id);
    assert!(!s.solvency().solvent);
    assert!(s
        .app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Withdraw {
                goal_id: id.into(),
                amount: 40u128.into()
            },
            &[]
        )
        .is_err());
    assert_eq!(s.goal(id), before);
    assert_eq!(s.solvency().total_liabilities, Uint128::new(80));
    assert_eq!(s.balance(&s.owner), 999_920);
}

#[test]
fn unsolicited_bank_funds_are_surplus_and_never_credit_a_goal() {
    let mut s = Suite::new();
    let id = s.create(s.owner.clone());
    s.app
        .send_tokens(s.other.clone(), s.contract.clone(), &coins(25, DENOM))
        .unwrap();
    assert_eq!(s.goal(id).position_units, Uint128::zero());
    assert_eq!(
        s.solvency(),
        SolvencyResponse {
            native_denom: DENOM.into(),
            bank_balance: 25u128.into(),
            total_liabilities: Uint128::zero(),
            solvent: true,
            surplus: 25u128.into()
        }
    );
    assert!(s
        .app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Withdraw {
                goal_id: id.into(),
                amount: 25u128.into()
            },
            &[]
        )
        .is_err());
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Deposit { goal_id: id.into() },
            &coins(10, DENOM),
        )
        .unwrap();
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Withdraw {
                goal_id: id.into(),
                amount: 10u128.into(),
            },
            &[],
        )
        .unwrap();
    assert_eq!(s.balance(&s.contract), 25);
    assert_eq!(s.solvency().surplus, Uint128::new(25));
}

#[test]
fn close_requires_owner_and_empty_balance_preserving_history_and_blocking_reuse() {
    let mut s = Suite::new();
    let id = s.create(s.owner.clone());
    assert_eq!(
        s.app
            .execute_contract(
                s.other.clone(),
                s.contract.clone(),
                &ExecuteMsg::CloseGoal { goal_id: id.into() },
                &[]
            )
            .unwrap_err()
            .root_cause()
            .to_string(),
        "Unauthorized"
    );
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Deposit { goal_id: id.into() },
            &coins(12, DENOM),
        )
        .unwrap();
    assert_eq!(
        s.app
            .execute_contract(
                s.owner.clone(),
                s.contract.clone(),
                &ExecuteMsg::CloseGoal { goal_id: id.into() },
                &[]
            )
            .unwrap_err()
            .root_cause()
            .to_string(),
        "Goal must be empty to close"
    );
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::Withdraw {
                goal_id: id.into(),
                amount: 12u128.into(),
            },
            &[],
        )
        .unwrap();
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::CloseGoal { goal_id: id.into() },
            &[],
        )
        .unwrap();
    let goal = s.goal(id);
    assert_eq!(goal.status, GoalStatus::Closed);
    assert_eq!(goal.total_deposited, Uint128::new(12));
    assert_eq!(goal.total_withdrawn, Uint128::new(12));
    for (msg, funds) in [
        (ExecuteMsg::Deposit { goal_id: id.into() }, coins(1, DENOM)),
        (
            ExecuteMsg::Withdraw {
                goal_id: id.into(),
                amount: 1u128.into(),
            },
            vec![],
        ),
        (ExecuteMsg::CloseGoal { goal_id: id.into() }, vec![]),
        (
            ExecuteMsg::UpdateMetadataCommitment {
                goal_id: id.into(),
                metadata_commitment: None,
            },
            vec![],
        ),
    ] {
        assert_eq!(
            s.app
                .execute_contract(s.owner.clone(), s.contract.clone(), &msg, &funds)
                .unwrap_err()
                .root_cause()
                .to_string(),
            "Goal is closed"
        );
    }
    assert_eq!(s.balance(&s.owner), 1_000_000);
    assert_eq!(s.create(s.owner.clone()), 2);
    let list: GoalsByOwnerResponse = s
        .app
        .wrap()
        .query_wasm_smart(
            &s.contract,
            &QueryMsg::GoalsByOwner {
                owner: s.owner.to_string(),
                start_after: None,
                limit: None,
            },
        )
        .unwrap();
    assert_eq!(list.goals.len(), 2);
    assert_eq!(list.goals[0].status, GoalStatus::Closed);
}

#[test]
fn commitments_accept_only_fixed_hex_and_mutation_requires_owner() {
    let mut s = Suite::new();
    for value in [
        "".to_string(),
        "private notes".to_string(),
        "a".repeat(63),
        "b".repeat(65),
        "g".repeat(64),
        "é".repeat(32),
        format!("0x{}", "a".repeat(64)),
    ] {
        assert!(s
            .app
            .execute_contract(
                s.owner.clone(),
                s.contract.clone(),
                &ExecuteMsg::CreateGoal {
                    metadata_commitment: Some(value)
                },
                &[]
            )
            .unwrap_err()
            .root_cause()
            .to_string()
            .contains("64-character hexadecimal hash"));
    }
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::CreateGoal {
                metadata_commitment: Some("AB".repeat(32)),
            },
            &[],
        )
        .unwrap();
    assert_eq!(s.goal(1).metadata_commitment, Some("ab".repeat(32)));
    assert_eq!(
        s.app
            .execute_contract(
                s.other.clone(),
                s.contract.clone(),
                &ExecuteMsg::UpdateMetadataCommitment {
                    goal_id: 1u64.into(),
                    metadata_commitment: None
                },
                &[]
            )
            .unwrap_err()
            .root_cause()
            .to_string(),
        "Unauthorized"
    );
    assert!(s
        .app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::UpdateMetadataCommitment {
                goal_id: 1u64.into(),
                metadata_commitment: Some("secret".into())
            },
            &[]
        )
        .is_err());
    assert_eq!(s.goal(1).metadata_commitment, Some("ab".repeat(32)));
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::UpdateMetadataCommitment {
                goal_id: 1u64.into(),
                metadata_commitment: Some("EF".repeat(32)),
            },
            &[],
        )
        .unwrap();
    assert_eq!(s.goal(1).metadata_commitment, Some("ef".repeat(32)));
    s.app
        .execute_contract(
            s.owner.clone(),
            s.contract.clone(),
            &ExecuteMsg::UpdateMetadataCommitment {
                goal_id: 1u64.into(),
                metadata_commitment: None,
            },
            &[],
        )
        .unwrap();
    assert_eq!(s.goal(1).metadata_commitment, None);
}

#[test]
fn every_non_deposit_message_rejects_attached_funds_without_state_change() {
    let mut s = Suite::new();
    let id = s.create(s.owner.clone());
    let before = s.goal(id);
    for (sender, msg) in [
        (
            s.owner.clone(),
            ExecuteMsg::CreateGoal {
                metadata_commitment: None,
            },
        ),
        (
            s.owner.clone(),
            ExecuteMsg::Withdraw {
                goal_id: id.into(),
                amount: 1u128.into(),
            },
        ),
        (
            s.owner.clone(),
            ExecuteMsg::CloseGoal { goal_id: id.into() },
        ),
        (
            s.owner.clone(),
            ExecuteMsg::UpdateMetadataCommitment {
                goal_id: id.into(),
                metadata_commitment: None,
            },
        ),
        (s.admin.clone(), ExecuteMsg::PauseDeposits {}),
        (s.admin.clone(), ExecuteMsg::ResumeDeposits {}),
    ] {
        assert_eq!(
            s.app
                .execute_contract(sender.clone(), s.contract.clone(), &msg, &coins(1, DENOM))
                .unwrap_err()
                .root_cause()
                .to_string(),
            "Attached funds are not accepted"
        );
        assert_eq!(s.balance(&sender), 1_000_000);
        assert_eq!(s.goal(id), before);
        assert_eq!(s.balance(&s.contract), 0);
    }
    assert_eq!(s.create(s.owner.clone()), 2);
}

#[test]
fn nonexistent_goal_mutations_and_queries_fail_without_taking_money() {
    let mut s = Suite::new();
    for (msg, funds) in [
        (
            ExecuteMsg::Deposit {
                goal_id: 999u64.into(),
            },
            coins(1, DENOM),
        ),
        (
            ExecuteMsg::Withdraw {
                goal_id: 999u64.into(),
                amount: 1u128.into(),
            },
            vec![],
        ),
        (
            ExecuteMsg::CloseGoal {
                goal_id: 999u64.into(),
            },
            vec![],
        ),
        (
            ExecuteMsg::UpdateMetadataCommitment {
                goal_id: 999u64.into(),
                metadata_commitment: None,
            },
            vec![],
        ),
    ] {
        assert_eq!(
            s.app
                .execute_contract(s.owner.clone(), s.contract.clone(), &msg, &funds)
                .unwrap_err()
                .root_cause()
                .to_string(),
            "Goal not found"
        );
    }
    assert!(s
        .app
        .wrap()
        .query_wasm_smart::<Goal>(
            &s.contract,
            &QueryMsg::Goal {
                goal_id: 0u64.into()
            }
        )
        .is_err());
    assert!(s
        .app
        .wrap()
        .query_wasm_smart::<GoalPositionResponse>(
            &s.contract,
            &QueryMsg::GoalPosition {
                goal_id: 999u64.into()
            }
        )
        .is_err());
    assert_eq!(s.balance(&s.owner), 1_000_000);
    assert_eq!(s.balance(&s.contract), 0);
}

#[test]
fn pagination_is_exclusive_owner_scoped_default_30_and_capped_100() {
    let mut s = Suite::new();
    for _ in 0..105 {
        s.create(s.owner.clone());
    }
    let other_id = s.create(s.other.clone());
    let fetch = |start_after: Option<Uint64>, limit| -> GoalsByOwnerResponse {
        s.app
            .wrap()
            .query_wasm_smart(
                &s.contract,
                &QueryMsg::GoalsByOwner {
                    owner: s.owner.to_string(),
                    start_after,
                    limit,
                },
            )
            .unwrap()
    };
    assert_eq!(fetch(None, None).goals.len(), 30);
    assert_eq!(fetch(None, Some(1000)).goals.len(), 100);
    assert_eq!(fetch(None, Some(0)).goals.len(), 0);
    let tail = fetch(Some(100u64.into()), Some(100));
    assert_eq!(
        tail.goals.iter().map(|g| g.id.u64()).collect::<Vec<_>>(),
        vec![101, 102, 103, 104, 105]
    );
    assert!(fetch(Some(other_id.into()), None).goals.is_empty());
    assert!(fetch(Some(Uint64::MAX), None).goals.is_empty());
    assert!(s
        .app
        .wrap()
        .query_wasm_smart::<GoalsByOwnerResponse>(
            &s.contract,
            &QueryMsg::GoalsByOwner {
                owner: "invalid".into(),
                start_after: None,
                limit: None
            }
        )
        .is_err());
}

#[test]
fn all_mutations_emit_public_action_and_goal_identifiers_without_private_commitment() {
    let mut s = Suite::new();
    let cases = [
        (
            s.owner.clone(),
            ExecuteMsg::CreateGoal {
                metadata_commitment: Some("ab".repeat(32)),
            },
            vec![],
            "goal_created",
            None,
        ),
        (
            s.owner.clone(),
            ExecuteMsg::Deposit {
                goal_id: 1u64.into(),
            },
            coins(9, DENOM),
            "deposit",
            Some("9"),
        ),
        (
            s.owner.clone(),
            ExecuteMsg::Withdraw {
                goal_id: 1u64.into(),
                amount: 9u128.into(),
            },
            vec![],
            "withdraw",
            Some("9"),
        ),
        (
            s.owner.clone(),
            ExecuteMsg::UpdateMetadataCommitment {
                goal_id: 1u64.into(),
                metadata_commitment: Some("cd".repeat(32)),
            },
            vec![],
            "metadata_updated",
            None,
        ),
        (
            s.admin.clone(),
            ExecuteMsg::PauseDeposits {},
            vec![],
            "deposits_paused",
            None,
        ),
        (
            s.admin.clone(),
            ExecuteMsg::ResumeDeposits {},
            vec![],
            "deposits_resumed",
            None,
        ),
        (
            s.owner.clone(),
            ExecuteMsg::CloseGoal {
                goal_id: 1u64.into(),
            },
            vec![],
            "goal_closed",
            None,
        ),
    ];
    for (sender, msg, funds, action, amount) in cases {
        let response = s
            .app
            .execute_contract(sender, s.contract.clone(), &msg, &funds)
            .unwrap();
        let event = response.events.iter().find(|e| e.ty == "wasm").unwrap();
        let value = |key| {
            event
                .attributes
                .iter()
                .find(|a| a.key == key)
                .map(|a| a.value.as_str())
        };
        assert_eq!(value("action"), Some(action));
        if !action.starts_with("deposits_") {
            assert_eq!(value("goal_id"), Some("1"));
            assert_eq!(value("owner"), Some(s.owner.as_str()));
            assert_eq!(value("denom"), Some(DENOM));
            assert_eq!(value("strategy_id"), Some("idle"));
        }
        assert_eq!(value("amount"), amount);
        assert!(event
            .attributes
            .iter()
            .all(|a| a.key != "metadata_commitment"));
    }
}

#[test]
fn many_interleaved_goal_operations_preserve_owner_balances_and_global_liabilities() {
    let mut s = Suite::new();
    let owners = [s.owner.clone(), s.other.clone()];
    let mut ids = Vec::new();
    for i in 0..6 {
        ids.push(s.create(owners[i % 2].clone()));
    }
    let mut deposited = [0u128; 6];
    let mut withdrawn = [0u128; 6];
    for turn in 0..120 {
        let i = (turn * 7) % 6;
        let amount = ((turn * 13) % 50 + 1) as u128;
        s.app
            .execute_contract(
                owners[i % 2].clone(),
                s.contract.clone(),
                &ExecuteMsg::Deposit {
                    goal_id: ids[i].into(),
                },
                &coins(amount, DENOM),
            )
            .unwrap();
        deposited[i] += amount;
        if turn % 3 == 0 {
            let withdrawal = (deposited[i] - withdrawn[i]) / 2;
            if withdrawal > 0 {
                s.app
                    .execute_contract(
                        owners[i % 2].clone(),
                        s.contract.clone(),
                        &ExecuteMsg::Withdraw {
                            goal_id: ids[i].into(),
                            amount: withdrawal.into(),
                        },
                        &[],
                    )
                    .unwrap();
                withdrawn[i] += withdrawal;
            }
        }
        let mut totals = [0u128; 2];
        for goal_index in 0..6 {
            let goal = s.goal(ids[goal_index]);
            let expected = deposited[goal_index] - withdrawn[goal_index];
            assert_eq!(goal.total_deposited.u128(), deposited[goal_index]);
            assert_eq!(goal.total_withdrawn.u128(), withdrawn[goal_index]);
            assert_eq!(goal.position_units.u128(), expected);
            totals[goal_index % 2] += expected;
        }
        for owner_index in 0..2 {
            assert_eq!(
                s.balance(&owners[owner_index]),
                1_000_000 - totals[owner_index]
            );
        }
        let liabilities = totals[0] + totals[1];
        assert_eq!(s.balance(&s.contract), liabilities);
        assert_eq!(s.solvency().total_liabilities.u128(), liabilities);
        assert_eq!(s.solvency().surplus, Uint128::zero());
        assert!(s.solvency().solvent);
    }
}
