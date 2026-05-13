using System.Text;
using CarBooking.Api.Data;
using CarBooking.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var cfg = builder.Configuration;
var connStr = cfg.GetConnectionString("Default")!;

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr)));

builder.Services.AddSingleton<JwtService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = cfg["Jwt:Issuer"],
            ValidAudience = cfg["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173", "https://reservation.c-zero.my")
     .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-seed on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.EnsureCreated();
        if (!db.Users.Any())
        {
            db.Users.Add(
                new CarBooking.Api.Models.User { Name = "Admin", Email = "admin@c-zero.my", Role = "Admin", PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123") }
            );
        }
        if (!db.Vehicles.Any())
        {
            db.Vehicles.AddRange(
                new CarBooking.Api.Models.Vehicle { PlateNumber = "VKL 1234", Make = "Perodua", Model = "Bezza", Type = "Sedan", Fuel = "Petrol", Seats = 5 },
                new CarBooking.Api.Models.Vehicle { PlateNumber = "WXY 5678", Make = "Toyota", Model = "Hilux", Type = "Pickup", Fuel = "Diesel", Seats = 5 },
                new CarBooking.Api.Models.Vehicle { PlateNumber = "VAB 9012", Make = "Honda", Model = "City", Type = "Sedan", Fuel = "Petrol", Seats = 5 }
            );
        }
        db.SaveChanges();
    }
    catch (Exception ex) { Console.WriteLine($"Seed skipped: {ex.Message}"); }
}

app.Run();
