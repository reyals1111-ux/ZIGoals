use cosmwasm_std::{coin, coins, Addr, Coin, Order, Storage, Uint128};
use cw_multi_test::{App, AppBuilder, ContractWrapper, Executor};
use zigoals_goal_manager::{
    contract::{execute, instantiate, query},
    msg::{
        ExecuteMsg, GoalPositionResponse, GoalsByOwnerResponse, InstantiateMsg, QueryMsg,
        SolvencyResponse,
    },
    state::{Config, Goal, GoalStatus},
};

const DENOM: &str = "utest";
const INITIAL: u128 = 100_000_000_000_000_000_000_000_000_000_000;
const AMOUNTS: [u128; 5] = [
    1,
    23,
    9_007_199_254_740_993,
    18_446_744_073_709_551_617,
    1_234_567_890_123_456_789_012_345,
];

// Fixed xorshift64: failures can be reproduced without a dependency or OS entropy.
struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
}

struct ExpectedGoal {
    owner: usize,
    deposits: Vec<u128>,
    withdrawals: Vec<u128>,
    closed: bool,
    commitment: Option<String>,
}
impl ExpectedGoal {
    fn balance(&self) -> u128 {
        self.deposits.iter().sum::<u128>() - self.withdrawals.iter().sum::<u128>()
    }
}

