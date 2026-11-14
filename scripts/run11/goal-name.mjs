// Session AH (Finish): the Goal wizard's name is the first thing these journeys type after the page opens. On a busy
// runner the keystrokes can land in the few milliseconds before the new page has settled and be lost: the field stays
// empty, the later fields keep what was typed, and Continue says "Give your Goal a name." (CI runs 1224, 1227, 1228 and
// the Session AH heads, and about one run in three here; measured with the wizard's own input and focus events: the
// wizard mounts once and its name never changes). A person cannot start typing that soon after a page opens, so the
// journeys type the name, let the page paint twice, and confirm the field holds it before going on, typing it again
// if it does not. Every later step and check is unchanged.
export async function typeGoalName(page,name){
 const field=page.getByLabel('Goal name',{exact:true});
 for(let attempt=1;;attempt++){
  await field.fill(name);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  if(await field.inputValue()===name)return;
  if(attempt===5)throw Error(`The Goal name field kept losing what was typed (5 tries): it holds "${await field.inputValue()}"`);
 }
}
// Session AO (T-014, deliberate): the Goal creator has three steps (Your goal · What counts · Review; the optional rhythm is
// a closed part of the review). From step `from`, Continue to the review, each Continue once it is there, then check the
// review is the last step ("Step 3 of 3", no Continue). The same as apps/web/tests/goal-name.ts.
export async function continueToGoalReview(page,from=1){
 for(let step=from;step<3;step++){const next=page.getByRole('button',{name:'Continue →',exact:true});await next.waitFor();await next.click();}
 await page.getByText('Step 3 of 3',{exact:true}).waitFor();
 if(await page.getByRole('button',{name:'Continue →',exact:true}).count())throw Error('The Goal review is not the last step: Continue is still offered');
}
/** Session AO (T-014): the review's optional rhythm ("A rhythm (optional)") is closed; one tap opens it. */
export async function openGoalRhythm(page){
 const rhythm=page.locator('details.wizard-rhythm');await rhythm.waitFor();
 if(!await rhythm.evaluate(d=>d.open))await rhythm.locator('summary').click();
 if(!await rhythm.evaluate(d=>d.open))throw Error('The Goal review’s rhythm did not open');
}
