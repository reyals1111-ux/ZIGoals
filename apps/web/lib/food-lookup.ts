import * as z from 'zod';
export function normalizeBarcode(input:string){const value=input.trim();if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value))throw Error('Enter an 8, 12, 13 or 14 digit product barcode.');const significant=value.replace(/^0+/, '')||'0';return significant.length<=8?significant.padStart(8,'0'):significant.length<=13?significant.padStart(13,'0'):significant;}
const nutrient=z.number().finite().min(0).max(1_000_000);
export const foodProductSchema=z.object({barcode:z.string(),name:z.string().min(1).max(120),brand:z.string().max(80),basis:z.literal('unverified-100g-or-100ml'),nutrients:z.object({kcal:nutrient.nullable(),proteinMg:nutrient.max(1_000_000_000).nullable(),carbsMg:nutrient.max(1_000_000_000).nullable(),fatMg:nutrient.max(1_000_000_000).nullable()}).strict(),source:z.literal('Open Food Facts'),apiVersion:z.literal('3.4'),observedAt:z.iso.datetime()}).strict();
export type FoodProduct=z.infer<typeof foodProductSchema>;
/** Pin the documented pre3.5 nutrition representation;3.6 changed nutrition/tags. No guessed conversion. */
export function parseOpenFoodFactsProduct(raw:unknown,barcode:string,now=new Date().toISOString()):FoodProduct{
 const response=z.object({status:z.enum(['success','success_with_warnings','success_with_errors','failure']),product:z.object({code:z.string(),product_name:z.string().max(1000).optional(),brands_tags:z.array(z.string().max(200)).max(100).optional(),nutrition_data_per:z.string().optional(),nutriments:z.record(z.string(),z.unknown()).optional()}).optional()}).parse(raw);
 if(response.status==='failure'||!response.product)throw Error('Product not found. Add a private custom food instead.');const p=response.product;
 if(normalizeBarcode(p.code)!==normalizeBarcode(barcode))throw Error('Product identity does not match the requested barcode.');
 const n=p.nutriments??{};const amount=(key:string,scale:number)=>{const v=n[key];return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1_000_000?Math.round(v*scale):null;};
 // Only explicit _100g values are supported, regardless of the package serving label.
 return foodProductSchema.parse({barcode:normalizeBarcode(barcode),name:p.product_name?.trim().slice(0,120)||'Unnamed product',brand:(p.brands_tags??[]).map(s=>s.replace(/^xx:/,'')).join(', ').slice(0,80),basis:'unverified-100g-or-100ml',nutrients:{kcal:amount('energy-kcal_100g',1),proteinMg:amount('proteins_100g',1000),carbsMg:amount('carbohydrates_100g',1000),fatMg:amount('fat_100g',1000)},source:'Open Food Facts',apiVersion:'3.4',observedAt:now});
}
/**
 * Session AK (Part 1b): a barcode Open Food Facts does not know may be answered by USDA FoodData Central Branded Foods
 * (the food Worker asks FDC only after Open Food Facts said "not found", and only with the owner's FDC_API_KEY). Every
 * /lookup success names its source:
 * - Open Food Facts: the provider's own answer with `source`, `attribution` and `link` added beside `status` and `product`;
 *   parsed exactly as before (those three are not read), into a FoodProduct.
 * - USDA FoodData Central: the Worker's normalised answer
 *   `{source:'USDA FoodData Central', attribution, link, licence:'CC0-1.0', product:{code, gtinUpc, fdcId, name, brand,
 *   basis:'per-100g-or-100ml', labelUnit:'g'|'ml'|null, nutrients:{kcal, proteinMg … folateUg}}}`: kcal and gram nutrients
 *   as whole kcal and mg, minerals in mg and vitamins in µg or mg with up to three decimals, null when unknown (never 0).
 *   Parsed into a BrandedFoodProduct: the app's nutrition fields (whole numbers, absent when unknown) and the app's
 *   vitamins (thousandths of their unit, health-vitamins/schema.ts), with the citation FDC asks for.
 */
