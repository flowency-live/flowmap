# Team Demand & Capacity Roadmap

## What this is

A tracker for cross-team initiatives. Each **initiative** (a client, product area, or business line) decomposes into **child items** (specific pieces of work). Every child item has a **status per team**, and the parent's status per team rolls up automatically.

## Structure

```
Initiative (parent row)
├── Child item 1  →  status for each of 6 teams
├── Child item 2  →  status for each of 6 teams
└── Child item 3  →  status for each of 6 teams
```

Parents never have their status typed directly — the spreadsheet computes it from the children.

## Teams

Six delivery teams, each assigned independent status per work item:

| Code | Name |
|------|------|
| UPJ   | UPJ |
| UIE   | UIE |
| UNC   | UNC |
| Logan | Logan |
| DataE | Data Engineering |
| DataS | Data Science |

## Status values

Eight status values. Each cell in a team column takes one of these.

| Status | Meaning | Background | Text |
|--------|---------|-----------|------|
| **N/A**         | Not applicable — team has nothing to do on this item | #D9D9D9 grey | #595959 |
| **N/S**         | Not started — known work, will be picked up later    | #FFD7A8 orange | #9C5700 |
| **Discovery**   | Started but still being explored / not yet sized     | #FFF2CC yellow | #7F6000 |
| **Ready**       | Sized and ready to start; waiting for scheduling     | #FFF2CC yellow | #006100 green |
| **Constrained** | Work ready but team lacks capacity to start          | #E4D7F5 purple | #5B2C87 |
| **Doing**       | Actively in progress                                  | #BDD7EE blue | #1F3864 |
| **Done**        | Complete                                              | #C6EFCE green | #006100 |
| **Blocked**     | Cannot progress due to external dependency           | #FFC7CE red | #9C0006 |

## Rollup logic — "worst status wins"

For each team column on a parent row, the formula scans its children and picks the status with the **most-urgent** priority.

Priority order, most urgent to least urgent:

```
1. Blocked      ← highest urgency (needs unblocking)
2. Doing        ← active work gets visibility
3. Constrained  ← capacity signal worth surfacing
4. Ready        ← next in queue
5. Discovery    ← exploratory, not sized
6. N/S          ← known backlog
7. Done         ← only if no live work
8. N/A          ← only if every child is N/A
```

**Example**: an initiative has three children for team UPJ with statuses [Doing, Ready, N/A]. The parent's UPJ status = **Doing** (highest-priority live status among children).

The underlying Excel formula per parent cell is a chained IF(COUNTIF(...)) that checks each status in priority order:

```excel
=IF(COUNTIF(range,"Blocked")>0,"Blocked",
  IF(COUNTIF(range,"Doing")>0,"Doing",
    IF(COUNTIF(range,"Constrained")>0,"Constrained",
      IF(COUNTIF(range,"Ready")>0,"Ready",
        IF(COUNTIF(range,"Discovery")>0,"Discovery",
          IF(COUNTIF(range,"N/S")>0,"N/S",
            IF(COUNTIF(range,"Done")>0,"Done",
              IF(COUNTIF(range,"N/A")>0,"N/A","")))))))))
```

## Layout conventions (Excel)

- **Row 1**: Sheet title
- **Row 2**: Legend (one sample of each status)
- **Row 4**: Column headers (Initiative name, Due Date, team columns)
- **Row 5+**: Initiative + children data, grouped so children can collapse
- **Column A**: Initiative/child name. Child names are prefixed with 4 spaces for indentation.
- **Column B**: Due date (free text, e.g. "15th May", "LIVE 29th June", "-")
- **Columns C–H**: Team status cells with dropdown validation + conditional formatting

## Adding new initiatives

1. Insert a row for the parent (no indentation in column A)
2. Insert child rows below (column A prefixed with 4 spaces)
3. On the parent row, for each team column, enter the rollup formula referencing the child range
4. Leave the due date column free text

## Adding new statuses

Requires changes in three places:
1. Dropdown validation list on the status range
2. Conditional format rule (equal-to match, bg + fg + bold)
3. Insert into the priority chain in every parent rollup formula (and decide where it goes in priority)

## Programmatic consumers (Claude Code, scripts)

The companion `roadmap.json` file contains the same data in structured form, with:
- Full status catalog including color codes and priority values
- Rollup rules as data (not just formulas)
- Parent-child relationships as nested arrays
- Sheet row references for cross-referencing with the Excel file

Prefer `roadmap.json` for reading/analyzing. Use this README to understand *why* the model looks the way it does.
