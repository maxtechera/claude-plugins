# MailerLite Mastery Skill

Complete reference for MailerLite API, automations, and email marketing.

---

## API Reference

### Authentication
```bash
# All requests require Bearer token
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
Accept: application/json
```

**Base URL**: `https://connect.mailerlite.com/api`

### Rate Limits
- **120 requests/minute** global limit
- 429 error when exceeded
- Use batch endpoint for bulk operations (up to 50 requests)
- Implement exponential backoff: 10s → 100s → 1000s

---

## Core Endpoints

### Subscribers
```
GET    /api/subscribers                    # List all
GET    /api/subscribers/{id}               # Get one
POST   /api/subscribers                    # Create/upsert (non-destructive)
PUT    /api/subscribers/{id}               # Update
DELETE /api/subscribers/{id}               # Delete
POST   /api/subscribers/{id}/forget        # GDPR deletion (30 days)
GET    /api/subscribers/{id}/activity      # Engagement history
```

### Groups
```
GET    /api/groups                         # List all
POST   /api/groups                         # Create
PUT    /api/groups/{id}                    # Update name
DELETE /api/groups/{id}                    # Delete
POST   /api/groups/{id}/subscribers        # Add subscriber
DELETE /api/groups/{id}/subscribers/{sid}  # Remove subscriber
GET    /api/groups/{id}/subscribers        # List members
POST   /api/groups/{id}/subscribers/import # Bulk import
```

### Campaigns
```
GET    /api/campaigns                      # List (filter: sent, draft, ready)
POST   /api/campaigns                      # Create (regular, ab, resend)
PUT    /api/campaigns/{id}                 # Update draft
DELETE /api/campaigns/{id}                 # Delete
POST   /api/campaigns/{id}/schedule        # Schedule or send
POST   /api/campaigns/{id}/cancel          # Cancel scheduled
GET    /api/campaigns/{id}/subscribers     # Analytics by subscriber
```

### Automations
```
GET    /api/automations                    # List with filters
GET    /api/automations/{id}               # Get details
POST   /api/automations                    # Create draft
DELETE /api/automations/{id}               # Delete
GET    /api/automations/{id}/activity      # Subscriber activity
```

### Segments
```
GET    /api/segments                       # List all (max 250)
GET    /api/segments/{id}/subscribers      # Get members
PUT    /api/segments/{id}                  # Update name
DELETE /api/segments/{id}                  # Delete
```

### Batch Operations
```
POST   /api/batch                          # Up to 50 requests in one call
```

---

## Subscriber Management

### Add/Update Subscriber (TypeScript)
```typescript
interface SubscribeData {
  email: string
  name?: string
  groups?: string[]
  fields?: Record<string, string>
  source?: string
}

async function addSubscriber(data: SubscribeData) {
  const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`
    },
    body: JSON.stringify({
      email: data.email,
      fields: {
        name: data.name,
        signup_source: data.source,
        ...data.fields
      },
      groups: data.groups || []
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`MailerLite error: ${error.message}`)
  }

  return response.json()
}
```

### Important Notes
- POST to /subscribers is **non-destructive** (upsert)
- Omitted fields preserve existing data
- Cannot reactivate unsubscribed/bounced via API (abuse prevention)
- Use groups for tagging (MailerLite doesn't have separate tags)

---

## Automation Patterns

### Welcome Sequence (Proven: 44% Open Rate)
```
Day 0: Welcome + Lead Magnet Delivery (60% open)
Day 1: Personal Story (50% open)
Day 3: Check-in + Engagement (28% open)
Day 5: Community Invitation (38% open)
Day 7: Final Value + Soft Close (29% open)
```

**Key Rules:**
- Minimum 1-day between emails
- 3-7 emails optimal
- Lead with value, not pitch
- Include preference center in email 2-3

### Lead Magnet Delivery
```
Trigger: "When subscriber joins group"
  ↓
[Email] Lead magnet delivery + intro (immediate)
  ↓
[Delay] 1 day
  ↓
[Email] Story + credibility
  ↓
[Delay] 2 days
  ↓
[Condition] Opened previous emails?
  ├─ YES → [Email] Advanced content
  └─ NO → [Email] Re-engagement with value
```

### Re-Engagement Campaign
```
Target: No opens in 6 months
Sequence: 5 emails, 1 every 2 days

