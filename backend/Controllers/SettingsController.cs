using CarBooking.Api.Data;
using CarBooking.Api.Dtos;
using CarBooking.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarBooking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    public SettingsController(AppDbContext db) => _db = db;

    private async Task<Settings> GetOrCreateSettings()
    {
        var s = await _db.Settings.FirstOrDefaultAsync();
        if (s is null)
        {
            s = new Settings();
            _db.Settings.Add(s);
            await _db.SaveChangesAsync();
        }
        return s;
    }

    // PUBLIC — current card status
    [HttpGet("cards")]
    public async Task<IActionResult> Cards()
    {
        var s = await GetOrCreateSettings();
        var inUseTng = await _db.Reservations.CountAsync(r =>
            r.Status == "Approved" && r.NeedTngCard && r.CheckedOutAt == null);
        var inUseFuel = await _db.Reservations.CountAsync(r =>
            r.Status == "Approved" && r.NeedFuelCard && r.CheckedOutAt == null);

        return Ok(new CardStatusDto(
            s.TotalTngCards, inUseTng, Math.Max(0, s.TotalTngCards - inUseTng),
            s.TotalFuelCards, inUseFuel, Math.Max(0, s.TotalFuelCards - inUseFuel)
        ));
    }

    // ADMIN — update card totals
    [HttpPut("cards")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateCards(UpdateCardSettingsDto dto)
    {
        if (dto.TotalTngCards < 0 || dto.TotalFuelCards < 0)
            return BadRequest(new { message = "Totals must be ≥ 0" });

        var s = await GetOrCreateSettings();
        s.TotalTngCards = dto.TotalTngCards;
        s.TotalFuelCards = dto.TotalFuelCards;
        await _db.SaveChangesAsync();
        return await Cards();
    }
}
