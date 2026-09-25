import {expect,it} from 'vitest';
import {directoryEntries,filterDirectory,directoryCategories} from './directory';
import {ecosystemProviders} from './providers';
import {canExecuteProvider,isSafeReferenceUrl} from './index';
it('covers every existing record once and keeps research outside execution',()=>{
 expect(directoryEntries.map(p=>p.id).sort()).toEqual(ecosystemProviders.map(p=>p.id).sort());
 expect(new Set(directoryEntries.map(p=>p.id)).size).toBe(directoryEntries.length);
 expect(ecosystemProviders.every(p=>!canExecuteProvider(p))).toBe(true);
});
it('searches names, category and descriptions together with a category filter',()=>{
 expect(filterDirectory(directoryEntries,'  ORO  ','All').map(p=>p.id)).toEqual(['oroswap']);
 expect(filterDirectory(directoryEntries,'','Staking & vaults').some(p=>p.id==='valdora')).toBe(true);
 expect(filterDirectory(directoryEntries,'oroswap','Network tools')).toEqual([]);
 expect(filterDirectory(directoryEntries,'zzzz-no-such-provider','All')).toEqual([]);
 expect(directoryCategories).toContain('Network tools');
});
it('retains dated attribution, bounded local icon metadata and verified-only actions without private parameters',()=>{
 expect(directoryEntries.filter(p=>p.logo.kind==='raster')).toHaveLength(16);
 expect(directoryEntries.filter(p=>p.logo.kind==='initials').map(p=>p.id).sort()).toEqual(['wme','zigchain-hub']);
 for(const p of directoryEntries){expect(p.reviewedAt).toBe('2026-09-23');expect(p.description.length).toBeLessThan(260);expect(isSafeReferenceUrl(p.descriptionSource)).toBe(true);expect(p.logo.reason.length).toBeGreaterThan(10);expect(isSafeReferenceUrl(p.logo.source)).toBe(true);
 if(p.logo.kind==='raster')expect(p.logo.path).toBe(`/ecosystem-logos/${p.id}.png`);else expect(p.logo.path).toBeUndefined();
 for(const a of p.actions){expect(isSafeReferenceUrl(a.url)).toBe(true);expect(new URL(a.url).search).toBe('');expect(a.evidence).toMatch(/^https:/);}}
 expect(directoryEntries.find(p=>p.id==='permapod')?.linkStatus).toBe('Unavailable in review');
 expect(directoryEntries.find(p=>p.id==='permapod')?.actions).toEqual([]);
 expect(directoryEntries.find(p=>p.id==='oroswap')?.actions.map(a=>a.kind)).toEqual(['Website','App','Docs']);
});
it('coverage manifest accounts for every card and every separately discovered candidate',async()=>{
 const {default:manifest}=await import('../../../docs/run10/ECOSYSTEM_COVERAGE.json');
 expect(manifest.candidateCount).toBe(manifest.entries.length);expect(manifest.searchableProviderCount).toBe(directoryEntries.length);
 expect(directoryEntries.every(p=>manifest.entries.some(e=>e.id===p.id))).toBe(true);
 const {directoryResources}=await import('./directory');for(const r of directoryResources){expect(isSafeReferenceUrl(r.url)).toBe(true);expect(new URL(r.url).search).toBe('');expect(isSafeReferenceUrl(r.source)).toBe(true);}
});
