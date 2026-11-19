using System.Security.Cryptography;
using System.Text;
using CarBooking.Api.Data;
using CarBooking.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CarBooking.Api.Controllers;

/// <summary>
/// Read-only API for the HQ command center: where each car is in its trip
/// cycle (booked, picked up, returned), and a feed of those movements.
/// There is no GPS; "movement" means these recorded events.
///
/// Auth: X-Api-Key header, compared with CARBOOKING_INTEGRATION_API_KEY.
/// Unset key = the whole API answers 503, so it is off until configured.
///
/// Time: StartTime/EndTime are stored as Malaysia wall-clock time; CreatedAt
/// and the pick-up/return stamps are stored in UTC. Everything goes out as
/// ISO 8601 with an explicit +08:00 offset so the caller never has to guess.
/// </summary>
[ApiController]
[Route("api/v1")]
[ServiceFilter(typeof(IntegrationKeyFilter))]
[EnableRateLimiting("integration")]
public class IntegrationController : ControllerBase
{
    private static readonly TimeSpan Myt = TimeSpan.FromHours(8);
    private readonly AppDbContext _db;
    public IntegrationController(AppDbContext db) => _db = db;

    private static DateTime NowWall => DateTime.UtcNow + Myt;
    private static DateTimeOffset Wall(DateTime d) => new(DateTime.SpecifyKind(d, DateTimeKind.Unspecified), Myt);
    private static DateTimeOffset FromUtc(DateTime d) => new DateTimeOffset(DateTime.SpecifyKind(d, DateTimeKind.Utc)).ToOffset(Myt);
    private static DateTimeOffset? FromUtc(DateTime? d) => d is null ? null : FromUtc(d.Value);

    private static string TripStatus(Reservation r, DateTime nowWall) =>
        r.CheckedOutAt != null ? "returned"
        : r.CheckedInAt != null ? "on_trip"
        : r.EndTime < nowWall ? "not_picked_up"
        : "booked";

    private string? PhotoUrl(Reservation r, string? file) =>
        file is null ? null : $"{Request.Scheme}://{Request.Host}/api/reservations/track/{r.TrackingCode}/photo/{file}";

    private static object VehicleRef(Vehicle? v) => new
    {
        id = v?.Id,
        plate = v?.PlateNumber,
        name = v is null ? null : $"{v.Make} {v.Model}".Trim(),
    };

    private object Trip(Reservation r, DateTime nowWall)
    {
        var status = TripStatus(r, nowWall);
        return new
        {
            id = r.Id,
            code = r.TrackingCode,
            status,
            overdue = status == "on_trip" && r.EndTime < nowWall,
            vehicle = VehicleRef(r.Vehicle),
            driver_name = r.BookerName,
            destination = r.Destination,
            planned_start = Wall(r.StartTime),
            planned_end = Wall(r.EndTime),
            cards = new { touch_n_go = r.NeedTngCard, fuel = r.NeedFuelCard },
            pickup = r.CheckedInAt == null ? null : new
            {
                at = FromUtc(r.CheckedInAt.Value),
                odometer_km = r.StartMileage,
                photo_url = PhotoUrl(r, r.StartMileagePhoto),
            },
            @return = r.CheckedOutAt == null ? null : new
            {
                at = FromUtc(r.CheckedOutAt.Value),
                odometer_km = r.EndMileage,
                photo_url = PhotoUrl(r, r.EndMileagePhoto),
            },
            distance_km = r.StartMileage != null && r.EndMileage != null ? r.EndMileage - r.StartMileage : null,
            booked_at = FromUtc(r.CreatedAt),
        };
    }

