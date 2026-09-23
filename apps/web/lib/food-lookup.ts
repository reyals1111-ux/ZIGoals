import {z} from 'zod';
export function normalizeBarcode(input:string){const value=input.trim();if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value))throw Error('Enter an 8, 12, 13 or 14 digit product barcode.');const significant=value.replace(/^0+/, '')||'0';return significant.length<=8?significant.padStart(8,'0'):significant.length<=13?significant.padStart(13,'0'):significant;}
const nutrient=z.number().finite().min(0).max(1_000_000);
export const foodProductSchema=z.object({barcode:z.string(),name:z.string().min(1).max(120),brand:z.string().max(80),basis:z.literal('unverified-100g-or-100ml'),nutrients:z.object({kcal:nutrient.nullable(),proteinMg:nutrient.max(1_000_000_000).nullable(),carbsMg:nutrient.max(1_000_000_000).nullable(),fatMg:nutrient.max(1_000_000_000).nullable()}).strict(),source:z.literal('Open Food Facts'),apiVersion:z.literal('3.4'),observedAt:z.iso.datetime()}).strict();
export type FoodProduct=z.infer<typeof foodProductSchema>;
/** Pin the documented pre3.5 nutrition representation;3.6 changed nutrition/tags. No guessed conversion. */
export function parseFoodProduct(raw:unknown,barcode:string,now=new Date().toISOString()):FoodProduct{
 const response=z.object({status:z.enum(['success','success_with_warnings','success_with_errors','failure']),product:z.object({code:z.string(),product_name:z.string().max(1000).optional(),brands_tags:z.array(z.string().max(200)).max(100).optional(),nutrition_data_per:z.string().optional(),nutriments:z.record(z.string(),z.unknown()).optional()}).optional()}).parse(raw);
 if(response.status==='failure'||!response.product)throw Error('Product not found. Add a private custom food instead.');const p=response.product;
 if(normalizeBarcode(p.code)!==normalizeBarcode(barcode))throw Error('Product identity does not match the requested barcode.');
 const n=p.nutriments??{};const amount=(key:string,scale:number)=>{const v=n[key];return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1_000_000?Math.round(v*scale):null;};
 // Only explicit _100g values are supported, regardless of the package serving label.
 return foodProductSchema.parse({barcode:normalizeBarcode(barcode),name:p.product_name?.trim().slice(0,120)||'Unnamed product',brand:(p.brands_tags??[]).map(s=>s.replace(/^xx:/,'')).join(', ').slice(0,80),basis:'unverified-100g-or-100ml',nutrients:{kcal:amount('energy-kcal_100g',1),proteinMg:amount('proteins_100g',1000),carbsMg:amount('carbohydrates_100g',1000),fatMg:amount('fat_100g',1000)},source:'Open Food Facts',apiVersion:'3.4',observedAt:now});
}
