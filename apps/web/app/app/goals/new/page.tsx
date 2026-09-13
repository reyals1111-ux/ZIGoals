import { GoalWizard } from "../../../../components/goal-wizard";
export default function NewGoal() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A destination worth planning for</p>
          <h1>Create a goal.</h1>
        </div>
      </div>
      <GoalWizard />
    </>
  );
}
