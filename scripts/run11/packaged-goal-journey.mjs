// Real visible UI against the caller's generated app and local Worker topology.
// Project progress is milestones, so it deliberately has no financial funding.
// Evidence screenshots mask every recovery-secret field (Session U Part 6, FIX_PLAN D6; apps/web/tests/safe-screenshot.ts).
import {expect} from 'vitest';
import {writeFile} from 'node:fs/promises';
import {armPackagedSync,waitPackagedSync} from './packaged-consumer-journey.mjs';
import {typeGoalName} from './goal-name.mjs';
// Session AB-Design (ADR-024 D2): on a phone Settings is a row of the More sheet; the sidebar link elsewhere.
const navigate=async(page,name)=>{const more=page.locator('.phone-more-top');if(name==='Settings'&&await more.isVisible()){await more.click();await page.getByRole('dialog',{name:'More',exact:true}).getByRole('link',{name,exact:true}).click();return;}await page.getByRole('link',{name,exact:true}).first().click();};
/** Session U follow-up F3: on a phone a Today widget card is a row named by it that opens in place; open it there. */
// Session V Part 1b: a row the person opened before stays open on that device, so it is opened only while folded (a
// remembered state that lands between the read and the click closes it once, and the second pass opens it again).
// Session AC (ADR-025 E19): the habits widget standing in for Daily Habits shows open on a phone (no row).
// Session AK (ADR-036, deliberate): 15c1e159 (RELEASE_REVIEW_2 R2-9) puts the widget's figure under its name in the folded
// row, as part of the row's name ("Breakfast today 150 kcal"); the row is the one whose name is the card's name, alone or
// followed by that figure. The card itself is still found by its exact name.
async function todayCard(page,name){const card=page.getByRole('article',{name,exact:true});if(await page.evaluate(()=>matchMedia('(max-width: 767.98px), (pointer: coarse) and (max-height: 500px)').matches)){const row=page.getByRole('button',{name:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?: .+)?$')});await row.or(card).first().waitFor();if(await row.count()){for(let pass=0;pass<2&&await row.getAttribute('aria-expanded')!=='true';pass++)await row.click();}else await card.waitFor({state:'visible'});}return card;}

async function openModule(page,id){const section=page.locator('#'+id);if(await section.getAttribute('open')===null)await section.locator('summary').first().click();return section;}
async function sync(page){await navigate(page,'Settings');const synced1=await armPackagedSync(page);await page.getByRole('button',{name:'Sync now',exact:true}).click();await waitPackagedSync(page,synced1);}
async function timeline(page,kind){
 const panel=page.getByRole('region',{name:'Goal timeline',exact:true});await panel.getByLabel('Event type',{exact:true}).selectOption(kind);
 await panel.getByRole('status').filter({hasText:'retained events'}).waitFor();
 for(const details of await panel.locator('li details').all())if(await details.getAttribute('open')===null)await details.locator('summary').click();
 return panel.locator('li').evaluateAll(rows=>rows.map(row=>({id:row.id,label:row.querySelector('strong')?.textContent,detail:[...row.querySelectorAll('dd')].map(value=>value.textContent)})));
}
async function openGoal(page,name,path){await navigate(page,'Goals');await page.getByRole('button',{name:'Active',exact:true}).click();const card=page.locator('.goal-card').filter({has:page.getByRole('heading',{name,exact:true})});const link=card.getByRole('link',{name,exact:true});expect(await link.getAttribute('href')).toBe(path);await link.click();await page.getByTestId('tracked-progress').waitFor();}
async function pinGoalAndHabit(page,name,path,habit){
 await navigate(page,'Goals');await page.getByRole('button',{name:'Active',exact:true}).click();const card=page.locator('.goal-card').filter({has:page.getByRole('heading',{name,exact:true})});
 expect(await card.getByRole('link',{name,exact:true}).getAttribute('href')).toBe(path);
 await card.getByRole('button',{name:`Options for ${name}`,exact:true}).click();await card.getByRole('button',{name:`Add ${name} progress to Today`,exact:true}).click();await card.getByText(`${name} progress added to Today.`,{exact:true}).waitFor();
 await navigate(page,'Habits');await page.getByRole('button',{name:'All',exact:true}).click();const habitCard=page.locator('.habit-card').filter({has:page.getByRole('heading',{name:habit,exact:true})});
 await habitCard.getByRole('button',{name:`Options for ${habit}`,exact:true}).click();await habitCard.getByRole('button',{name:`Add ${habit} check-in to Today`,exact:true}).click();
 await navigate(page,'Today');await (await todayCard(page,name)).waitFor();await (await todayCard(page,habit)).waitFor();
}
/** Session AK X1 (RELEASE_REVIEW R5): until the chain is chosen the kinds of goal read in a person's words; either name is the same choice. */
const KIND={Value:'Save an amount',Quantity:'Reach a number of something',Project:'Finish a project'};
const kind=type=>new RegExp(`^(${type}|${KIND[type]})$`);
async function create(page,type){
 const name=`Packaged ${type} continuity`;
 await navigate(page,'Today');await page.locator('.today-hero').getByRole('button',{name:'+ Quick add',exact:true}).click();await page.getByRole('navigation',{name:'Quick add actions'}).getByRole('link').filter({hasText:'Goal'}).click();
 await typeGoalName(page,name);await page.getByRole('radio',{name:kind(type)}).check();
 if(type==='Project')await page.getByLabel('Milestones, one per line',{exact:true}).fill('Fictional research review\nFictional delivery review');
 else{await page.getByLabel('Target amount',{exact:true}).fill(type==='Value'?'1000':'10');if(type==='Quantity')await page.getByLabel('Goal asset',{exact:true}).fill('BTC');}
 await page.getByRole('button',{name:'Continue →',exact:true}).click();
 if(type!=='Project'){await page.getByLabel('Add a contribution plan',{exact:true}).check();await page.getByLabel('Planned amount',{exact:true}).fill(type==='Value'?'50':'1');await page.getByLabel('Contribution asset',{exact:true}).fill(type==='Value'?'USD':'BTC');}
 await page.getByRole('button',{name:'Continue →',exact:true}).click();if(type!=='Project')await page.getByLabel('Create supporting Habit',{exact:true}).check();await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByRole('button',{name:'Create goal',exact:true}).click();await page.getByTestId('tracked-progress').waitFor();
 const path=new URL(page.url()).pathname;expect(path).toMatch(/^\/app\/goals\/tracked\/\d+$/);
 const habit=type==='Project'?`Review ${name}`:type==='Value'?'Contribute 50 USD monthly':'Contribute 1 BTC monthly';const supporting=await openModule(page,'supporting-habits');
 if(type==='Project')await supporting.getByRole('button',{name:'Add weekly Goal review habit',exact:true}).click();await supporting.getByRole('heading',{name:habit,exact:true}).waitFor();
 return {name,path,habit,type};
}
async function fund(page,goal){
 await page.getByRole('button',{name:'Fund Goal',exact:true}).first().click();/* Session AL (DV-007b, deliberate): the sheet's title reads "Fund your goal" */const dialog=page.getByRole('dialog',{name:'Fund your goal',exact:true});
 if(goal.type==='Value'){await dialog.getByRole('button',{name:'Cash',exact:true}).click();await dialog.getByLabel('Asset name',{exact:true}).fill('Fictional Value continuity cash');await dialog.getByLabel('Cash amount',{exact:true}).fill('200');}
 /* Session AL (L4 fourth pass, DV-034a/DV-104, deliberate): a Quantity goal made before the chain is chosen counts its own
    unit (denom manual:BTC, lib/goals/goal-units.ts): Fund adds to that tally with "How many BTC did you add?", with no asset
    picker; its preview says one record is added and no money moves. */
 else await dialog.getByLabel('How many BTC did you add?',{exact:true}).fill('2');
 if(goal.type==='Value')await dialog.getByRole('button',{name:'Continue with this asset',exact:true}).click();await dialog.getByLabel('Note (optional)',{exact:true}).fill(`Fictional original ${goal.type} receipt`);await dialog.getByRole('button',{name:'Preview contribution',exact:true}).click();expect(await dialog.textContent()).toContain(goal.type==='Value'?'One contribution record will be added.':'One record is added; no money moves.');await dialog.getByRole('button',{name:'Confirm & fund Goal',exact:true}).click();await dialog.waitFor({state:'hidden'});
 const allocation=await openModule(page,'allocate');await allocation.getByText(`Allocated to this Goal: ${goal.type==='Value'?'200 USD':'2 BTC'}`,{exact:true}).waitFor();
 const original=await timeline(page,'contribution');expect(original).toHaveLength(1);expect(original[0].detail).toContain(`Fictional original ${goal.type} receipt`);
 const overview=await page.getByTestId('tracked-progress').textContent();const allocationText=await allocation.locator('.platform-position-row').first().textContent();
 await page.getByRole('button',{name:'Reverse history entry',exact:true}).click();const correction=page.getByRole('dialog',{name:'Review history correction',exact:true});await correction.getByRole('button',{name:'Cancel history correction',exact:true}).click();expect(await timeline(page,'contribution')).toEqual(original);
 await page.getByRole('button',{name:'Reverse history entry',exact:true}).click();await correction.getByRole('button',{name:'Confirm history reversal',exact:true}).click();await correction.waitFor({state:'hidden'});
 const reversed=await timeline(page,'reversal');expect(reversed).toHaveLength(1);/* Session AL (DV-038b, deliberate): the reversal names the record it corrects in words, by that contribution's time ("Recorded at" without its seconds), not by its id */expect(reversed[0].detail.at(-1)).toBe(`The contribution of ${original[0].detail[1].replace(/(\d{1,2}:\d{2}):\d{2}/,'$1')}`);expect(reversed[0].detail).toContain(goal.type==='Value'?'200 USD':'2 BTC');
 expect(await timeline(page,'contribution')).toEqual(original);expect(await page.getByTestId('tracked-progress').textContent()).toBe(overview);expect(await allocation.locator('.platform-position-row').first().textContent()).toBe(allocationText);
 return {original,reversed,allocationText};
}
async function projectProgress(page){
 expect(await page.getByRole('button',{name:'Fund Goal',exact:true}).count()).toBe(0);expect(await page.locator('#contribution-plan,#allocate').count()).toBe(0);
 /* Session AL (DV-019f/DV-040b, deliberate): one milestone reads "1 milestone" (lib/goals/goal-units.ts unitAmount) */const milestones=await openModule(page,'milestones'),first=milestones.getByLabel('Fictional research review',{exact:true}),second=milestones.getByLabel('Fictional delivery review',{exact:true});
 await first.click();await page.getByTestId('tracked-progress').locator('.goal-detail-current').filter({hasText:/^1 milestone$/}).waitFor();const initial=await timeline(page,'milestone');expect(initial).toHaveLength(1);
 await first.click();await page.getByTestId('tracked-progress').locator('.goal-detail-current').filter({hasText:/^0 milestones$/}).waitFor();await second.click();await page.getByTestId('tracked-progress').locator('.goal-detail-current').filter({hasText:/^1 milestone$/}).waitFor();
 const changes=await timeline(page,'milestone');expect(changes).toHaveLength(3);expect(changes).toContainEqual(initial[0]);expect(await first.isChecked()).toBe(false);expect(await second.isChecked()).toBe(true);return {changes};
}
export async function verifyPackagedGoalJourneys(a,b,evidenceDir){
 const results=[];
 for(const type of ['Value','Quantity','Project']){
  const goal=await create(a,type),evidence=type==='Project'?await projectProgress(a):await fund(a,goal);
  await pinGoalAndHabit(a,goal.name,goal.path,goal.habit);await a.screenshot({path:`${evidenceDir}/goal-${type.toLowerCase()}-desktop.png`,mask:[a.getByLabel(/recovery secret/i)],maskColor:'#FF00FF'});await sync(a);await sync(b);await openGoal(b,goal.name,goal.path);
  const supporting=await openModule(b,'supporting-habits');await supporting.getByRole('heading',{name:goal.habit,exact:true}).waitFor();
  if(type==='Project'){
   expect(await b.getByRole('button',{name:'Fund Goal',exact:true}).count()).toBe(0);expect(await b.locator('#contribution-plan,#allocate').count()).toBe(0);const milestones=await openModule(b,'milestones');expect(await milestones.getByLabel('Fictional research review',{exact:true}).isChecked()).toBe(false);expect(await milestones.getByLabel('Fictional delivery review',{exact:true}).isChecked()).toBe(true);expect(await timeline(b,'milestone')).toEqual(evidence.changes);
  }else{
   const plan=await openModule(b,'contribution-plan');expect(await plan.getByLabel('Planned amount',{exact:true}).inputValue()).toBe(type==='Value'?'50':'1');expect(await plan.getByLabel('Contribution asset',{exact:true}).inputValue()).toBe(type==='Value'?'USD':'BTC');
   const allocation=await openModule(b,'allocate');expect(await allocation.locator('.platform-position-row').first().textContent()).toBe(evidence.allocationText);expect(await timeline(b,'contribution')).toEqual(evidence.original);expect(await timeline(b,'reversal')).toEqual(evidence.reversed);
  }
  await b.screenshot({path:`${evidenceDir}/goal-${type.toLowerCase()}-mobile-history.png`,mask:[b.getByLabel(/recovery secret/i)],maskColor:'#FF00FF'});await navigate(b,'Today');await (await todayCard(b,goal.name)).waitFor();await (await todayCard(b,goal.habit)).waitFor();expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  results.push({...goal,...evidence,secondProfileHistoryEqual:true,todayGoalAndHabitReceived:true,financialContribution:type!=='Project'});
 }
 await writeFile(`${evidenceDir}/goal-journeys.json`,JSON.stringify({criteria:'GOAL-06',generatedApplication:true,mutationPath:'visible UI only',projectSemantics:'Milestone changes and linked weekly review Habit; no financial plan, allocation or contribution controls.',journeys:results},null,2));return results;
}

// Source-preview pass catches UI failures before regenerating the package.
// It does not substitute for the independent-client packaged test above.
export async function verifySourceGoalControls(page,evidenceDir){
 const results=[];
 for(const type of ['Value','Quantity','Project']){
  const goal=await create(page,type),evidence=type==='Project'?await projectProgress(page):await fund(page,goal);
  await pinGoalAndHabit(page,goal.name,goal.path,goal.habit);await openGoal(page,goal.name,goal.path);
  if(type==='Project')expect(await timeline(page,'milestone')).toEqual(evidence.changes);
  else{expect(await timeline(page,'contribution')).toEqual(evidence.original);expect(await timeline(page,'reversal')).toEqual(evidence.reversed);}
  results.push({...goal,...evidence});
 }
 await writeFile(`${evidenceDir}/source-goal-controls.json`,JSON.stringify({sourcePreviewOnly:true,journeys:results},null,2));
}
