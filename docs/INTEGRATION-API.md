# C-Zero Cars: Integration API v1

Read-only API for the HQ command center. It shows where every company car is in
its trip cycle and gives a feed of car movements.

The system has no GPS. A "movement" is one of three recorded events:

| Event | When it happens |
|---|---|
| `booked` | A staff member books a car (scan the QR on the key, fill the form). |
| `picked_up` | The driver checks in at the car and records the odometer with a photo. |
| `returned` | The driver checks out on return and records the odometer with a photo. |

Bookings are confirmed immediately. There is no approval step, and one car may
have overlapping bookings by design.

## Connection

| | |
|---|---|
| Base URL | `https://reservation.c-zero.com.my/api/v1` |
| Auth | Header `X-Api-Key: <key>` on every request. The key is issued by C-Zero. |
| Format | JSON, UTF-8 |
| Times | ISO 8601 with Malaysia offset, e.g. `2026-11-20T09:00:00+08:00` |
| Rate limit | 120 requests per minute per client IP. Over the limit returns `429`. |

Keep the key server side. Do not put it in browser or mobile code.

### Errors

| Status | Body | Meaning |
|---|---|---|
| 401 | `{"error":"invalid_api_key"}` | Missing or wrong key. |
| 400 | `{"error":"invalid_status", ...}` | Bad query value. |
| 404 | `{"error":"trip_not_found"}` | No trip with that code. |
| 429 | (empty) | Too many requests, retry after a minute. |
| 503 | `{"error":"integration_api_disabled"}` | API switched off on our side. |

## Recommended integration

1. On start, call `GET /fleet` to draw the current state of every car.
2. Every 15 to 60 seconds, call `GET /events?since=<next_since from last call>`
   and apply each event to your display.
3. Call `GET /fleet` again every few minutes, or after an error, to resync.

## Endpoints

### GET /ping

Checks the key.

```json
{ "ok": true, "server_time": "2026-11-19T09:15:02+08:00", "api_version": "1" }
```

### GET /fleet

Every vehicle and what it is doing now.

`state` is one of:

- `on_trip`: picked up and not yet returned.
- `reserved`: a booking covers the current time but the car has not been picked up.
- `available`: neither.

`current_trip` is the open trip (or the current reservation). `next_trip` is the
next booking that has not started. `open_trips` counts trips picked up and not
returned; it can be above 1 because bookings may overlap.

```json
{
  "generated_at": "2026-11-19T09:15:02+08:00",
  "summary": { "total": 3, "on_trip": 1, "reserved": 0, "available": 2, "overdue": 0 },
  "vehicles": [
    {
      "id": 1,
      "plate": "VKL 1234",
      "name": "Perodua Bezza",
      "type": "Sedan",
      "fuel": "Petrol",
      "seats": 5,
      "state": "on_trip",
      "open_trips": 1,
      "current_trip": { "...": "Trip object, see below" },
      "next_trip": null
    }
  ]
}
```

### GET /events

Movement feed, oldest first.

| Query | Default | |
|---|---|---|
| `since` | 24 hours ago | ISO 8601. Returns events strictly after this time. |
| `limit` | 200 | 1 to 500. |

Pass `next_since` from the response as `since` on the next call. If `has_more`
is `true`, call again straight away.

```json
{
  "events": [
    {
      "id": "42-picked_up",
      "type": "picked_up",
      "at": "2026-11-19T09:02:11+08:00",
      "trip_code": "4DAB7MPW",
      "trip_status": "on_trip",
      "vehicle": { "id": 1, "plate": "VKL 1234", "name": "Perodua Bezza" },
      "driver_name": "Aqid",
      "destination": "Shah Alam",
      "planned_start": "2026-11-19T09:00:00+08:00",
      "planned_end": "2026-11-19T15:00:00+08:00",
      "odometer_km": 45230,
      "distance_km": null
    }
  ],
  "has_more": false,
  "next_since": "2026-11-19T09:02:11+08:00"
}
```

`id` is stable (`<trip id>-<type>`), so it is safe to deduplicate on it.
`odometer_km` is set on `picked_up` and `returned`. `distance_km` is set on
`returned`.

### GET /trips

Trips whose planned start falls in a date range.

| Query | Default | |
|---|---|---|
| `from` | 7 days ago | `YYYY-MM-DD`, Malaysia date |
| `to` | 30 days ahead | `YYYY-MM-DD`, inclusive |
| `status` | all | `booked`, `on_trip`, `returned`, `not_picked_up`, `overdue` |
| `plate` | all | e.g. `VKL1234` (spaces ignored) |
| `limit` | 100 | 1 to 500 |
| `offset` | 0 | for paging |

```json
{ "total": 12, "limit": 100, "offset": 0, "trips": [ { "...": "Trip object" } ] }
```

### GET /trips/{code}

One trip by its 8-character tracking code.

## Trip object

```json
{
  "id": 42,
  "code": "4DAB7MPW",
  "status": "returned",
  "overdue": false,
  "vehicle": { "id": 1, "plate": "VKL 1234", "name": "Perodua Bezza" },
  "driver_name": "Aqid",
  "destination": "Shah Alam",
  "planned_start": "2026-11-19T09:00:00+08:00",
  "planned_end": "2026-11-19T15:00:00+08:00",
  "cards": { "touch_n_go": true, "fuel": false },
  "pickup": { "at": "2026-11-19T09:02:11+08:00", "odometer_km": 45230, "photo_url": "https://..." },
  "return": { "at": "2026-11-19T14:41:37+08:00", "odometer_km": 45412, "photo_url": "https://..." },
  "distance_km": 182,
  "booked_at": "2026-11-18T16:20:05+08:00"
}
```

| Field | |
|---|---|
| `status` | `booked` (not picked up yet), `on_trip`, `returned`, `not_picked_up` (planned end passed, never picked up) |
| `overdue` | `true` when on trip and the planned end has passed |
| `cards` | Which cards the driver said they took |
| `pickup`, `return` | `null` until that step happens. `photo_url` is the odometer photo. |

## Notes

- Deleting a booking in the admin page removes it from the API. No event is
  sent for a deletion; the next `/fleet` call reflects it.
- `driver_name` and `destination` are what the driver typed. They are not
  checked against an HR system.
