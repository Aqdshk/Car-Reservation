using CarBooking.Api.Data;
using CarBooking.Api.Dtos;
using CarBooking.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarBooking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehiclesController : ControllerBase
{
    private readonly AppDbContext _db;
    public VehiclesController(AppDbContext db) => _db = db;

    // PUBLIC — anyone can view available vehicles
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.Vehicles
            .Select(v => new VehicleDto(v.Id, v.PlateNumber, v.Make, v.Model, v.Type, v.Fuel, v.Seats, v.Status))
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(CreateVehicleDto dto)
    {
        var v = new Vehicle
        {
            PlateNumber = dto.PlateNumber, Make = dto.Make, Model = dto.Model,
            Type = dto.Type, Fuel = dto.Fuel, Seats = dto.Seats, Status = "Available"
        };
        _db.Vehicles.Add(v);
        await _db.SaveChangesAsync();
        return Ok(new VehicleDto(v.Id, v.PlateNumber, v.Make, v.Model, v.Type, v.Fuel, v.Seats, v.Status));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, CreateVehicleDto dto)
    {
        var v = await _db.Vehicles.FindAsync(id);
        if (v is null) return NotFound();
        v.PlateNumber = dto.PlateNumber; v.Make = dto.Make; v.Model = dto.Model;
        v.Type = dto.Type; v.Fuel = dto.Fuel; v.Seats = dto.Seats;
        await _db.SaveChangesAsync();
        return Ok(new VehicleDto(v.Id, v.PlateNumber, v.Make, v.Model, v.Type, v.Fuel, v.Seats, v.Status));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var v = await _db.Vehicles.FindAsync(id);
        if (v is null) return NotFound();
        _db.Vehicles.Remove(v);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
