using CarBooking.Api.Data;
using CarBooking.Api.Dtos;
using CarBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarBooking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    public AuthController(AppDbContext db, JwtService jwt) { _db = db; _jwt = jwt; }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email && u.Role == "Admin");
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials" });

        var token = _jwt.Generate(user);
        return Ok(new AuthResponse(token, user.Id, user.Name, user.Email, user.Role));
    }
}