struct Sequence {
    app: App,
    contract: Addr,
    owners: Vec<Addr>,
    admin: Addr,
    goals: Vec<ExpectedGoal>,
    wallets: Vec<u128>,
    donations: u128,
    paused: bool,
    seed: u64,
    step: usize,
    accepted: usize,
    rejected: usize,
}
impl Sequence {
    fn new(seed: u64) -> Self {
        let api = cosmwasm_std::testing::MockApi::default();
        let owners: Vec<_> = (0..3)
            .map(|i| api.addr_make(&format!("owner-{i}")))
            .collect();
        let admin = api.addr_make("admin");
        let mut app = AppBuilder::new().build(|router, _, storage| {
            for owner in owners.iter().chain([&admin]) {
                router
                    .bank
                    .init_balance(
                        storage,
                        owner,
                        vec![coin(INITIAL, DENOM), coin(1000, "uother")],
                    )
                    .unwrap();
            }
        });
        let code = app.store_code(Box::new(ContractWrapper::new(execute, instantiate, query)));
        let contract = app
            .instantiate_contract(
                code,
                admin.clone(),
                &InstantiateMsg {
                    admin: Some(admin.to_string()),
                    native_denom: DENOM.into(),
                },
                &[],
                "seeded accounting",
                None,
            )
            .unwrap();
        Self {
            app,
            contract,
            owners,
            admin,
            goals: vec![],
            wallets: vec![INITIAL; 3],
            donations: 0,
            paused: false,
            seed,
            step: 0,
            accepted: 0,
            rejected: 0,
        }
    }
    fn goal(&self, index: usize) -> Goal {
        self.app
            .wrap()
            .query_wasm_smart(
                &self.contract,
                &QueryMsg::Goal {
                    goal_id: ((index + 1) as u64).into(),
                },
            )
            .unwrap()
    }
    fn page(&self, owner: usize, cursor: Option<u64>, size: u32) -> Vec<Goal> {
        let response: GoalsByOwnerResponse = self
            .app
            .wrap()
            .query_wasm_smart(
                &self.contract,
                &QueryMsg::GoalsByOwner {
                    owner: self.owners[owner].to_string(),
                    start_after: cursor.map(Into::into),
                    limit: Some(size),
                },
            )
            .unwrap();
        response.goals
    }
    // Snapshot ALL app storage, including contract indices/NEXT_ID, every denom,
    // and bank balances; a rejected payment must roll back more than its goal row.
    fn reject(&mut self, sender: Addr, msg: ExecuteMsg, funds: &[Coin]) {
        let before: Vec<_> = self
            .app
            .storage()
            .range(None, None, Order::Ascending)
            .collect();
        assert!(
            self.app
                .execute_contract(sender, self.contract.clone(), &msg, funds)
                .is_err(),
            "seed={} step={} accepted {msg:?}",
            self.seed,
            self.step
        );
        let after: Vec<_> = self
            .app
            .storage()
            .range(None, None, Order::Ascending)
            .collect();
        assert_eq!(
            after, before,
            "seed={} step={} rejected operation changed storage",
            self.seed, self.step
        );
        self.rejected += 1;
        self.check();
    }
    fn accept(&mut self, sender: Addr, msg: ExecuteMsg, funds: &[Coin]) {
        self.app
            .execute_contract(sender, self.contract.clone(), &msg, funds)
            .unwrap_or_else(|error| {
                panic!("seed={} step={} {msg:?}: {error:#}", self.seed, self.step)
            });
        self.accepted += 1;
    }
    fn create(&mut self, owner: usize) {
        self.accept(
            self.owners[owner].clone(),
            ExecuteMsg::CreateGoal {
                metadata_commitment: None,
            },
            &[],
        );
        self.goals.push(ExpectedGoal {
            owner,
            deposits: vec![],
            withdrawals: vec![],
            closed: false,
            commitment: None,
        });
        self.check();
    }
    fn deposit(&mut self, index: usize, amount: u128) {
        let owner = self.goals[index].owner;
        let msg = ExecuteMsg::Deposit {
            goal_id: ((index + 1) as u64).into(),
        };
        if self.paused || self.goals[index].closed {
            self.reject(self.owners[owner].clone(), msg, &coins(amount, DENOM));
        } else {
            self.accept(self.owners[owner].clone(), msg, &coins(amount, DENOM));
            self.goals[index].deposits.push(amount);
            self.wallets[owner] -= amount;
            self.check();
        }
    }
    fn withdraw(&mut self, index: usize, amount: u128) {
        let owner = self.goals[index].owner;
        let msg = ExecuteMsg::Withdraw {
            goal_id: ((index + 1) as u64).into(),
            amount: amount.into(),
        };
        if self.goals[index].closed || amount == 0 || amount > self.goals[index].balance() {
            self.reject(self.owners[owner].clone(), msg, &[]);
        } else {
            self.accept(self.owners[owner].clone(), msg, &[]);
            self.goals[index].withdrawals.push(amount);
            self.wallets[owner] += amount;
            self.check();
        }
    }
    fn pause(&mut self, paused: bool) {
        self.accept(
            self.admin.clone(),
            if paused {
                ExecuteMsg::PauseDeposits {}
            } else {
                ExecuteMsg::ResumeDeposits {}
            },
            &[],
        );
        self.paused = paused;
        self.check();
    }
    fn close(&mut self, index: usize) {
        let owner = self.goals[index].owner;
        let msg = ExecuteMsg::CloseGoal {
            goal_id: ((index + 1) as u64).into(),
        };
        if self.goals[index].closed || self.goals[index].balance() != 0 {
            self.reject(self.owners[owner].clone(), msg, &[]);
        } else {
            self.accept(self.owners[owner].clone(), msg, &[]);
            self.goals[index].closed = true;
            self.check();
        }
    }
    fn donate(&mut self, owner: usize, amount: u128) {
        self.app
            .send_tokens(
                self.owners[owner].clone(),
                self.contract.clone(),
                &coins(amount, DENOM),
            )
            .unwrap();
        self.wallets[owner] -= amount;
        self.donations += amount;
        self.accepted += 1;
        self.check();
    }
    fn check(&mut self) {
        let context = format!("seed={} step={}", self.seed, self.step);
        let mut liabilities = 0u128;
        for (index, expected) in self.goals.iter().enumerate() {
            let goal = self.goal(index);
            assert_eq!(goal.id.u64(), (index + 1) as u64, "{context}");
            assert_eq!(goal.owner, self.owners[expected.owner], "{context}");
            assert_eq!(
                goal.total_deposited.u128(),
                expected.deposits.iter().sum::<u128>(),
                "{context}"
            );
            assert_eq!(
                goal.total_withdrawn.u128(),
                expected.withdrawals.iter().sum::<u128>(),
                "{context}"
            );
            assert_eq!(goal.position_units.u128(), expected.balance(), "{context}");
            assert_eq!(
                goal.status,
                if expected.closed {
                    GoalStatus::Closed
                } else {
                    GoalStatus::Active
                },
                "{context}"
            );
            assert_eq!(goal.metadata_commitment, expected.commitment, "{context}");
            assert_eq!(goal.created_at, self.app.block_info().time, "{context}");
            assert_eq!(goal.base_denom, DENOM, "{context}");
            assert_eq!(goal.strategy_id, "idle", "{context}");
            let position: GoalPositionResponse = self
                .app
                .wrap()
                .query_wasm_smart(
                    &self.contract,
                    &QueryMsg::GoalPosition {
                        goal_id: ((index + 1) as u64).into(),
                    },
                )
                .unwrap();
            assert_eq!(
                position,
                GoalPositionResponse {
                    goal_id: ((index + 1) as u64).into(),
                    base_denom: DENOM.into(),
                    strategy_id: "idle".into(),
                    position_units: expected.balance().into(),
                    withdrawable_amount: expected.balance().into()
                },
                "{context}"
            );
            liabilities += expected.balance();
        }
        let bank = self
            .app
            .wrap()
            .query_balance(&self.contract, DENOM)
            .unwrap()
            .amount
            .u128();
        assert_eq!(bank, liabilities + self.donations, "{context}");
        let solvency: SolvencyResponse = self
            .app
            .wrap()
            .query_wasm_smart(&self.contract, &QueryMsg::Solvency {})
            .unwrap();
        assert_eq!(
            solvency,
            SolvencyResponse {
                native_denom: DENOM.into(),
                bank_balance: bank.into(),
                total_liabilities: liabilities.into(),
                solvent: true,
                surplus: self.donations.into()
            },
            "{context}"
        );
        for (owner, wallet) in self.owners.iter().zip(&self.wallets) {
            assert_eq!(
                self.app
                    .wrap()
                    .query_balance(owner, DENOM)
                    .unwrap()
                    .amount
                    .u128(),
                *wallet,
                "{context}"
            );
            assert_eq!(
                self.app
                    .wrap()
                    .query_balance(owner, "uother")
                    .unwrap()
                    .amount
                    .u128(),
                1000,
                "{context}"
            );
        }
        assert_eq!(
            self.wallets.iter().sum::<u128>() + bank,
            INITIAL * 3,
            "{context}"
        );
        assert_eq!(
            self.app
                .wrap()
                .query_balance(&self.admin, DENOM)
                .unwrap()
                .amount
                .u128(),
            INITIAL,
            "{context}"
        );
        assert_eq!(
            self.app
                .wrap()
                .query_balance(&self.contract, "uother")
                .unwrap()
                .amount,
            Uint128::zero(),
            "{context}"
        );
        let config: Config = self
            .app
            .wrap()
            .query_wasm_smart(&self.contract, &QueryMsg::Config {})
            .unwrap();
        assert_eq!(
            config,
            Config {
                admin: Some(self.admin.clone()),
                native_denom: DENOM.into(),
                deposits_paused: self.paused
            },
            "{context}"
        );
        // Interleaved owner ids, short pages, empty tails, closed goals, and
        // cursors owned by somebody else detect skipped/repeated/leaked entries.
        for owner in 0..self.owners.len() {
            let expected: Vec<_> = self
                .goals
                .iter()
                .enumerate()
                .filter(|(_, g)| g.owner == owner)
                .map(|(i, _)| (i + 1) as u64)
                .collect();
            let mut actual = vec![];
            let mut cursor = None;
            for _ in 0..=self.goals.len() {
                let page = self.page(owner, cursor, 4);
                assert!(page.len() <= 4, "{context}");
                if page.is_empty() {
                    break;
                }
                for goal in &page {
                    assert_eq!(*goal, self.goal(goal.id.u64() as usize - 1), "{context}");
                }
                cursor = page.last().map(|g| g.id.u64());
                actual.extend(page.iter().map(|g| g.id.u64()));
            }
            assert_eq!(actual, expected, "{context}");
            let foreign_cursor = ((owner + 1) % 3 + 1) as u64;
            assert_eq!(
                self.page(owner, Some(foreign_cursor), 7)
                    .iter()
                    .map(|g| g.id.u64())
                    .collect::<Vec<_>>(),
                expected
                    .iter()
                    .copied()
                    .filter(|id| *id > foreign_cursor)
                    .take(7)
                    .collect::<Vec<_>>(),
                "{context}"
            );
        }
        self.step += 1;
    }
}

