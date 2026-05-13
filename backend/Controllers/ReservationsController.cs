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
    private readonly AppDbContext _db;
    public ReservationsController(AppDbContext db) => _db = db;

    private static ReservationDto Map(Reservation r) => new(
        r.Id, r.BookerName, r.BookerEmail, r.BookerPhone, r.Department,
        r.VehicleId, r.Vehicle?.PlateNumber ?? "", $"{r.Vehicle?.Make} {r.Vehicle?.Model}".Trim(),
        r.StartTime, r.EndTime, r.Destination, r.Passengers, r.DistanceKm,
        r.NeedTngCard, r.NeedFuelCard,
        r.Notes, r.Status, r.CreatedAt);

    // PUBLIC — submit booking
    [HttpPost]
    public async Task<IActionResult> Create(CreateReservationDto dto)
    {
        if (dto.EndTime <= dto.StartTime)
            return BadRequest(new { message = "End time must be after start time" });
        if (string.IsNullOrWhiteSpace(dto.BookerName))
            return BadRequest(new { message = "Booker name is required" });

        // Check overlap with approved bookings for same vehicle
        var conflict = await _db.Reservations.AnyAsync(r =>
            r.VehicleId == dto.VehicleId &&
            r.Status == "Approved" &&
            r.StartTime < dto.EndTime &&
            r.EndTime > dto.StartTime);
        if (conflict)
            return BadRequest(new { message = "Vehicle is already booked during this time slot" });

        var r = new Reservation
        {
            BookerName = dto.BookerName.Trim(),
            BookerEmail = dto.BookerEmail,
            BookerPhone = dto.BookerPhone,
            Department = dto.Department,
            VehicleId = dto.VehicleId,
            StartTime = dto.StartTime, EndTime = dto.EndTime,
            Destination = dto.Destination, Passengers = dto.Passengers,
            DistanceKm = dto.DistanceKm,
            NeedTngCard = dto.NeedTngCard, NeedFuelCard = dto.NeedFuelCard,
            Notes = dto.Notes, Status = "Pending"
        };
        _db.Reservations.Add(r);
        await _db.SaveChangesAsync();
        await _db.Entry(r).Reference(x => x.Vehicle).LoadAsync();
        return Ok(Map(r));
    }

    // PUBLIC — get booked slots for a vehicle (so booker can see availability)
    [HttpGet("busy/{vehicleId}")]
    public async Task<IActionResult> Busy(int vehicleId)
    {
        var list = await _db.Reservations
            .Where(r => r.VehicleId == vehicleId && (r.Status == "Approved" || r.Status == "Pending"))
            .Where(r => r.EndTime > DateTime.UtcNow.AddDays(-1))
            .OrderBy(r => r.StartTime)
            .Select(r => new BusySlotDto(r.Id, r.VehicleId, r.StartTime, r.EndTime, r.Status, r.BookerName))
            .ToListAsync();
        return Ok(list);
    }

    // ADMIN — list all
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> List()
    {
        var list = await _db.Reservations.Include(r => r.Vehicle)
            .OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(list.Select(Map));
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Pending()
    {
        var list = await _db.Reservations.Include(r => r.Vehicle)
            .Where(r => r.Status == "Pending").OrderBy(r => r.StartTime).ToListAsync();
        return Ok(list.Select(Map));
    }

    // ADMIN — calendar feed (all approved + pending in date range)
    [HttpGet("calendar")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Calendar()
    {
        var from = DateTime.UtcNow.AddDays(-30);
        var to = DateTime.UtcNow.AddDays(90);
        var list = await _db.Reservations.Include(r => r.Vehicle)
            .Where(r => r.StartTime < to && r.EndTime > from)
            .Where(r => r.Status != "Rejected")
            .OrderBy(r => r.StartTime)
            .ToListAsync();
        return Ok(list.Select(Map));
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateStatusDto dto)
    {
        var r = await _db.Reservations.Include(x => x.Vehicle).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound();
        if (dto.Status is not ("Approved" or "Rejected" or "Pending"))
            return BadRequest(new { message = "Invalid status" });

        // Prevent approve if conflicts another approved
        if (dto.Status == "Approved")
        {
            var conflict = await _db.Reservations.AnyAsync(x =>
                x.Id != id && x.VehicleId == r.VehicleId && x.Status == "Approved" &&
                x.StartTime < r.EndTime && x.EndTime > r.StartTime);
            if (conflict)
                return BadRequest(new { message = "Cannot approve — time slot conflicts with another approved booking" });
        }

        r.Status = dto.Status;
        await _db.SaveChangesAsync();
        return Ok(Map(r));
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