export const FDC_SOURCE='USDA FoodData Central';
export const FDC_ATTRIBUTION='U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov.';
export const FDC_LINK='https://fdc.nal.usda.gov/';
/** One product, 8 to 14 digits, as its 14-digit GTIN: leading zeros between UPC-A, EAN-13 and GTIN-14 do not matter. */
export const gtin14=(code:string)=>code.padStart(14,'0');
const amountOrNull=(max:number)=>z.number().finite().min(0).max(max).nullable();
const g=amountOrNull(100_000),mineral=amountOrNull(100_000),ug=amountOrNull(100_000_000);
const fdcAnswerSchema=z.strictObject({source:z.literal(FDC_SOURCE),attribution:z.literal(FDC_ATTRIBUTION),link:z.literal(FDC_LINK),licence:z.literal('CC0-1.0'),product:z.strictObject({
 code:z.string().regex(/^\d{8,14}$/),gtinUpc:z.string().regex(/^\d{8,14}$/),fdcId:z.number().int().positive().max(2**31),name:z.string().min(1).max(120),brand:z.string().max(80),basis:z.literal('per-100g-or-100ml'),labelUnit:z.enum(['g','ml']).nullable(),
 nutrients:z.strictObject({kcal:amountOrNull(1000),proteinMg:g,carbsMg:g,fatMg:g,fiberMg:g,sugarMg:g,saturatedFatMg:g,sodiumMg:mineral,potassiumMg:mineral,calciumMg:mineral,ironMg:mineral,magnesiumMg:mineral,zincMg:mineral,vitaminAUg:ug,vitaminCMg:mineral,vitaminDUg:ug,vitaminEMg:mineral,vitaminKUg:ug,vitaminB12Ug:ug,folateUg:ug}),
})});
const whole=(max:number)=>z.number().int().min(0).max(max);
const optionalMg=whole(1_000_000_000).optional(),vitamin=whole(1_000_000_000).optional();
export const brandedFoodProductSchema=z.strictObject({barcode:z.string(),name:z.string().min(1).max(120),brand:z.string().max(80),basis:z.literal('unverified-100g-or-100ml'),labelUnit:z.enum(['g','ml']).nullable(),
 nutrients:z.strictObject({kcal:whole(1_000_000).nullable(),proteinMg:whole(1_000_000_000).nullable(),carbsMg:whole(1_000_000_000).nullable(),fatMg:whole(1_000_000_000).nullable(),fiberMg:optionalMg,sugarMg:optionalMg,saturatedFatMg:optionalMg,sodiumMg:optionalMg,potassiumMg:optionalMg,calciumMg:optionalMg,ironMg:optionalMg}),
 vitamins:z.strictObject({aUg:vitamin,cMg:vitamin,dUg:vitamin,eMg:vitamin,kUg:vitamin,b12Ug:vitamin,folateUg:vitamin}),
 source:z.literal(FDC_SOURCE),fdcId:z.number().int().positive(),attribution:z.literal(FDC_ATTRIBUTION),link:z.literal(FDC_LINK),licence:z.literal('CC0-1.0'),observedAt:z.iso.datetime()});
export type BrandedFoodProduct=z.infer<typeof brandedFoodProductSchema>;
/** Either answer of the /api/food-lookup barcode route, told apart by `source`. */
export const lookupProductSchema=z.discriminatedUnion('source',[foodProductSchema,brandedFoodProductSchema]);
export type LookupProduct=z.infer<typeof lookupProductSchema>;
const isFdcAnswer=(raw:unknown)=>!!raw&&typeof raw==='object'&&(raw as {source?:unknown}).source===FDC_SOURCE;
/** The Worker's FDC answer for this barcode, or an error; the GTIN must be the requested product's. */
export function parseBrandedFood(raw:unknown,barcode:string,now=new Date().toISOString()):BrandedFoodProduct{
 const {product:p,...about}=fdcAnswerSchema.parse(raw);const requested=normalizeBarcode(barcode);
 if(normalizeBarcode(p.code)!==requested||gtin14(p.gtinUpc)!==gtin14(requested))throw Error('Product identity does not match the requested barcode.');
 const n=p.nutrients,round=(v:number|null)=>v===null?null:Math.round(v);
 const optional=<K extends string>(entries:[K,number|null][])=>Object.fromEntries(entries.filter((e):e is [K,number]=>e[1]!==null)) as Partial<Record<K,number>>;
 return brandedFoodProductSchema.parse({barcode:requested,name:p.name,brand:p.brand,basis:'unverified-100g-or-100ml',labelUnit:p.labelUnit,
  nutrients:{kcal:round(n.kcal),proteinMg:round(n.proteinMg),carbsMg:round(n.carbsMg),fatMg:round(n.fatMg),...optional(([['fiberMg',n.fiberMg],['sugarMg',n.sugarMg],['saturatedFatMg',n.saturatedFatMg],['sodiumMg',n.sodiumMg],['potassiumMg',n.potassiumMg],['calciumMg',n.calciumMg],['ironMg',n.ironMg]] as const).map(([k,v])=>[k,round(v)] as [typeof k,number|null]))},
  // The app keeps vitamins in thousandths of their unit (900 µg is 900000).
  vitamins:optional(([['aUg',n.vitaminAUg],['cMg',n.vitaminCMg],['dUg',n.vitaminDUg],['eMg',n.vitaminEMg],['kUg',n.vitaminKUg],['b12Ug',n.vitaminB12Ug],['folateUg',n.folateUg]] as const).map(([k,v])=>[k,v===null?null:Math.round(v*1000)] as [typeof k,number|null])),
  source:about.source,fdcId:p.fdcId,attribution:about.attribution,link:about.link,licence:about.licence,observedAt:now});
}
/** Either answer of the food Worker's /lookup (the barcode route's parser): FDC's normalised answer, or Open Food Facts'
 * own, parsed exactly as before Session AK (parseOpenFoodFactsProduct). */
export function parseFoodProduct(raw:unknown,barcode:string,now=new Date().toISOString()):LookupProduct{
 return isFdcAnswer(raw)?parseBrandedFood(raw,barcode,now):parseOpenFoodFactsProduct(raw,barcode,now);
}
