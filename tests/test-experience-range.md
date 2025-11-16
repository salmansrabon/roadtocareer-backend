# Experience Range Query Testing

## Current SQL Logic

When `minExperience = 2` and `maxExperience = 4`:

```sql
CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) >= 2 
AND 
CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) <= 4
```

## Expected Behavior

This query should return students with:
- ✅ totalExperience = "2" (2.0)
- ✅ totalExperience = "2.5" (2.5)
- ✅ totalExperience = "3" (3.0)
- ✅ totalExperience = "3.5" (3.5)
- ✅ totalExperience = "4" (4.0)
- ❌ totalExperience = "1.5" (< 2)
- ❌ totalExperience = "4.5" (> 4)
- ❌ totalExperience = "5" (> 4)

## Verification

The SQL uses:
- `>=` (greater than or equal to) for minimum
- `<=` (less than or equal to) for maximum

This is CORRECT for inclusive range queries.

## Potential Issues

1. **Data Format**: If totalExperience is stored as "2 years" instead of "2", the CAST will fail
2. **Null/Empty Values**: Query properly checks for NULL and empty strings
3. **Decimal Values**: Query properly handles decimal values like "2.5"

## Test Cases

### Test 1: Range Query (2-4 years)
- Query: `experience=2&maxExperience=4`
- Expected: Returns candidates with 2, 2.5, 3, 3.5, or 4 years experience
- SQL: `totalExperience >= 2 AND totalExperience <= 4`

### Test 2: Minimum Only (2+ years)
- Query: `experience=2`
- Expected: Returns candidates with 2 or more years experience
- SQL: `totalExperience >= 2`

### Test 3: Maximum Only (up to 4 years)
- Query: `maxExperience=4`
- Expected: Returns candidates with 4 or fewer years experience
- SQL: `totalExperience <= 4`

## Recommendation

The query logic is CORRECT. If the range is not working:
1. Check database data format for totalExperience field
2. Verify the field contains numeric values (not "2 years")
3. Test with SQL query directly on database
