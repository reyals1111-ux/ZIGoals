// Real visible UI against the caller's generated app and local Worker topology.
// Project progress is milestones, so it deliberately has no financial funding.
import {expect} from 'vitest';
import {writeFile} from 'node:fs/promises';
import {waitPackagedSync} from './packaged-consumer-journey.mjs';
const navigate=async(page,name)=>{await page.getByRole('link',{name,exact:true}).first().click();};
async function openModule(page,id){const section=page.locator('#'+id);if(await section.getAttribute('open')===null)await section.locator('summary').first().click();return section;}
async function sync(page){await navigate(page,'Settings');await page.getByRole('button',{name:'Sync now',exact:true}).click();await waitPackagedSync(page);}
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
 await habitCard.getByRole('button',{name:`Options for ${habit}`,exact:true}).click();await habitCard.getByRole('button',{name:`Add ${habit} today to Today`,exact:true}).click();
 await navigate(page,'Today');await page.getByRole('article',{name,exact:true}).waitFor();await page.getByRole('article',{name:habit,exact:true}).waitFor();
}
async function create(page,type){
 const name=`Packaged ${type} continuity`;
 await navigate(page,'Today');await page.getByRole('link',{name:'+ Create a goal',exact:true}).click();
 await page.getByLabel('Goal name',{exact:true}).fill(name);await page.getByRole('radio',{name:type,exact:true}).check();
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
 await page.getByRole('button',{name:'Fund Goal',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Fund your Goal',exact:true});
 if(goal.type==='Value'){await dialog.getByRole('button',{name:'Cash',exact:true}).click();await dialog.getByLabel('Asset name',{exact:true}).fill('Fictional Value continuity cash');await dialog.getByLabel('Cash amount',{exact:true}).fill('200');}
 else{await dialog.getByRole('button',{name:'Crypto',exact:true}).click();await dialog.getByLabel('Search assets',{exact:true}).fill('fictional-unlisted-manual-position');await dialog.getByRole('button',{name:/^(Add it manually|Use manual entry)$/}).click();await dialog.getByLabel('Asset name',{exact:true}).fill('Fictional Quantity continuity BTC');await dialog.getByLabel('Symbol / ticker',{exact:true}).fill('BTC');await dialog.getByLabel('Quantity',{exact:true}).fill('2');await dialog.getByLabel('Total holding value',{exact:true}).fill('200');}
 await dialog.getByRole('button',{name:'Continue with this asset',exact:true}).click();await dialog.getByLabel('Note (optional)',{exact:true}).fill(`Fictional original ${goal.type} receipt`);await dialog.getByRole('button',{name:'Preview contribution',exact:true}).click();expect(await dialog.textContent()).toContain('One contribution record will be added.');await dialog.getByRole('button',{name:'Confirm & fund Goal',exact:true}).click();await dialog.waitFor({state:'hidden'});
 const allocation=await openModule(page,'allocate');await allocation.getByText(`Allocated to this Goal: ${goal.type==='Value'?'200 USD':'2 BTC'}`,{exact:true}).waitFor();
 const original=await timeline(page,'contribution');expect(original).toHaveLength(1);expect(original[0].detail).toContain(`Fictional original ${goal.type} receipt`);
 const overview=await page.getByTestId('tracked-progress').textContent();const allocationText=await allocation.locator('.platform-position-row').first().textContent();
 await page.getByRole('button',{name:'Reverse history entry',exact:true}).click();const correction=page.getByRole('dialog',{name:'Review history correction',exact:true});await correction.getByRole('button',{name:'Cancel history correction',exact:true}).click();expect(await timeline(page,'contribution')).toEqual(original);
 await page.getByRole('button',{name:'Reverse history entry',exact:true}).click();await correction.getByRole('button',{name:'Confirm history reversal',exact:true}).click();await correction.waitFor({state:'hidden'});
 const reversed=await timeline(page,'reversal');expect(reversed).toHaveLength(1);expect(reversed[0].detail.at(-1)).toBe(original[0].id.replace('goal-event-contribution:',''));expect(reversed[0].detail).toContain(goal.type==='Value'?'200 USD':'2 BTC');
 expect(await timeline(page,'contribution')).toEqual(original);expect(await page.getByTestId('tracked-progress').textContent()).toBe(overview);expect(await allocation.locator('.platform-position-row').first().textContent()).toBe(allocationText);
 return {original,reversed,allocationText};
}
async function projectProgress(page){
 expect(await page.getByRole('button',{name:'Fund Goal',exact:true}).count()).toBe(0);expect(await page.locator('#contribution-plan,#allocate').count()).toBe(0);
 const milestones=await openModule(page,'milestones'),first=milestones.getByLabel('Fictional research review',{exact:true}),second=milestones.getByLabel('Fictional delivery review',{exact:true});
 await first.click();await page.getByTestId('tracked-progress').locator('.goal-detail-current').filter({hasText:/^1 milestones$/}).waitFor();const initial=await timeline(page,'milestone');expect(initial).toHaveLength(1);
 await first.click();await page.getByTestId('tracked-progress').locator('.goal-detail-current').filter({hasText:/^0 milestones$/}).waitFor();await second.click();await page.getByTestId('tracked-progress').locator('.goal-detail-current').filter({hasText:/^1 milestones$/}).waitFor();
 const changes=await timeline(page,'milestone');expect(changes).toHaveLength(3);expect(changes).toContainEqual(initial[0]);expect(await first.isChecked()).toBe(false);expect(await second.isChecked()).toBe(true);return {changes};
}
export async function verifyPackagedGoalJourneys(a,b,evidenceDir){
 const results=[];
 for(const type of ['Value','Quantity','Project']){
  const goal=await create(a,type),evidence=type==='Project'?await projectProgress(a):await fund(a,goal);
  await pinGoalAndHabit(a,goal.name,goal.path,goal.habit);await a.screenshot({path:`${evidenceDir}/goal-${type.toLowerCase()}-desktop.png`});await sync(a);await sync(b);await openGoal(b,goal.name,goal.path);
  const supporting=await openModule(b,'supporting-habits');await supporting.getByRole('heading',{name:goal.habit,exact:true}).waitFor();
  if(type==='Project'){
   expect(await b.getByRole('button',{name:'Fund Goal',exact:true}).count()).toBe(0);expect(await b.locator('#contribution-plan,#allocate').count()).toBe(0);const milestones=await openModule(b,'milestones');expect(await milestones.getByLabel('Fictional research review',{exact:true}).isChecked()).toBe(false);expect(await milestones.getByLabel('Fictional delivery review',{exact:true}).isChecked()).toBe(true);expect(await timeline(b,'milestone')).toEqual(evidence.changes);
  }else{
   const plan=await openModule(b,'contribution-plan');expect(await plan.getByLabel('Planned amount',{exact:true}).inputValue()).toBe(type==='Value'?'50':'1');expect(await plan.getByLabel('Contribution asset',{exact:true}).inputValue()).toBe(type==='Value'?'USD':'BTC');
   const allocation=await openModule(b,'allocate');expect(await allocation.locator('.platform-position-row').first().textContent()).toBe(evidence.allocationText);expect(await timeline(b,'contribution')).toEqual(evidence.original);expect(await timeline(b,'reversal')).toEqual(evidence.reversed);
  }
  await b.screenshot({path:`${evidenceDir}/goal-${type.toLowerCase()}-mobile-history.png`});await navigate(b,'Today');await b.getByRole('article',{name:goal.name,exact:true}).waitFor();await b.getByRole('article',{name:goal.habit,exact:true}).waitFor();expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
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
