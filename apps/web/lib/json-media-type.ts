/** Compare the media type independently of harmless parameters such as charset. */
export function isJsonMediaType(value:string|null):boolean {
 const media=value?.split(';',1)[0]?.trim().toLowerCase();
 return !!media&&(media==='application/json'||/^application\/[a-z0-9!#$&^_.+-]+\+json$/.test(media));
}
