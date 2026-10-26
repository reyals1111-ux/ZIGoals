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
