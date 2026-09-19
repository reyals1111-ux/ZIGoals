/** Decorative Goal identity only. Never communicates financial health. */
const palettes=[['#23eaff','#459dff'],['#459dff','#9273ff'],['#9273ff','#ff74be'],['#f06dff','#9273ff'],['#23eaff','#26e8bd']] as const;
export function goalPalette(id:string){let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))%104729;return palettes[hash%palettes.length]!;}
