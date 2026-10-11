use cosmwasm_schema::write_api;
use zigoals_goal_manager::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};
fn main() {
    std::env::set_current_dir(env!("CARGO_MANIFEST_DIR")).unwrap();
    write_api! { instantiate: InstantiateMsg, execute: ExecuteMsg, query: QueryMsg }
}
