/**
 * A page's default block order on a phone (Session E). Items named in `first` come first, in that order; the rest keep
 * their order after them. Only the default changes: an order the person saved on this device still wins, because
 * LayoutRegion resolves saved orders from item ids, and other screens keep their own default.
 */
export function phoneOrder<T extends { id: string } | false>(phone: boolean, items: T[], first: string[]): T[] {
  if (!phone) return items;
  const rank = (item: T) => {
    const index = item ? first.indexOf(item.id) : -1;
    return index < 0 ? first.length : index;
  };
  return items.map((item, index) => ({ item, index })).sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index).map(({ item }) => item);
}
