import { test, expect } from "@playwright/test";
import { toBech32 } from "@cosmjs/encoding";
const sentinel = "PRIVATE_SENTINEL_7cc2a9";
test("strict production headers, fresh nonce, navigation and script rejection", async ({page,request}) => {
  const errors:string[]=[]; page.on("pageerror",e=>errors.push(e.message));
  const response=await page.goto("/app");
  const h=response!.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/]+=*' 'strict-dynamic'/);
  expect(h["content-security-policy"]!.split(";").find(s=>s.includes("script-src"))).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(h["x-frame-options"]).toBe("DENY"); expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("no-referrer"); expect(h["cache-control"]).toContain("no-store");
  expect(h["x-robots-tag"]).toContain("noindex");
  const socialUrl = new URL("/social-card.png", response!.url());
  // NextURL intentionally normalizes loopback addresses to localhost.
  if (socialUrl.hostname === "127.0.0.1") socialUrl.hostname = "localhost";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", socialUrl.href);
  const other=await request.get("/app"); expect(other.headers()["content-security-policy"]).not.toBe(h["content-security-policy"]);
  expect(await page.locator("script").evaluateAll(nodes=>nodes.every(n=>((n as HTMLScriptElement).nonce?.length ?? 0)>0))).toBe(true);
  // Inject into the received HTML: DevTools evaluate-created scripts are privileged.
  await page.route("**/app?injection-probe=1", async route => {
    const response = await route.fetch();
    await route.fulfill({response,body:(await response.text()).replace("<head>","<head><script>window.__untrustedScript = true</script>")});
  });
  await page.goto("/app?injection-probe=1");
  expect(await page.evaluate(()=>Reflect.get(window,"__untrustedScript"))).toBeUndefined();
  await page.getByRole("link",{name:"Settings",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Your data. Your control."})).toBeVisible();
  await expect(page.locator(".network-banner")).toContainText("No blockchain transactions or financial signatures");
  expect(await page.locator('a[target="_blank"]').evaluateAll(nodes=>nodes.every(n=>n.getAttribute("rel")?.includes("noopener")&&n.getAttribute("rel")?.includes("noreferrer")))).toBe(true);
  expect(errors).toEqual([]);
});

test("private lifecycle, backup, diagnostics and connection remain bounded under production CSP", async ({page},info) => {
  await page.setViewportSize({width:320,height:568}); await page.emulateMedia({reducedMotion:"reduce"});
  const egress:string[]=[];const errors:string[]=[];
  page.on("request",r=>egress.push(JSON.stringify({url:r.url(),headers:r.headers(),body:r.postData()})));
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("https://testnet-**.zigchain.com/**",async route=>{
    const url=route.request().url();
    expect(route.request().method()).toBe("GET");
    const json=url.endsWith("/status")?{result:{node_info:{network:"zig-test-2"},sync_info:{catching_up:false,latest_block_height:"77",latest_block_time:new Date().toISOString()}}}:url.includes("node_info")?{default_node_info:{network:"zig-test-2"},application_version:{version:"v5.0.0-patch-1"}}:url.includes("staking")?{params:{bond_denom:"azig"}}:url.includes("balances")?{balance:{denom:"azig",amount:"0"}}:{metadata:{base:"azig",display:"ZIG",denom_units:[{denom:"ZIG",exponent:18}]}};
    await route.fulfill({json});
  });
  // App injection boundary only: addInitScript bypasses CSP and is not proof of real extension compatibility.
  await page.addInitScript(({owner})=>{
    Reflect.set(window,"signerCalls",0);
    Object.assign(window,{keplr:{experimentalSuggestChain:async()=>{},enable:async()=>{},getKey:async()=>({bech32Address:owner}),getOfflineSignerAuto:async()=>{Reflect.set(window,"signerCalls",1);throw Error("No signer allowed");}}});
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw Error("Unavailable");}}});
  },{owner:toBech32("zig",new Uint8Array(20).fill(7))});
  await page.goto("/app/goals/new");
  await page.getByRole("button",{name:"Travel",exact:true}).click(); await page.getByRole("button",{name:"Continue"}).click();
  await page.getByLabel("Private goal name").fill(sentinel); await page.getByLabel("Target amount").fill("1200");
  await page.getByRole("button",{name:"Continue"}).click(); await page.getByRole("button",{name:"Continue"}).click(); await page.getByRole("button",{name:"Continue"}).click();
  await page.getByRole("button",{name:"Create goal",exact:true}).click();
  await page.getByRole("button",{name:"Confirm simulation"}).focus(); await page.keyboard.press("Tab"); await expect(page.getByRole("button",{name:"Cancel",exact:true})).toBeFocused();
  await page.getByRole("button",{name:"Confirm simulation"}).click();
  await expect(page.getByRole("heading",{name:sentinel})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByLabel("Amount in ZIG").fill("10"); await page.getByRole("button",{name:"Add funds",exact:true}).click(); await page.getByRole("button",{name:"Confirm simulation"}).click();
  await page.getByLabel("Amount in ZIG").fill("10"); await page.getByRole("button",{name:"Withdraw",exact:true}).click(); await page.getByRole("button",{name:"Confirm simulation"}).click();
  await page.getByRole("link",{name:"Settings",exact:true}).click();
  const downloaded=page.waitForEvent("download"); await page.getByRole("button",{name:"Export Goal Data"}).click(); await downloaded;
  const backup=await page.evaluate(()=>localStorage.getItem("zigoals:metadata:v1:local-simulation:local-demo-user")!);
  const edited=JSON.parse(backup); edited.goals["1"].name=sentinel+"_EDIT"; edited.goals["1"].notes=sentinel+"_NOTE";
  await page.getByLabel("Or paste backup JSON").fill(JSON.stringify(edited)); await page.getByRole("button",{name:"Import backup"}).click();
  await page.getByRole("button",{name:"Check connection"}).click(); await expect(page.getByText("Verified zig-test-2 · height 77")).toBeVisible();
  await page.getByRole("button",{name:"Copy safe diagnostics"}).click();
  const safe=page.getByLabel("Safe diagnostic summary"); await expect(safe).toBeVisible(); expect(await safe.inputValue()).not.toContain(sentinel);
  await page.goto("/app/goals/1"); await expect(page.getByRole("heading",{name:sentinel+"_EDIT"})).toBeVisible();
  await page.getByRole("button",{name:"Close empty goal"}).click(); await page.getByRole("button",{name:"Confirm simulation"}).click();
  await page.getByRole("button",{name:"Connect Keplr"}).click(); await expect(page.locator(".mode-strip")).toContainText("CONNECTION ONLY");
  expect(await page.evaluate(()=>Reflect.get(window,"signerCalls"))).toBe(0);
  expect(egress.join("\n")).not.toContain(sentinel);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`/tmp/zigoals-m4-alpha-${info.project.name}-320.png`,fullPage:true});
  expect(errors).toEqual([]);
});