    /// <summary>Cheap auth check for the integrator.</summary>
    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { ok = true, server_time = DateTimeOffset.UtcNow.ToOffset(Myt), api_version = "1" });

    /// <summary>Every vehicle and what it is doing right now.</summary>
    [HttpGet("fleet")]
    public async Task<IActionResult> Fleet()
    {
        var now = NowWall;
        var vehicles = await _db.Vehicles.OrderBy(v => v.PlateNumber).ToListAsync();
        // Open trips (picked up, not returned) plus anything planned around now.
        var horizon = now.AddDays(30);
        var relevant = await _db.Reservations.Include(r => r.Vehicle)
            .Where(r => r.Status == ReservationStatus.Approved && r.CheckedOutAt == null &&
                        (r.CheckedInAt != null || (r.EndTime >= now && r.StartTime <= horizon)))
            .ToListAsync();

        var items = vehicles.Select(v =>
        {
            var mine = relevant.Where(r => r.VehicleId == v.Id).ToList();
            var onTrip = mine.Where(r => r.CheckedInAt != null).OrderByDescending(r => r.CheckedInAt).ToList();
            var reservedNow = mine.Where(r => r.CheckedInAt == null && r.StartTime <= now && r.EndTime >= now)
                                  .OrderBy(r => r.StartTime).ToList();
            var next = mine.Where(r => r.CheckedInAt == null && r.StartTime > now).OrderBy(r => r.StartTime).FirstOrDefault();
            var state = onTrip.Count > 0 ? "on_trip" : reservedNow.Count > 0 ? "reserved" : "available";
            var current = onTrip.FirstOrDefault() ?? reservedNow.FirstOrDefault();
            return new
            {
                id = v.Id,
                plate = v.PlateNumber,
                name = $"{v.Make} {v.Model}".Trim(),
                type = v.Type,
                fuel = v.Fuel,
                seats = v.Seats,
                state,
                // Bookings may overlap by design, so more than one trip can be open.
                open_trips = onTrip.Count,
                current_trip = current == null ? null : Trip(current, now),
                next_trip = next == null ? null : Trip(next, now),
            };
        }).ToList();

        return Ok(new
        {
            generated_at = DateTimeOffset.UtcNow.ToOffset(Myt),
            summary = new
            {
                total = items.Count,
                on_trip = items.Count(i => i.state == "on_trip"),
                reserved = items.Count(i => i.state == "reserved"),
                available = items.Count(i => i.state == "available"),
                overdue = relevant.Count(r => r.CheckedInAt != null && r.EndTime < now),
            },
            vehicles = items,
        });
    }

    /// <summary>
    /// Movement feed: booked, picked_up and returned events after `since`,
    /// oldest first. Poll with the returned next_since.
    /// </summary>
    [HttpGet("events")]
    public async Task<IActionResult> Events([FromQuery] DateTimeOffset? since, [FromQuery] int limit = 200)
    {
        limit = Math.Clamp(limit, 1, 500);
        var s = (since ?? DateTimeOffset.UtcNow.AddHours(-24)).UtcDateTime;
        var now = NowWall;

        var rows = await _db.Reservations.Include(r => r.Vehicle)
            .Where(r => r.CreatedAt > s || r.CheckedInAt > s || r.CheckedOutAt > s)
            .ToListAsync();

        var events = rows.SelectMany(r =>
        {
            var list = new List<(DateTime At, string Type, Reservation R, int? Km)>();
            if (r.CreatedAt > s) list.Add((r.CreatedAt, "booked", r, null));
            if (r.CheckedInAt > s) list.Add((r.CheckedInAt!.Value, "picked_up", r, r.StartMileage));
            if (r.CheckedOutAt > s) list.Add((r.CheckedOutAt!.Value, "returned", r, r.EndMileage));
            return list;
        })
        .OrderBy(e => e.At).ThenBy(e => e.R.Id)
        .ToList();

        var page = events.Take(limit).ToList();
        return Ok(new
        {
            events = page.Select(e => new
            {
                id = $"{e.R.Id}-{e.Type}",
                type = e.Type,
                at = FromUtc(e.At),
                trip_code = e.R.TrackingCode,
                trip_status = TripStatus(e.R, now),
                vehicle = VehicleRef(e.R.Vehicle),
                driver_name = e.R.BookerName,
                destination = e.R.Destination,
                planned_start = Wall(e.R.StartTime),
                planned_end = Wall(e.R.EndTime),
                odometer_km = e.Km,
                distance_km = e.Type == "returned" && e.R.StartMileage != null && e.R.EndMileage != null
                    ? e.R.EndMileage - e.R.StartMileage : null,
            }),
            has_more = events.Count > limit,
            // Pass this back as `since` on the next call. Unchanged when empty.
            next_since = page.Count > 0 ? FromUtc(page[^1].At) : (since ?? DateTimeOffset.UtcNow.AddHours(-24)).ToOffset(Myt),
        });
    }

    /// <summary>Trips, filtered by planned start date (Malaysia time).</summary>
    [HttpGet("trips")]
    public async Task<IActionResult> Trips(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] string? status, [FromQuery] string? plate,
        [FromQuery] int limit = 100, [FromQuery] int offset = 0)
    {
        var now = NowWall;
        var f = (from ?? DateOnly.FromDateTime(now.AddDays(-7))).ToDateTime(TimeOnly.MinValue);
        var t = (to ?? DateOnly.FromDateTime(now.AddDays(30))).ToDateTime(TimeOnly.MaxValue);
        limit = Math.Clamp(limit, 1, 500);
        offset = Math.Max(0, offset);

        var q = _db.Reservations.Include(r => r.Vehicle)
            .Where(r => r.Status == ReservationStatus.Approved && r.StartTime >= f && r.StartTime <= t);
        if (!string.IsNullOrWhiteSpace(plate))
        {
            var p = plate.Replace(" ", "").ToUpper();
            q = q.Where(r => r.Vehicle!.PlateNumber.Replace(" ", "").ToUpper() == p);
        }

        string[] allowed = ["booked", "on_trip", "returned", "not_picked_up", "overdue"];
        if (!string.IsNullOrWhiteSpace(status) && !allowed.Contains(status))
            return BadRequest(new { error = "invalid_status", allowed });

        var list = (await q.OrderBy(r => r.StartTime).ThenBy(r => r.Id).ToListAsync())
            .Where(r => string.IsNullOrWhiteSpace(status) ? true
                : status == "overdue" ? r.CheckedInAt != null && r.CheckedOutAt == null && r.EndTime < now
                : TripStatus(r, now) == status)
            .ToList();

        return Ok(new
        {
            total = list.Count,
            limit,
            offset,
            trips = list.Skip(offset).Take(limit).Select(r => Trip(r, now)),
        });
    }

    /// <summary>One trip by its tracking code.</summary>
    [HttpGet("trips/{code}")]
    public async Task<IActionResult> TripByCode(string code)
    {
        var r = await _db.Reservations.Include(x => x.Vehicle).FirstOrDefaultAsync(x => x.TrackingCode == code.ToUpper());
        return r is null ? NotFound(new { error = "trip_not_found" }) : Ok(Trip(r, NowWall));
    }
}

/// <summary>Checks X-Api-Key against the configured integration key.</summary>
public class IntegrationKeyFilter : IAsyncActionFilter
{
    private readonly byte[]? _key;
    public IntegrationKeyFilter(IConfiguration cfg)
    {
        var k = cfg["INTEGRATION_API_KEY"];
        _key = string.IsNullOrWhiteSpace(k) ? null : Encoding.UTF8.GetBytes(k.Trim());
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext ctx, ActionExecutionDelegate next)
    {
        if (_key is null)
        {
            ctx.Result = new ObjectResult(new { error = "integration_api_disabled" }) { StatusCode = 503 };
            return;
        }
        var given = ctx.HttpContext.Request.Headers["X-Api-Key"].ToString();
        if (string.IsNullOrEmpty(given) || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(given), _key))
        {
            ctx.Result = new ObjectResult(new { error = "invalid_api_key" }) { StatusCode = 401 };
            return;
        }
        await next();
    }
}