Email 1: "We miss you" + incentive (20% off)
Email 2: Same incentive, different angle
Email 3: Urgency ("expires tomorrow")
Email 4: Preference check
Email 5: Final cleanup → auto-unsubscribe non-engaged
```

### Conditional Branching
```
[Condition] Set up to 5 rules
├─ Combine with: ALL rules OR ANY rule
├─ YES path (✓): Subscriber matches
└─ NO path (✗): Subscriber doesn't match

Rule Types:
- Custom field values
- Group membership
- Campaign activity (opens, clicks)
- Segment membership
- Automation activity
```

---

## Email Templates

### Base HTML Template (61% Open Rate)
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    {preheader_text}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">

          <!-- Orange Accent Header -->
          <tr>
            <td style="background-color: #FF6B35; height: 4px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              {content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #999999; font-size: 13px;">
                Max Techera<br>
                <a href="{$unsubscribe}" style="color: #999999;">Desuscribirse</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
```

### CTA Button (Gradient)
```html
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding: 8px 0 24px 0;">
      <a href="{url}" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 6px; box-shadow: 0 4px 6px rgba(50,50,93,.11), 0 1px 3px rgba(0,0,0,.08);">
        {CTA Text} →
      </a>
    </td>
  </tr>
</table>
```

### MailerLite Variables
```
{$name|Hola}      - Name with fallback
{$email}          - Email address
{$unsubscribe}    - Unsubscribe link (REQUIRED)
{$url}            - Web version link
{$account}        - Account name
```

---

## Webhooks

### Setup
```
POST /api/webhooks
{
  "name": "New Subscriber Alert",
  "url": "https://your-domain.com/api/webhooks/mailerlite",
  "events": ["subscriber.created", "subscriber.unsubscribed"]
}
```

### Event Types
- `subscriber.created` - New subscriber
- `subscriber.updated` - Data changed
- `subscriber.unsubscribed` - Unsubscribed
- `subscriber.added_to_group` - Group assignment
- `subscriber.bounced` - Email bounce
- `subscriber.spam_reported` - Marked spam
- `subscriber.automation_triggered` - Started automation
- `subscriber.automation_completed` - Finished automation

### Requirements
- Respond with 2XX in **< 3 seconds**
- Validate signature: `X-Mailerlite-Signature` header
- Retry schedule: 10s, 100s, 1000s

### Webhook Handler (Next.js)
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('X-Mailerlite-Signature')
  const payload = await request.json()

  // Validate signature
  // ...

  switch (payload.event) {
    case 'subscriber.created':
      await handleNewSubscriber(payload.data)
      break
    case 'subscriber.unsubscribed':
      await handleUnsubscribe(payload.data)
      break
  }

  return NextResponse.json({ success: true })
}
```

---

## Segmentation Best Practices

### Groups vs Segments
| Groups | Segments |
|--------|----------|
| Manual/API assignment | Dynamic rules |
| Subscriber can join/leave | Auto-update based on behavior |
| Use for: sources, interests | Use for: engagement, lifecycle |

### Proven Segments
```
Active Subscribers     = Opened email in last 30 days
At-Risk Subscribers    = No opens in 30-90 days
Inactive Subscribers   = No opens in 90+ days
High Engagers          = 3+ opens in last 30 days
Link Clickers          = Clicked any link in last 30 days
```

### Segment Impact
- **14.32% higher** open rates vs non-segmented
- **54.79% higher** click-through rates

---

## Best Practices

### Deliverability
- Configure SPF and DKIM records
- Maintain consistent sending frequency
- Clean list quarterly (remove 6+ month inactive)
- Monitor bounce rates (< 2% target)

### List Hygiene
- Import only active addresses
- Remove hard bounces immediately
- Use double opt-in for quality
- Run re-engagement before cleanup

### Automation
- Test all workflows before launch
- Add delays after condition checks (min 1 hour)
- Keep conditions max 3 levels deep
- Monitor per-email metrics to optimize

---

## Quick Reference

### API Limits
| Item | Limit |
|------|-------|
| Requests/minute | 120 |
| Batch requests | 50 |
| Max segments | 250 |
| Group name length | 255 chars |
| Webhook timeout | 3 seconds |

### Official SDKs
```bash
# Node.js
npm install @mailerlite/mailerlite-nodejs

# Python
pip install mailerlite-api-v2
```

### Documentation
- [API Docs](https://developers.mailerlite.com/)
- [Automation Guide](https://www.mailerlite.com/ultimate-guide-to-email-marketing/automation)
- [Segmentation Guide](https://www.mailerlite.com/ultimate-guide-to-email-marketing/segmentation)
