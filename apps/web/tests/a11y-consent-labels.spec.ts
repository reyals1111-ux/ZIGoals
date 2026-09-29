import {expect,test,type Page} from '@playwright/test';

// Consent checkboxes in the account/sync flow (2026-09-29 accessibility review).
// The Health consent logic is PR #37's: disabled until the signed-in account is ready. These checks cover only how it is labelled and announced.
const account='10000000-0000-4000-8000-000000000001';
const consentName='Sync my Health records with this account. Turning this off stops Health transfers on this tab; it does not delete existing encrypted cloud copies.';

/** Fixture email access; verification waits for `release()` so the "Finishing sign-in…" window can be inspected. */
async function heldSignIn(page:Page){
 let signedIn=false,release=()=>{},entered=()=>{};const held=new Promise<void>(r=>{release=r;}),inFlight=new Promise<void>(r=>{entered=r;});
 await page.route('**/api/private-account*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()==='GET'){
   if(url.searchParams.get('action')==='status')return route.fulfill({json:signedIn?{signedIn:true,accountId:account}:{signedIn:false}});
   if(url.searchParams.get('action')==='sessions')return route.fulfill({json:{sessions:[]}});
   return route.fulfill({json:{protocol:1,revision:0,manifest:null,records:[],cursor:null}});
  }
  const body=request.postDataJSON();
  if(body.action==='verify'){entered();await held;signedIn=true;return route.fulfill({json:{signedIn:true,accountId:account}});}
  return route.fulfill({json:{message:'Fixture code requested; no email sent.'}});
 });
 await page.goto('/app/settings');
 const consent=page.getByRole('region',{name:'Encrypted account sync',exact:true}).getByRole('checkbox',{name:consentName,exact:true});
 await expect(consent).toBeDisabled();
 await page.getByLabel('Email address',{exact:true}).fill('fixture@example.com');await page.getByRole('button',{name:'Send email code',exact:true}).click();
 await page.getByLabel('Email code',{exact:true}).fill('123456');
 return {consent,verify:async()=>{await page.getByRole('button',{name:'Verify email code',exact:true}).click();await inFlight;},release:()=>release()};
}
/** The label that names a control through its id, not only by wrapping it. */
const explicitLabel=(page:Page,selector:string)=>page.locator(selector).evaluateAll(inputs=>inputs.map(input=>!!input.id&&[...(input as HTMLInputElement).labels??[]].some(label=>label.htmlFor===input.id)));

test('Health consent has an explicit label and says why it is unavailable before sign-in',async({page})=>{
 const {consent}=await heldSignIn(page);
 await expect(consent).toBeDisabled();
 expect(await explicitLabel(page,'#encrypted-sync section[aria-label="Encrypted account sync"] input[type=checkbox]')).toEqual([true]);
 await expect(consent).toHaveAccessibleDescription('Available after you sign in.');
});

test('"Finishing sign-in…" describes the disabled Health consent, and focus continues there once it is enabled',async({page})=>{
 const {consent,verify,release}=await heldSignIn(page);
 await verify();
 await expect(page.getByText('Finishing sign-in…',{exact:true})).toBeVisible();
 await expect(consent).toBeDisabled();
 await expect(consent).toHaveAccessibleDescription('Finishing sign-in…');
 release();
 await expect(consent).toBeEnabled();
 await expect(page.getByText('Finishing sign-in…',{exact:true})).toHaveCount(0);
 await expect(consent).toHaveAccessibleDescription('');
 // The email form that held focus is gone; focus continues at the newly offered consent instead of falling to <body>.
 await expect(consent).toBeFocused();
 await expect(consent).not.toBeChecked();
});

test('enabling Health consent does not take focus the user placed elsewhere',async({page})=>{
 const {consent,verify,release}=await heldSignIn(page);
 await verify();
 const elsewhere=page.getByRole('button',{name:'Load Showcase Demo',exact:true});
 await elsewhere.focus();await expect(elsewhere).toBeFocused();
 release();
 await expect(consent).toBeEnabled();
 await expect(page.getByRole('button',{name:'Create encrypted account vault'})).toBeVisible();
 await expect(elsewhere).toBeFocused();
});
