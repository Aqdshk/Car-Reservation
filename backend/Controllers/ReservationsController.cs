using CarBooking.Api.Data;
using CarBooking.Api.Dtos;
using CarBooking.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarBooking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReservationsController : ControllerBase
{
    // Serializes booking-create and approve flows on this single-instance deployment so the
    // capacity checks (vehicle slot, TnG/Fuel cards) cannot be raced by concurrent requests.
    private static readonly SemaphoreSlim _bookingLock = new(1, 1);

    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    private readonly IWebHostEnvironment _env;
    public ReservationsController(AppDbContext db, IConfiguration cfg, IWebHostEnvironment env)
    {
        _db = db; _cfg = cfg; _env = env;
    }

    private static ReservationDto Map(Reservation r) => new(
        r.Id, r.TrackingCode,
        r.BookerName, r.BookerEmail, r.BookerPhone, r.Department,
        r.VehicleId, r.Vehicle?.PlateNumber ?? "", $"{r.Vehicle?.Make} {r.Vehicle?.Model}".Trim(),
        r.StartTime, r.EndTime, r.Destination, r.Passengers, r.DistanceKm,
        r.NeedTngCard, r.NeedFuelCard,
        r.Notes, r.Status, r.CreatedAt,
        r.StartMileage, r.EndMileage, r.StartMileagePhoto, r.EndMileagePhoto,
        r.CheckedInAt, r.CheckedOutAt);

    private static string GenerateCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var rng = Random.Shared;
        return new string(Enumerable.Range(0, 8).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
    }

    private string UploadsDir
    {
        get
        {
            var path = _cfg["UPLOADS_DIR"] ?? Path.Combine(_env.ContentRootPath, "uploads");
            Directory.CreateDirectory(path);
            return path;
        }
    }

    // PUBLIC — submit booking
    [HttpPost]
    public async Task<IActionResult> Create(CreateReservationDto dto)
    {
        if (dto.EndTime <= dto.StartTime)
            return BadRequest(new { message = "End time must be after start time" });

        await _bookingLock.WaitAsync();
        try
        {
            var conflict = await _db.Reservations.AnyAsync(r =>
                r.VehicleId == dto.VehicleId && r.Status == ReservationStatus.Approved &&
                r.StartTime < dto.EndTime && r.EndTime > dto.StartTime);
            if (conflict)
                return BadRequest(new { message = "Vehicle already booked during this time slot" });

            var settings = await _db.Settings.FirstOrDefaultAsync() ?? new Models.Settings();
            if (dto.NeedTngCard)
            {
                var tngInUse = await _db.Reservations.CountAsync(r =>
                    r.Status == ReservationStatus.Approved && r.NeedTngCard && r.CheckedOutAt == null &&
                    r.StartTime < dto.EndTime && r.EndTime > dto.StartTime);
                if (tngInUse >= settings.TotalTngCards)
                    return BadRequest(new { message = "No TnG card available for this period" });
            }
            if (dto.NeedFuelCard)
            {
                var fuelInUse = await _db.Reservations.CountAsync(r =>
                    r.Status == ReservationStatus.Approved && r.NeedFuelCard && r.CheckedOutAt == null &&
                    r.StartTime < dto.EndTime && r.EndTime > dto.StartTime);
                if (fuelInUse >= settings.TotalFuelCards)
                    return BadRequest(new { message = "No Fuel card available for this period" });
            }

            string code;
            do { code = GenerateCode(); }
            while (await _db.Reservations.AnyAsync(r => r.TrackingCode == code));

            var r = new Reservation
            {
                TrackingCode = code,
                BookerName = dto.BookerName.Trim(),
                BookerEmail = dto.BookerEmail, BookerPhone = dto.BookerPhone, Department = dto.Department,
                VehicleId = dto.VehicleId,
                StartTime = dto.StartTime, EndTime = dto.EndTime,
                Destination = dto.Destination, Passengers = dto.Passengers,
                DistanceKm = dto.DistanceKm,
                NeedTngCard = dto.NeedTngCard, NeedFuelCard = dto.NeedFuelCard,
                Notes = dto.Notes, Status = ReservationStatus.Pending
            };
            _db.Reservations.Add(r);
            await _db.SaveChangesAsync();
            await _db.Entry(r).Reference(x => x.Vehicle).LoadAsync();
            return Ok(Map(r));
        }
        finally { _bookingLock.Release(); }
    }

    // PUBLIC — vehicle availability
    [HttpGet("busy/{vehicleId}")]
    public async Task<IActionResult> Busy(int vehicleId)
    {
        var list = await _db.Reservations
            .Where(r => r.VehicleId == vehicleId && (r.Status == ReservationStatus.Approved || r.Status == ReservationStatus.Pending))
            .Where(r => r.EndTime > DateTime.UtcNow.AddDays(-1))
            .OrderBy(r => r.StartTime)
            .Select(r => new BusySlotDto(r.Id, r.VehicleId, r.StartTime, r.EndTime, r.Status, r.BookerName))
            .ToListAsync();
        return Ok(list);
    }

    // PUBLIC — lookup booking by tracking code
    [HttpGet("track/{code}")]
    public async Task<IActionResult> Track(string code)
    {
        var r = await _db.Reservations.Include(x => x.Vehicle)
            .FirstOrDefaultAsync(x => x.TrackingCode == code.ToUpper());
        if (r is null) return NotFound(new { message = "Booking not found" });
        return Ok(Map(r));
    }

    // PUBLIC — check-in (mileage + photo)
    [HttpPost("track/{code}/checkin")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> CheckIn(string code, [FromForm] int mileage, IFormFile photo)
    {
        var r = await _db.Reservations.Include(x => x.Vehicle)
            .FirstOrDefaultAsync(x => x.TrackingCode == code.ToUpper());
        if (r is null) return NotFound(new { message = "Booking not found" });
        if (r.Status != ReservationStatus.Approved) return BadRequest(new { message = "Booking must be approved before check-in" });
        if (r.CheckedInAt.HasValue) return BadRequest(new { message = "Already checked in" });
        if (mileage < 0) return BadRequest(new { message = "Mileage must be a positive number" });
        if (photo is null || photo.Length == 0) return BadRequest(new { message = "Photo is required" });
        if (photo.Length > 12 * 1024 * 1024) return BadRequest(new { message = "Photo too large (max 12MB)" });

        var ext = Path.GetExtension(photo.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return BadRequest(new { message = "Photo must be JPG, PNG, or WEBP" });

        var filename = $"checkin-{r.TrackingCode}-{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(UploadsDir, filename);
        await using (var fs = new FileStream(path, FileMode.Create))
            await photo.CopyToAsync(fs);

        r.StartMileage = mileage;
        r.StartMileagePhoto = filename;
        r.CheckedInAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(Map(r));
    }

    // PUBLIC — check-out (end mileage + photo)
    [HttpPost("track/{code}/checkout")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> CheckOut(string code, [FromForm] int mileage, IFormFile photo)
    {
        var r = await _db.Reservations.Include(x => x.Vehicle)
            .FirstOrDefaultAsync(x => x.TrackingCode == code.ToUpper());
        if (r is null) return NotFound(new { message = "Booking not found" });
        if (!r.CheckedInAt.HasValue) return BadRequest(new { message = "Must check-in before check-out" });
        if (r.CheckedOutAt.HasValue) return BadRequest(new { message = "Already checked out" });
        if (r.StartMileage.HasValue && mileage < r.StartMileage.Value)
            return BadRequest(new { message = $"End mileage must be ≥ start mileage ({r.StartMileage})" });
        if (photo is null || photo.Length == 0) return BadRequest(new { message = "Photo is required" });
        if (photo.Length > 12 * 1024 * 1024) return BadRequest(new { message = "Photo too large (max 12MB)" });

        var ext = Path.GetExtension(photo.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return BadRequest(new { message = "Photo must be JPG, PNG, or WEBP" });

        var filename = $"checkout-{r.TrackingCode}-{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(UploadsDir, filename);
        await using (var fs = new FileStream(path, FileMode.Create))
            await photo.CopyToAsync(fs);

        r.EndMileage = mileage;
        r.EndMileagePhoto = filename;
        r.CheckedOutAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(Map(r));
    }

    // PUBLIC — serve photo, scoped by tracking code (filename must belong to that booking)
    [HttpGet("track/{code}/photo/{filename}")]
    public IActionResult GetPhoto(string code, string filename)
    {
        if (filename.Contains("..") || filename.Contains('/') || filename.Contains('\\'))
            return BadRequest();

        var upperCode = code.ToUpper();
        if (!filename.StartsWith($"checkin-{upperCode}-") && !filename.StartsWith($"checkout-{upperCode}-"))
            return NotFound();

        var path = Path.Combine(UploadsDir, filename);
        if (!System.IO.File.Exists(path)) return NotFound();
        var ext = Path.GetExtension(filename).ToLowerInvariant();
        var mime = ext switch { ".jpg" or ".jpeg" => "image/jpeg", ".png" => "image/png", ".webp" => "image/webp", _ => "application/octet-stream" };
        return PhysicalFile(path, mime);
    }

    // ADMIN — list all (paginated)
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 100)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = _db.Reservations.Include(r => r.Vehicle).OrderByDescending(r => r.CreatedAt);
        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, page, pageSize, items = items.Select(Map) });
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Pending()
    {
        var list = await _db.Reservations.Include(r => r.Vehicle)
            .Where(r => r.Status == ReservationStatus.Pending).OrderBy(r => r.StartTime).ToListAsync();
        return Ok(list.Select(Map));
    }

    [HttpGet("calendar")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Calendar()
    {
        var from = DateTime.UtcNow.AddDays(-30);
        var to = DateTime.UtcNow.AddDays(90);
        var list = await _db.Reservations.Include(r => r.Vehicle)
            .Where(r => r.StartTime < to && r.EndTime > from)
            .Where(r => r.Status != ReservationStatus.Rejected)
            .OrderBy(r => r.StartTime).ToListAsync();
        return Ok(list.Select(Map));
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateStatusDto dto)
    {
        if (!ReservationStatus.IsValid(dto.Status))
            return BadRequest(new { message = "Invalid status" });

        await _bookingLock.WaitAsync();
        try
        {
            var r = await _db.Reservations.Include(x => x.Vehicle).FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return NotFound();

            if (dto.Status == ReservationStatus.Approved)
            {
                var conflict = await _db.Reservations.AnyAsync(x =>
                    x.Id != id && x.VehicleId == r.VehicleId && x.Status == ReservationStatus.Approved &&
                    x.StartTime < r.EndTime && x.EndTime > r.StartTime);
                if (conflict)
                    return BadRequest(new { message = "Cannot approve — time slot conflicts with another approved booking" });

                var settings = await _db.Settings.FirstOrDefaultAsync() ?? new Models.Settings();
                if (r.NeedTngCard)
                {
                    var tngInUse = await _db.Reservations.CountAsync(x =>
                        x.Id != id && x.Status == ReservationStatus.Approved && x.NeedTngCard && x.CheckedOutAt == null &&
                        x.StartTime < r.EndTime && x.EndTime > r.StartTime);
                    if (tngInUse >= settings.TotalTngCards)
                        return BadRequest(new { message = "Cannot approve — no TnG card available for this period" });
                }
                if (r.NeedFuelCard)
                {
                    var fuelInUse = await _db.Reservations.CountAsync(x =>
                        x.Id != id && x.Status == ReservationStatus.Approved && x.NeedFuelCard && x.CheckedOutAt == null &&
                        x.StartTime < r.EndTime && x.EndTime > r.StartTime);
                    if (fuelInUse >= settings.TotalFuelCards)
                        return BadRequest(new { message = "Cannot approve — no Fuel card available for this period" });
                }
            }

            r.Status = dto.Status;
            await _db.SaveChangesAsync();
            return Ok(Map(r));
        }
        finally { _bookingLock.Release(); }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await _db.Reservations.FindAsync(id);
        if (r is null) return NotFound();
        _db.Reservations.Remove(r);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
