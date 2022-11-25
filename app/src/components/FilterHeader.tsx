
//multiple eq rules for same column are OR (unless gt & lt both specified, then search in range). So can show mids or lows.
//So string col with allowed vals H/M/L, have multiple EQ rules to allow different heights
//But list col with possible tags LH/TC/TJ/UB, use contains rule for each val it can contain. EQ doesn't make sense I guess.
//String col contains does substring search
//rules for different columns are AND
export interface FilterRule {
  columnName: string;
  operator: "gt" | "lt" | "eq" | "contains"; //column's relation to value
  value: number | string;
}
export interface SortRule {
  columnName: string;
  operator: "asc" | "desc"; //for numeric strings, allowed values array explains how strings are ordered relative to numbers
}
export interface FilterSortRules {
  filterRules: FilterRule[];
  sortRule?: SortRule;
}


  //TODO: make this a hook? [moveOrder, filters, setFilters] = useFilterSort(baseDoc, changeDoc)
  //Each segment has independent filters that stay over segment switches. Best not to use in Edit, will just confuse ppl.
  //FilterHeader component shows searchbar, indicator of active filters, modal button

