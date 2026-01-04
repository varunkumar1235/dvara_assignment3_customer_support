# SLA Escalation System

## Overview
The system automatically escalates tickets when SLA breaches occur, ensuring timely response and resolution.

## SLA Time Limits

### First Response Time: 24 hours
- **Trigger**: No agent response (comment) within 24 hours of ticket creation (or escalation)
- **Action**: Ticket is escalated

### Resolution Time: 72 hours
- **Trigger**: Ticket not resolved within 72 hours after first response
- **Action**: Ticket is escalated

## Escalation Process

When a ticket is escalated:

1. **Priority Increase**: Priority is increased by one level
   - `low` → `medium`
   - `medium` → `high`
   - `high` → `urgent`
   - `urgent` → `urgent` (stays urgent)

2. **Agent Reset**: The assigned agent is unassigned (set to NULL)
   - Ticket status is reset to `open`
   - A new agent must be assigned

3. **Timer Reset**: 
   - `first_response_at` is reset to NULL
   - `sla_deadline` is reset to 24 hours from escalation time
   - `updated_at` is set to current time

4. **Escalation Tracking**:
   - `escalated` flag is set to `TRUE`
   - `escalation_count` is incremented

## Re-escalation

After escalation, if the new SLA is breached again:
- The ticket can be escalated again
- Priority can be increased further (if not already urgent)
- Timers reset again
- Agent is unassigned again

## Frontend Indicators

### Dashboard
- Escalated tickets have:
  - Orange/amber background highlight
  - Orange left border
  - "ESCALATED" chip badge
  - Escalation count shown next to priority

### Ticket Detail Page
- Escalated tickets show:
  - Orange left border
  - Amber background tint
  - "ESCALATED" warning chip
  - Warning alert explaining the escalation
  - Escalation count if multiple escalations

## Automatic Checking

SLA checks are performed:
- When viewing the tickets list (all tickets checked)
- When viewing a single ticket (that ticket checked)
- Checks happen in real-time on each request

## Database Schema

New columns added to `tickets` table:
- `first_response_at` (TIMESTAMP): When the first agent comment was made
- `escalated` (BOOLEAN): Whether the ticket has been escalated
- `escalation_count` (INTEGER): Number of times the ticket has been escalated