#[test]
fn seeded_sequences_catch_lost_funds_cross_goal_credits_and_nonatomic_rejections() {
    for seed in [0x5eed_u64, 0xc0ffee, 0xdeadbeef] {
        let mut rng = Rng(seed);
        let mut s = Sequence::new(seed);
        for i in 0..39 {
            s.create(i % 3);
        }
        // Guarantee lifetime accounting beyond u64, paused full exit, and closed
        // history before random interleaving; these must never depend on luck.
        s.deposit(0, AMOUNTS[4]);
        s.deposit(0, AMOUNTS[2]);
        s.donate(2, AMOUNTS[3]);
        s.pause(true);
        s.deposit(0, 1);
        s.withdraw(0, AMOUNTS[4]);
        s.withdraw(0, AMOUNTS[2]);
        s.close(0);
        s.deposit(0, 1);
        s.withdraw(0, 1);
        s.close(0);
        s.pause(false);
        for _ in 0..192 {
            let index = rng.next() as usize % s.goals.len();
            let owner = s.goals[index].owner;
            let sender = s.owners[owner].clone();
            let stranger = s.owners[(owner + 1) % 3].clone();
            let id = ((index + 1) as u64).into();
            let amount = AMOUNTS[rng.next() as usize % AMOUNTS.len()];
            match rng.next() % 16 {
                0 | 1 => s.deposit(index, amount),
                2 => s.withdraw(index, s.goals[index].balance() / 2),
                3 => s.withdraw(index, s.goals[index].balance()),
                4 => s.close(index),
                5 => s.pause(!s.paused),
                6 => s.donate(owner, amount),
                7 => s.reject(
                    stranger,
                    ExecuteMsg::Deposit { goal_id: id },
                    &coins(amount, DENOM),
                ),
                8 => s.reject(
                    stranger,
                    ExecuteMsg::Withdraw {
                        goal_id: id,
                        amount: 1u128.into(),
                    },
                    &[],
                ),
                9 => s.withdraw(index, s.goals[index].balance() + 1),
                10 => s.reject(
                    sender,
                    ExecuteMsg::Deposit { goal_id: id },
                    &coins(1, "uother"),
                ),
                11 => s.reject(
                    sender,
                    ExecuteMsg::CreateGoal {
                        metadata_commitment: Some("not-a-hash".into()),
                    },
                    &[],
                ),
                12 => s.reject(sender, ExecuteMsg::PauseDeposits {}, &[]),
                13 => s.reject(
                    sender,
                    ExecuteMsg::CloseGoal { goal_id: id },
                    &coins(1, DENOM),
                ),
                14 => s.create(owner),
                _ => {
                    let commitment = Some("ab".repeat(32));
                    let msg = ExecuteMsg::UpdateMetadataCommitment {
                        goal_id: id,
                        metadata_commitment: commitment.clone(),
                    };
                    if s.goals[index].closed {
                        s.reject(sender, msg, &[]);
                    } else {
                        s.accept(sender, msg, &[]);
                        s.goals[index].commitment = commitment;
                        s.check();
                    }
                }
            }
        }
        // Drain every remaining position while paused. Donations remain surplus;
        // closing never destroys the historical deposit/withdrawal ledger.
        s.pause(true);
        for index in 0..s.goals.len() {
            if !s.goals[index].closed {
                let balance = s.goals[index].balance();
                if balance > 0 {
                    s.withdraw(index, balance);
                }
                s.close(index);
            }
        }
        assert!(
            s.rejected > 50,
            "seed {seed} did not exercise rejection paths"
        );
        println!(
            "seed={seed} accepted={} rejected={} goals={} checked_steps={}",
            s.accepted,
            s.rejected,
            s.goals.len(),
            s.step
        );
    }
}
