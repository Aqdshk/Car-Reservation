using System.Security.Claims;
using CarBooking.Api.Data;
using CarBooking.Api.Dtos;
using CarBooking.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarBooking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReservationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReservationsController(AppDbContext db) => _db = db;

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsAdmin => User.IsInRole("Admin");

    private static ReservationDto Map(Reservation r) => new(
        r.Id, r.UserId, r.User?.Name ?? "", r.VehicleId,
        r.Vehicle?.PlateNumber ?? "", $"{r.Vehicle?.Make} {r.Vehicle?.Model}".Trim(),
        r.StartTime, r.EndTime, r.Destination, r.Passengers, r.DistanceKm,
        r.Notes, r.Status, r.CreatedAt);

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var q = _db.Reservations.Include(r => r.User).Include(r => r.Vehicle).AsQueryable();
        if (!IsAdmin) q = q.Where(r => r.UserId == UserId);
        var list = await q.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(list.Select(Map));
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var list = await _db.Reservations.Include(r => r.Vehicle)
            .Where(r => r.UserId == UserId)
            .OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(list.Select(Map));
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Pending()
    {
        var list = await _db.Reservations.Include(r => r.User).Include(r => r.Vehicle)
            .Where(r => r.Status == "Pending").OrderBy(r => r.StartTime).ToListAsync();
        return Ok(list.Select(Map));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateReservationDto dto)
    {
        if (dto.EndTime <= dto.StartTime)
            return BadRequest(new { message = "End time must be after start time" });

        var r = new Reservation
        {
            UserId = UserId, VehicleId = dto.VehicleId,
            StartTime = dto.StartTime, EndTime = dto.EndTime,
            Destination = dto.Destination, Passengers = dto.Passengers,
            DistanceKm = dto.DistanceKm, Notes = dto.Notes, Status = "Pending"
        };
        _db.Reservations.Add(r);
        await _db.SaveChangesAsync();
        await _db.Entry(r).Reference(x => x.Vehicle).LoadAsync();
        await _db.Entry(r).Reference(x => x.User).LoadAsync();
        return Ok(Map(r));
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateStatusDto dto)
    {
        var r = await _db.Reservations.Include(x => x.User).Include(x => x.Vehicle)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound();
        if (dto.Status is not ("Approved" or "Rejected" or "Pending"))
            return BadRequest(new { message = "Invalid status" });
        r.Status = dto.Status;
        await _db.SaveChangesAsync();
        return Ok(Map(r));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var r = await _db.Reservations.FindAsync(id);
        if (r is null) return NotFound();
        if (!IsAdmin && r.UserId != UserId) return Forbid();
        _db.Reservations.Remove(r);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
